import locationContext from "@/data/location_context.json";
import taxiFareReference from "@/data/taxi_fare_reference.json";
import foodPriceReference from "@/data/food_price_reference.json";
import verifiedOperators from "@/data/verified_operators.demo.json";
import { extractEvidenceHints } from "@/lib/evidence-hints";
import type { GroundingSignal, RiskCheckRequest } from "@/lib/types";

// TODO: import TrustedOperatorSignal from "@/lib/types" once Agent B merges the new contract.
type TrustedOperatorSignalLocal = {
  operator_name: string;
  status: "verified" | "no_license" | "not_in_directory";
  tat_license?: string;
  operator_type?: "tour" | "rental" | "restaurant" | "transport" | "wellness";
  city?: string;
  notes?: string;
};

type VerifiedOperatorEntry = {
  name: string;
  operator_type?: string;
  city?: string;
  status: string;
  tat_license?: string | null;
  phone?: string;
  notes?: string;
};

type Zone = {
  id: string;
  city: string;
  name: string;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  context: string;
};

type EventContext = {
  id: string;
  name: string;
  keywords: string[];
  month: number;
  start_day: number;
  end_day: number;
  buffer_days: number;
  context: string;
};

type Place = {
  id: string;
  name: string;
  keywords: string[];
  lat: number;
  lng: number;
};

type Venue = {
  id: string;
  city: string;
  name: string;
  keywords: string[];
  lat: number;
  lng: number;
  radius_m: number;
  food_tier_id?: string;
  context: string;
  menu_price_band_baht: [number, number];
  verification_advice: string;
};

type FoodTier = {
  id: string;
  label: string;
  typical_item_baht: [number, number];
  typical_meal_baht: [number, number];
  notes: string;
};

type FoodSource = {
  title: string;
  url: string;
  summary: string;
};

type MenuItemReference = {
  id: string;
  label: string;
  category: string;
  keywords: string[];
  notes: string;
  typical_baht_by_tier: Record<string, number[]>;
};

type ParsedMenuItem = {
  item_name: string;
  listed_price_baht: number;
  detected_category: string;
  matched_reference_id: string | null;
  source_index?: number;
};

type RouteEstimate = {
  origin: Place;
  destination: Place;
  straightLineKm: number;
  estimatedRoadKm: number;
  source: "azure_maps" | "curated";
  travelTimeMinutes?: number;
};

type PricePosition = "within" | "above" | "far_above";

const zones = locationContext.zones as Zone[];
const events = locationContext.events as EventContext[];
const venues = locationContext.venues as Venue[];

const bangkokTaxiCitation = {
  title: "Thailand.go.th: Bangkok taxis increase fares",
  url: "https://www.thailand.go.th/issue-focus-detail/001_08_001"
};

export async function buildGroundingContext(request: RiskCheckRequest): Promise<GroundingSignal[]> {
  const routeEstimate = await estimateBangkokRoute(request);

  return [
    getLocationGrounding(request),
    getRouteDistanceGrounding(request, routeEstimate),
    getTaxiFareGrounding(request, routeEstimate),
    getVenueGrounding(request),
    getFoodPriceGrounding(request),
    getOperatorPaymentGrounding(request),
    getQrPaymentGrounding(request),
    getRentalDocumentGrounding(request),
    getDamageClaimGrounding(request),
    getJobLureGrounding(request),
    getEventGrounding(request),
    getWebGroundingStatus()
  ].filter((signal): signal is GroundingSignal => Boolean(signal));
}

function getFoodPriceGrounding(request: RiskCheckRequest): GroundingSignal | null {
  const combined = combineText(request);
  const text = `${request.message} ${request.extractedText ?? ""} ${request.evidenceText ?? ""}`;
  if (hasNonFoodRiskContext(combined)) {
    return null;
  }

  const hints = extractEvidenceHints(text);
  const prices = hints.prices
    .map(priceToNumber)
    .filter((value): value is number => typeof value === "number" && value >= 30)
    .sort((a, b) => a - b);

  if (!hasMenuContext(combined) || prices.length === 0 || request.city.toLowerCase() !== "bangkok") {
    return null;
  }

  const reference = foodPriceReference.bangkok;
  const tiers = reference.tiers as FoodTier[];
  const sources = reference.sources as FoodSource[];
  const itemReferences = reference.menu_items as MenuItemReference[];
  const venueMatch = getKnownVenueMatch(request);
  const likelyTier = chooseFoodTier(combined, tiers, venueMatch?.venue.food_tier_id);
  const menuItems = parseMenuItems(text, prices, itemReferences);
  const priceComparisons = buildPriceComparisons(menuItems, likelyTier, itemReferences, sources);
  const highestPrice = Math.max(...prices);
  const itemBand = likelyTier.typical_item_baht;
  const mealBand = likelyTier.typical_meal_baht;
  const pricePosition = getWorstPricePosition(priceComparisons.map((comparison) => comparison.result)) || getPricePosition(highestPrice, itemBand);
  const maxPriceRatioToReference =
    priceComparisons.length > 0
      ? Math.max(...priceComparisons.map((comparison) => comparison.price_ratio_to_reference))
      : getRatioToRangeMax(highestPrice, itemBand);
  const confidence = venueMatch ? "high" : inferFoodTierConfidence(combined);
  const dishNotes = getDishNotes(combined);
  const allTierSummary = tiers
    .map((tier) => `${tier.label}: ${tier.typical_item_baht[0]}-${tier.typical_item_baht[1]} THB/item`)
    .join("; ");
  const comparisonSummary = priceComparisons.length
    ? `Item comparisons: ${priceComparisons
        .map((item) => `${item.item_name} ${item.listed_price_baht} THB vs ${item.normal_range_baht[0]}-${item.normal_range_baht[1]} THB (${item.result})`)
        .join("; ")}. `
    : "";

  return {
    tool: "food_price_reference",
    title: `Food price tier: ${likelyTier.label}`,
    summary:
      `Detected menu prices: ${prices.join(", ")} THB. Highest detected price is ${highestPrice} THB, which is ${formatPricePosition(pricePosition)} the likely ${likelyTier.label} item band (${itemBand[0]}-${itemBand[1]} THB) and meal band (${mealBand[0]}-${mealBand[1]} THB). ` +
      comparisonSummary +
      `${likelyTier.notes} ${dishNotes ? `${dishNotes} ` : ""}` +
      `Reference tiers: ${allTierSummary}. Use venue/location confirmation before treating premium prices as fraud.`,
    confidence,
    citations: sources.slice(0, 5).map((source) => ({ title: source.title, url: source.url })),
    metadata: {
      detected_prices_baht: prices,
      highest_price_baht: highestPrice,
      likely_tier: likelyTier.id,
      likely_tier_label: likelyTier.label,
      normal_item_range_baht: itemBand,
      normal_meal_range_baht: mealBand,
      price_position: pricePosition,
      max_price_ratio_to_reference: maxPriceRatioToReference,
      menu_items: menuItems.map(toPublicMenuItem),
      price_comparisons: priceComparisons,
      dish_notes: dishNotes ? [dishNotes] : [],
      matched_known_venue: venueMatch?.venue.name ?? null,
      tier_confidence: confidence,
      grounding_source: "curated",
      reference_tiers: tiers.map((tier) => ({
        id: tier.id,
        label: tier.label,
        typical_item_baht: tier.typical_item_baht,
        typical_meal_baht: tier.typical_meal_baht
      }))
    }
  };
}

function parseMenuItems(text: string, prices: number[], references: MenuItemReference[]): ParsedMenuItem[] {
  const lower = text.toLowerCase();
  const priceMatches = Array.from(text.matchAll(/(?:฿\s*)?(\d{1,3}(?:,\d{3})+|\d{2,6})\s*(?:baht|thb|บาท|฿)?/gi))
    .map((match) => ({
      value: Number(match[0].replace(/[^\d]/g, "")),
      index: match.index ?? 0
    }))
    .filter((match) => prices.includes(match.value));

  const items: ParsedMenuItem[] = [];
  const usedPriceIndexes = new Set<number>();
  const usedKeywordRanges: Array<{ start: number; end: number }> = [];

  const prioritizedReferences = [...references].sort((a, b) => longestKeywordLength(b) - longestKeywordLength(a));

  for (const reference of prioritizedReferences) {
    const referenceLabel = reference.label.toLowerCase();
    if (items.some((item) => item.item_name.toLowerCase().includes(referenceLabel) && item.item_name.toLowerCase() !== referenceLabel)) {
      continue;
    }

    const keywordMatches = reference.keywords
      .map((keyword) => ({ keyword, index: lower.indexOf(keyword.toLowerCase()) }))
      .filter((match) => match.index >= 0)
      .sort((a, b) => a.index - b.index);

    for (const keywordMatch of keywordMatches) {
      const keywordRange = { start: keywordMatch.index, end: keywordMatch.index + keywordMatch.keyword.length };
      if (usedKeywordRanges.some((range) => rangesOverlap(range, keywordRange))) continue;

      const nearestPrice = priceMatches
        .map((price, priceIndex) => ({ ...price, priceIndex, distance: Math.abs(price.index - keywordMatch.index) }))
        .filter((price) => !usedPriceIndexes.has(price.priceIndex) && price.distance <= 90 && price.index >= keywordMatch.index)
        .sort((a, b) => a.distance - b.distance)[0];

      if (!nearestPrice) continue;

      usedPriceIndexes.add(nearestPrice.priceIndex);
      usedKeywordRanges.push(keywordRange);
      items.push({
        item_name: reference.label,
        listed_price_baht: nearestPrice.value,
        detected_category: reference.category,
        matched_reference_id: reference.id,
        source_index: keywordMatch.index
      });
      break;
    }
  }

  if (items.length > 0) return sortMenuItemsBySource(items).slice(0, 8);

  for (const priceMatch of priceMatches) {
    const priceIndex = priceMatches.indexOf(priceMatch);
    if (usedPriceIndexes.has(priceIndex)) continue;
    items.push({
      item_name: `Menu item ${items.length + 1}`,
      listed_price_baht: priceMatch.value,
      detected_category: "unknown",
      matched_reference_id: null,
      source_index: priceMatch.index
    });
  }

  return sortMenuItemsBySource(items).slice(0, 8);
}

function rangesOverlap(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end;
}

function sortMenuItemsBySource(items: ParsedMenuItem[]) {
  return [...items].sort((a, b) => (a.source_index ?? Number.MAX_SAFE_INTEGER) - (b.source_index ?? Number.MAX_SAFE_INTEGER));
}

function toPublicMenuItem(item: ParsedMenuItem) {
  return {
    item_name: item.item_name,
    listed_price_baht: item.listed_price_baht,
    detected_category: item.detected_category,
    matched_reference_id: item.matched_reference_id
  };
}

function longestKeywordLength(reference: MenuItemReference) {
  return Math.max(...reference.keywords.map((keyword) => keyword.length));
}

function buildPriceComparisons(
  items: ParsedMenuItem[],
  tier: FoodTier,
  references: MenuItemReference[],
  sources: FoodSource[]
) {
  return items.map((item) => {
    const reference = item.matched_reference_id
      ? references.find((candidate) => candidate.id === item.matched_reference_id)
      : null;
    const itemRange = reference?.typical_baht_by_tier[tier.id];
    const range: [number, number] = itemRange?.length === 2 ? [itemRange[0], itemRange[1]] : tier.typical_item_baht;
    const result = getPricePosition(item.listed_price_baht, range);
    const priceRatioToReference = getRatioToRangeMax(item.listed_price_baht, range);

    return {
      item_name: item.item_name,
      listed_price_baht: item.listed_price_baht,
      detected_category: item.detected_category,
      normal_range_baht: range,
      tier_id: tier.id,
      tier_label: tier.label,
      result,
      price_ratio_to_reference: priceRatioToReference,
      confidence: reference ? "medium" : "low",
      explanation:
        result === "within"
          ? `${item.item_name} is within the curated ${tier.label} range.`
          : `${item.item_name} is about ${priceRatioToReference}x the upper end of the curated ${tier.label} range; verify venue, menu display, and receipt before treating it as suspicious.`,
      notes: reference?.notes ?? "No item-specific match; using the tier-level Bangkok food reference.",
      citations: sources.slice(0, 3).map((source) => ({ title: source.title, url: source.url }))
    };
  });
}

function getWorstPricePosition(positions: PricePosition[]) {
  if (positions.includes("far_above")) return "far_above";
  if (positions.includes("above")) return "above";
  if (positions.includes("within")) return "within";
  return null;
}

function chooseFoodTier(text: string, tiers: FoodTier[], venueTierId?: string) {
  if (venueTierId) return tiers.find((tier) => tier.id === venueTierId) || tiers[1];
  if (/jay fai|michelin|premium|famous venue|destination venue|special crab|signature crab/i.test(text)) {
    return tiers.find((tier) => tier.id === "premium_famous_venue") || tiers[tiers.length - 1];
  }
  if (/paragon|emporium|emquartier|centralworld|gaysorn|central embassy|department store|higher-end|high end|sit-down|fine dining|food hall/i.test(text)) {
    return tiers.find((tier) => tier.id === "department_store_restaurant") || tiers[3];
  }
  if (/food court|terminal 21|pier 21|mbk|mall/i.test(text)) {
    return tiers.find((tier) => tier.id === "mall_food_court") || tiers[2];
  }
  if (/street food|stall|market|local/i.test(text)) {
    return tiers.find((tier) => tier.id === "street_food_local_stall") || tiers[0];
  }
  return tiers.find((tier) => tier.id === "local_casual_restaurant") || tiers[1];
}

function inferFoodTierConfidence(text: string): GroundingSignal["confidence"] {
  return /jay fai|michelin|premium|paragon|emporium|emquartier|centralworld|gaysorn|central embassy|food court|terminal 21|pier 21|mbk|street food|stall|market|local|department store|food hall|fine dining/i.test(text)
    ? "medium"
    : "low";
}

function getDishNotes(text: string) {
  const dishHints = foodPriceReference.bangkok.dish_hints as Array<{ keywords: string[]; price_multiplier_note: string }>;
  return dishHints
    .filter((hint) => hint.keywords.some((keyword) => text.includes(keyword.toLowerCase())))
    .map((hint) => hint.price_multiplier_note)
    .join(" ");
}

function priceToNumber(value: string) {
  const number = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function extractBahtAmounts(text: string) {
  return Array.from(text.matchAll(/(?:฿\s*)?(\d{1,3}(?:,\d{3})+|\d{2,6})\s*(?:thb|baht|บาท|฿)/gi))
    .map((match) => Number(match[1].replace(/[^\d]/g, "")))
    .filter((amount) => Number.isFinite(amount));
}

function getPricePosition(highestPrice: number, itemBand: [number, number]): PricePosition {
  if (highestPrice <= itemBand[1] * 1.3) return "within";
  if (highestPrice <= itemBand[1] * 1.6) return "above";
  return "far_above";
}

function getRatioToRangeMax(value: number, range: [number, number]) {
  if (!range[1]) return 0;
  return Number((value / range[1]).toFixed(1));
}

function formatPricePosition(position: PricePosition) {
  if (position === "far_above") return "far above";
  return position;
}

export function getKnownVenueMatch(request: RiskCheckRequest) {
  const combined = combineText(request);
  const cityVenues = venues.filter((venue) => venue.city.toLowerCase() === request.city.toLowerCase());
  const textVenue = cityVenues.find((venue) => venue.keywords.some((keyword) => combined.includes(keyword.toLowerCase())));
  const rejectedVenue = getRejectedVenueName(request);
  const nearbyVenue = request.userLocation
    ? cityVenues.find((venue) => distanceMeters(request.userLocation!.latitude, request.userLocation!.longitude, venue.lat, venue.lng) <= venue.radius_m)
    : null;
  const usableNearbyVenue = nearbyVenue && !isRejectedVenue(nearbyVenue, rejectedVenue) ? nearbyVenue : null;

  if (!textVenue && !usableNearbyVenue) return null;

  return {
    venue: textVenue || usableNearbyVenue!,
    matchedByText: Boolean(textVenue),
    matchedByLocation: Boolean(usableNearbyVenue),
    distanceMeters: usableNearbyVenue && request.userLocation ? Math.round(distanceMeters(request.userLocation.latitude, request.userLocation.longitude, usableNearbyVenue.lat, usableNearbyVenue.lng)) : null
  };
}

function getRejectedVenueName(request: RiskCheckRequest) {
  const answer = request.clarificationAnswers?.venue_confirmation?.toLowerCase().trim();
  if (!answer || !/^no\b|another restaurant|not sure/.test(answer)) return null;
  const cityVenues = venues.filter((venue) => venue.city.toLowerCase() === request.city.toLowerCase());
  return cityVenues.find((venue) => venue.keywords.some((keyword) => answer.includes(keyword.toLowerCase())))?.name ?? "nearby venue";
}

function isRejectedVenue(venue: Venue, rejectedVenueName: string | null) {
  if (!rejectedVenueName) return false;
  if (rejectedVenueName === "nearby venue") return true;
  return venue.name.toLowerCase() === rejectedVenueName.toLowerCase();
}

function getLocationGrounding(request: RiskCheckRequest): GroundingSignal | null {
  const location = request.userLocation;
  const cityZones = zones.filter((zone) => zone.city.toLowerCase() === request.city.toLowerCase());

  if (!location) {
    const cityContext = cityZones[0]?.context;
    return {
      tool: "location",
      title: `${request.city} context`,
      summary: cityContext
        ? `Using selected city context. ${cityContext}`
        : `Using selected city context for ${request.city}. Browser location was not shared.`,
      confidence: "medium"
    };
  }

  const matchedZone = cityZones.find((zone) => {
    return (
      location.latitude >= zone.bounds.minLat &&
      location.latitude <= zone.bounds.maxLat &&
      location.longitude >= zone.bounds.minLng &&
      location.longitude <= zone.bounds.maxLng
    );
  });

  if (!matchedZone) {
    return {
      tool: "location",
      title: "Live location received",
      summary: `Browser location was included with about ${Math.round(location.accuracy ?? 0)}m accuracy, but it did not match a demo zone. Use the selected city and the user's described situation as the main context.`,
      confidence: "medium"
    };
  }

  return {
    tool: "location",
    title: `Live location: ${matchedZone.name}`,
    summary: `${matchedZone.context} Browser location accuracy is about ${Math.round(location.accuracy ?? 0)}m.`,
    confidence: location.accuracy && location.accuracy <= 250 ? "high" : "medium"
  };
}

function getTaxiFareGrounding(request: RiskCheckRequest, routeEstimate: RouteEstimate | null): GroundingSignal | null {
  const combined = combineText(request);
  if (!combined.includes("taxi")) return null;

  const quotedFareBaht = extractBahtAmounts(combined)[0] ?? null;
  const bangkokReference = taxiFareReference.bangkok;
  const matchedRoute = bangkokReference.known_city_routes.find((route) => {
    const hasOrigin = route.origin_keywords.some((keyword) => combined.includes(keyword));
    const hasDestination = route.destination_keywords.some((keyword) => combined.includes(keyword));
    return hasOrigin && hasDestination;
  });

  const suspiciousFareSignals = [
    "meter broken",
    "meter is broken",
    "meter not working",
    "no meter",
    "refuse meter",
    "pay upfront",
    "pay now",
    "hidden fee",
    "extra charge",
    "change destination",
    "different route",
    "threat",
    "forced"
  ].filter((signal) => combined.includes(signal));

  if (matchedRoute) {
    const typicalRange = matchedRoute.typical_meter_fare_baht as [number, number];
    const isPlausibleOrCheap = quotedFareBaht !== null && quotedFareBaht <= typicalRange[1];
    const fareRatioToBaseline = quotedFareBaht !== null ? getRatioToRangeMax(quotedFareBaht, typicalRange) : null;
    return {
      tool: "fare_reference",
      title: "Bangkok taxi fare reference",
      summary:
        isPlausibleOrCheap && suspiciousFareSignals.length === 0
          ? `${quotedFareBaht} THB is plausible or cheap for this short central Bangkok route. ${matchedRoute.interpretation}`
          : `Compare the quote against the ${typicalRange[0]}-${typicalRange[1]} THB demo baseline for this route and the official Bangkok meter rule. Suspicious fare signals found: ${suspiciousFareSignals.length ? suspiciousFareSignals.join(", ") : "none"}.`,
      confidence: "high",
      citations: [bangkokTaxiCitation],
      metadata: {
        quoted_fare_baht: quotedFareBaht,
        baseline_range_baht: typicalRange,
        taxi_meter_estimate_baht: typicalRange,
        route_distance_range_km: matchedRoute.approx_distance_km,
        route_distance_km: averageRange(matchedRoute.approx_distance_km as [number, number]),
        fare_position: getFarePosition(quotedFareBaht, typicalRange),
        fare_ratio_to_baseline: fareRatioToBaseline,
        fare_severity: getFareSeverity(fareRatioToBaseline),
        suspicious_fare_signals: suspiciousFareSignals,
        grounding_source: "curated"
      }
    };
  }

  if (routeEstimate) {
    const meter = bangkokReference.official_meter_rule;
    const estimateBaht = estimateMeterFare(routeEstimate.estimatedRoadKm, meter.first_km_baht, meter.km_1_to_10_baht_per_km);
    const estimateRange: [number, number] = [estimateBaht.low, estimateBaht.high];
    const fareRatioToBaseline = quotedFareBaht !== null ? getRatioToRangeMax(quotedFareBaht, estimateRange) : null;
    return {
      tool: "fare_reference",
      title: "Bangkok taxi fare estimate",
      summary: `Estimated route: ${routeEstimate.origin.name} to ${routeEstimate.destination.name}, about ${routeEstimate.estimatedRoadKm.toFixed(1)} km by road approximation. Baseline meter fare without heavy waiting time is about ${estimateBaht.low}-${estimateBaht.high} THB. Quoted fare: ${quotedFareBaht ?? "not provided"} THB. Escalate only if the quote is high for this baseline or suspicious signals are present.`,
      confidence: "medium",
      citations: [bangkokTaxiCitation],
      metadata: {
        quoted_fare_baht: quotedFareBaht,
        baseline_range_baht: estimateRange,
        taxi_meter_estimate_baht: estimateRange,
        route_distance_km: routeEstimate.estimatedRoadKm,
        route_origin: routeEstimate.origin.name,
        route_destination: routeEstimate.destination.name,
        route_travel_time_minutes: routeEstimate.travelTimeMinutes ?? null,
        grounding_source: routeEstimate.source,
        fare_position: getFarePosition(quotedFareBaht, estimateRange),
        fare_ratio_to_baseline: fareRatioToBaseline,
        fare_severity: getFareSeverity(fareRatioToBaseline),
        suspicious_fare_signals: suspiciousFareSignals
      }
    };
  }

  return {
    tool: "fare_reference",
    title: "Bangkok taxi meter rule",
    summary: `Official Bangkok taxi grounding: first kilometer is ${bangkokReference.official_meter_rule.first_km_baht} THB, then ${bangkokReference.official_meter_rule.km_1_to_10_baht_per_km} THB/km from 1-10 km, plus waiting charges in heavy traffic. Escalate only when the fare is high for the route or concrete suspicious signals exist.`,
    confidence: "high",
    citations: [bangkokTaxiCitation],
    metadata: {
      quoted_fare_baht: quotedFareBaht,
      suspicious_fare_signals: suspiciousFareSignals,
      grounding_source: "fallback"
    }
  };
}

function getFarePosition(quotedFareBaht: number | null, baselineRange: [number, number]) {
  if (quotedFareBaht === null) return "unknown";
  const ratio = getRatioToRangeMax(quotedFareBaht, baselineRange);
  if (ratio <= 1.3) return "within_or_below";
  if (ratio <= 2) return "above";
  return "far_above";
}

function getFareSeverity(ratio: number | null) {
  if (ratio === null) return "unknown";
  if (ratio <= 1.3) return "normal";
  if (ratio <= 2) return "elevated";
  if (ratio <= 3) return "high";
  return "extreme";
}

function getOperatorPaymentGrounding(request: RiskCheckRequest): GroundingSignal | null {
  const combined = combineText(request);
  const hasTourContext = hasAny(combined, [
    "tour",
    "operator",
    "booking",
    "tour agent",
    "line tour",
    "line seller",
    "line agent",
    "island package",
    "travel package",
    "package",
    "trip"
  ]);
  const hasPaymentConcern = hasAny(combined, ["full payment", "advance payment", "deposit now", "transfer", "bank account", "personal account", "license"]);
  if (!hasTourContext || !hasPaymentConcern) {
    return null;
  }

  const signals = [
    signalIf("Full advance payment requested", combined, ["full payment", "deposit now", "pay now", "prepay", "advance payment"]),
    signalIf("Payment account appears personal", combined, ["personal account", "personal bank", "individual account", "bank transfer"]),
    signalIf("Missing operator or TAT license details", combined, ["no license", "missing license", "will not show a license", "no tat", "license not shown"]),
    signalIf("Informal LINE-only sales channel", combined, ["line only", "line tour", "line seller", "line agent"]),
    signalIf("Time pressure or limited-time payment push", combined, ["limited time", "today only", "urgent", "must pay today"])
  ].filter((signal): signal is string => Boolean(signal));

  if (signals.length === 0) return null;

  return {
    tool: "operator_payment_reference",
    title: "Tour/operator payment grounding",
    summary: `${signals.join("; ")}. For tourist bookings, the safer path is to verify operator identity, TAT license details, written cancellation terms, and receipt before paying.`,
    confidence: signals.length >= 3 ? "high" : "medium",
    metadata: {
      interpreted_signals: signals,
      has_full_advance_payment: signals.includes("Full advance payment requested"),
      has_personal_account: signals.includes("Payment account appears personal"),
      has_missing_license: signals.includes("Missing operator or TAT license details"),
      grounding_source: "curated"
    }
  };
}

function getQrPaymentGrounding(request: RiskCheckRequest): GroundingSignal | null {
  const combined = combineText(request);
  const hasQrContext = hasAny(combined, ["qr", "scan to pay", "qr payment", "payment account", "ชื่อบัญชี"]);
  const hasExplicitAccountMismatch = hasAny(combined, ["account name is a different", "does not match", "different personal name", "name mismatch", "account mismatch"]);
  if (!hasQrContext && !hasExplicitAccountMismatch) return null;

  const signals = [
    signalIf("Payment account appears personal or mismatched", combined, ["different name", "personal name", "personal account", "account name is a different", "does not match"]),
    signalIf("QR payment requested before identity is verified", combined, ["scan to pay", "pay now", "qr payment"]),
    signalIf("Business identity is missing or unclear", combined, ["business name is not shown", "no business name", "not shown", "missing business"])
  ].filter((signal): signal is string => Boolean(signal));

  if (signals.length === 0) return null;

  return {
    tool: "qr_payment_reference",
    title: "QR/payment identity grounding",
    summary: `${signals.join("; ")}. Account-name mismatch increases refund and dispute risk, especially before a receipt or business identity is confirmed.`,
    confidence: signals.some((signal) => signal.includes("mismatched")) ? "high" : "medium",
    metadata: {
      interpreted_signals: signals,
      has_account_mismatch: signals.includes("Payment account appears personal or mismatched"),
      grounding_source: "curated"
    }
  };
}

function getRentalDocumentGrounding(request: RiskCheckRequest): GroundingSignal | null {
  const combined = combineText(request);
  if (!hasAny(combined, ["rental", "rent", "motorbike", "scooter", "jet ski", "vehicle", "bike"]) || !hasAny(combined, ["passport", "deposit", "contract"])) {
    return null;
  }

  const signals = [
    signalIf("Original passport requested as deposit", combined, ["keep my original passport", "keep passport", "hold passport", "original passport", "leave your passport", "passport deposit"]),
    signalIf("Deposit or contract terms need written confirmation", combined, ["deposit", "contract", "terms", "policy"]),
    signalIf("Vehicle rental context creates document leverage risk", combined, ["motorbike", "scooter", "jet ski", "vehicle", "bike"])
  ].filter((signal): signal is string => Boolean(signal));

  if (signals.length === 0) return null;

  return {
    tool: "rental_document_reference",
    title: "Rental/passport document grounding",
    summary: `${signals.join("; ")}. A safer alternative is a passport copy plus cash/card deposit, written terms, receipt, and pre-use vehicle photos.`,
    confidence: signals.includes("Original passport requested as deposit") ? "high" : "medium",
    metadata: {
      interpreted_signals: signals,
      has_original_passport_request: signals.includes("Original passport requested as deposit"),
      grounding_source: "curated"
    }
  };
}

function getDamageClaimGrounding(request: RiskCheckRequest): GroundingSignal | null {
  const combined = combineText(request);
  const hasDamageContext = hasAny(combined, ["scratch", "damage", "claim", "repair", "jet ski", "motorbike"]);
  const damageAmountBaht = extractBahtAmounts(combined).sort((a, b) => b - a)[0] ?? null;
  const damageAmountSeverity = getDamageAmountSeverity(damageAmountBaht);
  const hasPressureContext =
    damageAmountBaht !== null ||
    hasAny(combined, ["cash now", "pay cash now", "pay now", "no receipt", "police", "insurer", "20,000", "20000", "written estimate", "invoice"]);
  if (!hasDamageContext || !hasPressureContext) {
    return null;
  }

  const signals = [
    damageAmountSeverity === "large" || damageAmountSeverity === "extreme"
      ? "Large cash damage demand without neutral inspection"
      : null,
    signalIf("Immediate cash payment requested", combined, ["pay cash now", "cash now", "pay now"]),
    signalIf("No receipt or written damage estimate offered", combined, ["no receipt", "without receipt", "no written", "no invoice"]),
    signalIf("Pressure to avoid police, insurer, or neutral process", combined, ["no police", "no insurer", "do not call police", "without police"]),
    signalIf("Rental damage claim under pressure", combined, ["scratch", "damage", "claim"])
  ].filter((signal): signal is string => Boolean(signal));

  if (signals.length === 0) return null;

  return {
    tool: "damage_claim_reference",
    title: "Rental damage pressure grounding",
    summary: `${signals.join("; ")}. Damage disputes should be documented with photos, written estimates, receipts, and neutral help instead of immediate cash pressure.`,
    confidence: signals.length >= 3 ? "high" : "medium",
    metadata: {
      interpreted_signals: signals,
      has_large_cash_demand: signals.includes("Large cash damage demand without neutral inspection"),
      has_immediate_cash_payment: signals.includes("Immediate cash payment requested"),
      has_no_receipt: signals.includes("No receipt or written damage estimate offered"),
      damage_amount_baht: damageAmountBaht,
      damage_amount_severity: damageAmountSeverity,
      amount_ratio_to_minor_damage_reference: damageAmountBaht ? getDamageAmountRatio(damageAmountBaht) : null,
      damage_amount_reference_note: "Demo heuristic: minor documented rental damage is treated as a lower concern below about 3,000 THB; undocumented immediate demands above 10,000 THB are treated as large.",
      grounding_source: "curated"
    }
  };
}

function getDamageAmountSeverity(amountBaht: number | null) {
  if (amountBaht === null) return "unknown";
  if (amountBaht < 3000) return "modest";
  if (amountBaht < 10000) return "elevated";
  if (amountBaht < 50000) return "large";
  return "extreme";
}

function getDamageAmountRatio(amountBaht: number) {
  return Number((amountBaht / 3000).toFixed(1));
}

function getJobLureGrounding(request: RiskCheckRequest): GroundingSignal | null {
  const combined = combineText(request);
  if (!hasAny(combined, ["casting", "modeling", "modelling", "photoshoot", "job offer", "recruiter", "wechat"]) && !hasAny(combined, ["mae sot", "border", "myanmar"])) {
    return null;
  }

  const signals = [
    signalIf("Job or casting offer from informal channel", combined, ["casting", "modeling", "modelling", "paid photoshoot", "job offer", "recruiter", "wechat"]),
    signalIf("Controlled pickup or free transport offered", combined, ["airport pickup", "free transport", "driver will pick", "driver said", "pickup"]),
    signalIf("Travel toward Mae Sot, Myanmar, or border area", combined, ["mae sot", "myanmar", "border", "poipet"]),
    signalIf("Secrecy or isolation instruction", combined, ["do not tell", "don't tell", "keep secret", "not to tell my hotel", "change hotel"])
  ].filter((signal): signal is string => Boolean(signal));

  if (signals.length === 0) return null;

  return {
    tool: "job_lure_reference",
    title: "Fake job/casting lure grounding",
    summary: `${signals.join("; ")}. The combination of recruitment, pickup/control, secrecy, and border travel is treated as a critical safety pattern.`,
    confidence: signals.length >= 3 ? "high" : "medium",
    metadata: {
      interpreted_signals: signals,
      has_controlled_pickup: signals.includes("Controlled pickup or free transport offered"),
      has_border_travel: signals.includes("Travel toward Mae Sot, Myanmar, or border area"),
      has_secrecy_instruction: signals.includes("Secrecy or isolation instruction"),
      grounding_source: "curated"
    }
  };
}

function getVenueGrounding(request: RiskCheckRequest): GroundingSignal | null {
  const combined = combineText(request);
  if (hasNonFoodRiskContext(combined)) {
    return null;
  }

  const match = getKnownVenueMatch(request);
  const mentionsMenu = hasMenuContext(combined) && hasPriceMention(combined);

  if (!match && mentionsMenu) {
    return {
      tool: "venue_reference",
      title: "Menu venue unknown",
      summary: "The evidence appears to contain menu or food pricing, but no known venue was matched from GPS or text. Ask for venue/location confirmation before treating high prices as suspicious.",
      confidence: "low"
    };
  }

  if (!match) return null;

  const { venue, matchedByText, matchedByLocation, distanceMeters } = match;
  return {
    tool: "venue_reference",
    title: matchedByLocation ? `Nearby venue: ${venue.name}` : `Venue mentioned: ${venue.name}`,
    summary: `${venue.context} Expected premium menu band is roughly ${venue.menu_price_band_baht[0]}-${venue.menu_price_band_baht[1]} THB. ${venue.verification_advice}${matchedByLocation && distanceMeters !== null ? ` GPS is about ${distanceMeters}m from the venue.` : ""}${matchedByText ? " The venue name appears in the user/evidence text." : ""}`,
    confidence: matchedByLocation || matchedByText ? "high" : "medium"
  };
}

function getRouteDistanceGrounding(request: RiskCheckRequest, routeEstimate: RouteEstimate | null): GroundingSignal | null {
  const combined = combineText(request);
  if (!combined.includes("taxi")) return null;

  if (!routeEstimate) return null;

  return {
    tool: "route_distance",
    title: `${routeEstimate.origin.name} to ${routeEstimate.destination.name}`,
    summary:
      routeEstimate.source === "azure_maps"
        ? `Azure Maps route distance is ${routeEstimate.estimatedRoadKm.toFixed(1)} km${routeEstimate.travelTimeMinutes ? ` with estimated travel time around ${routeEstimate.travelTimeMinutes} minutes` : ""}.`
        : `Approximate straight-line distance is ${routeEstimate.straightLineKm.toFixed(1)} km. Road-adjusted demo estimate is ${routeEstimate.estimatedRoadKm.toFixed(1)} km. This is a grounding estimate, not live navigation.`,
    confidence: routeEstimate.source === "azure_maps" ? "high" : "medium",
    citations:
      routeEstimate.source === "azure_maps"
        ? [{ title: "Microsoft Learn: Azure Maps Get Route Directions", url: "https://learn.microsoft.com/en-us/rest/api/maps/route/get-route-directions" }]
        : undefined,
    metadata: {
      route_origin: routeEstimate.origin.name,
      route_destination: routeEstimate.destination.name,
      straight_line_distance_km: routeEstimate.straightLineKm,
      route_distance_km: routeEstimate.estimatedRoadKm,
      route_travel_time_minutes: routeEstimate.travelTimeMinutes ?? null,
      grounding_source: routeEstimate.source
    }
  };
}

function getEventGrounding(request: RiskCheckRequest): GroundingSignal | null {
  const combined = combineText(request);
  const matchedEvent = events.find((event) => event.keywords.some((keyword) => combined.includes(keyword.toLowerCase())));
  if (!matchedEvent) return null;
  const date = parseIncidentDate(request.incidentDateIso);
  const dateStatus = date ? getEventDateStatus(date, matchedEvent) : "unknown";
  const dateLabel = date ? formatBangkokDate(date) : "unknown date";

  if (dateStatus === "outside") {
    return {
      tool: "event_context",
      title: `${matchedEvent.name} date check`,
      summary: `The user mentioned ${matchedEvent.name}, but the situation date is ${dateLabel}, outside the normal ${matchedEvent.name} period. Do not assume holiday traffic unless the user explains a special local event or road closure.`,
      confidence: "high"
    };
  }

  return {
    tool: "event_context",
    title: matchedEvent.name,
    summary:
      dateStatus === "active"
        ? `${matchedEvent.context} Situation date ${dateLabel} falls inside or near the ${matchedEvent.name} period.`
        : `${matchedEvent.context} The user mentioned ${matchedEvent.name}, but the exact date relationship is uncertain.`,
    confidence: dateStatus === "active" ? "high" : "medium"
  };
}

function getWebGroundingStatus(): GroundingSignal {
  return {
    tool: "web_grounding",
    title: "Live web grounding",
    summary:
      process.env.AZURE_BING_GROUNDING_ENABLED === "true"
        ? "Configured for Azure AI Foundry Grounding with Bing Search."
        : "Not enabled in this local demo. Current response uses local grounding tools plus Azure OpenAI reasoning. Live web grounding can be added with Azure AI Foundry Agents and Grounding with Bing Search.",
    confidence: "low",
    citations: [
      {
        title: "Microsoft Learn: Grounding with Bing Search",
        url: "https://learn.microsoft.com/en-us/azure/ai-foundry/agents/how-to/tools/bing-tools"
      }
    ]
  };
}

function combineText(request: RiskCheckRequest) {
  const clarificationText = Object.values(request.clarificationAnswers || {}).join(" ");
  return `${request.message} ${request.extractedText ?? ""} ${request.evidenceText ?? ""} ${clarificationText} ${request.city}`.toLowerCase();
}

async function estimateBangkokRoute(request: RiskCheckRequest): Promise<RouteEstimate | null> {
  if (request.city.toLowerCase() !== "bangkok") return null;

  const combined = combineText(request);
  const places = taxiFareReference.bangkok.places as Place[];
  const matchedPlaces = places.filter((place) => place.keywords.some((keyword) => combined.includes(keyword.toLowerCase())));
  if (matchedPlaces.length < 2) return null;

  const [origin, destination] = matchedPlaces;
  const straightLineKm = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
  const azureRoute = await getAzureMapsRoute(origin, destination, straightLineKm);
  if (azureRoute) return azureRoute;

  return {
    origin,
    destination,
    straightLineKm,
    estimatedRoadKm: straightLineKm * 1.35,
    source: "curated"
  };
}

async function getAzureMapsRoute(origin: Place, destination: Place, straightLineKm: number): Promise<RouteEstimate | null> {
  const key = process.env.AZURE_MAPS_KEY;
  if (!key) return null;

  const timeoutMs = Number(process.env.AZURE_MAPS_TIMEOUT_MS || 5000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL("https://atlas.microsoft.com/route/directions/json");
    url.searchParams.set("api-version", "1.0");
    url.searchParams.set("query", `${origin.lat},${origin.lng}:${destination.lat},${destination.lng}`);
    url.searchParams.set("travelMode", "taxi");
    url.searchParams.set("subscription-key", key);

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json();
    const summary = data?.routes?.[0]?.summary;
    const meters = typeof summary?.lengthInMeters === "number" ? summary.lengthInMeters : null;
    if (!meters) return null;

    return {
      origin,
      destination,
      straightLineKm,
      estimatedRoadKm: meters / 1000,
      travelTimeMinutes:
        typeof summary.travelTimeInSeconds === "number" ? Math.round(summary.travelTimeInSeconds / 60) : undefined,
      source: "azure_maps"
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  return haversineKm(lat1, lng1, lat2, lng2) * 1000;
}

function hasMenuContext(text: string) {
  const dishOrMenuSignal = /menu|เมนู|food|dish|crab|omelette|noodle|rice|pad thai|ผัด|อาหาร/i.test(text);
  const restaurantMenuSignal = /(restaurant|ร้าน)[\s\S]{0,80}(menu|เมนู)|(menu|เมนู)[\s\S]{0,80}(restaurant|ร้าน)/i.test(text);
  return dishOrMenuSignal || restaurantMenuSignal;
}

function hasNonFoodRiskContext(text: string) {
  const tourPayment =
    hasAny(text, ["tour", "island package", "booking", "operator", "license number", "full payment", "personal account", "bank transfer"]) &&
    hasAny(text, ["full payment", "personal account", "bank transfer", "no license", "license number", "limited time", "transfer"]);
  const qrOrPayment =
    hasAny(text, ["qr", "scan to pay", "account name", "payment account", "personal name", "personal account", "bank transfer", "transfer slip"]) &&
    hasAny(text, ["account", "payment", "pay", "transfer", "scan"]);
  const rentalDocument = hasAny(text, ["rental", "rent", "motorbike", "scooter", "jet ski", "vehicle"]) && hasAny(text, ["passport", "deposit", "damage", "scratch"]);
  const jobLure = hasAny(text, ["casting", "modeling", "modelling", "photoshoot", "job offer", "recruiter", "wechat", "mae sot", "myanmar", "border"]);
  const transport = hasAny(text, ["taxi", "tuk-tuk", "tuktuk", "meter broken", "temple is closed", "gem shop"]);
  return tourPayment || qrOrPayment || rentalDocument || jobLure || transport;
}

function hasPriceMention(text: string) {
  return /(?:฿\s*)?(?:\d{1,3}(?:,\d{3})+|\d{2,6})\s*(?:baht|thb|บาท|฿)/i.test(text);
}

function hasAny(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase));
}

function signalIf(label: string, text: string, phrases: string[]) {
  return hasAny(text, phrases) ? label : null;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function estimateMeterFare(distanceKm: number, firstKmBaht: number, nextKmBaht: number) {
  const base = firstKmBaht + Math.max(distanceKm - 1, 0) * nextKmBaht;
  return {
    low: Math.round(base),
    high: Math.round(base + 40)
  };
}

function averageRange(range: [number, number]) {
  return Number(((range[0] + range[1]) / 2).toFixed(1));
}

function parseIncidentDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEventDateStatus(date: Date, event: EventContext) {
  const bangkokDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const month = bangkokDate.getMonth() + 1;
  const day = bangkokDate.getDate();

  if (month !== event.month) return "outside";

  const start = event.start_day - event.buffer_days;
  const end = event.end_day + event.buffer_days;
  return day >= start && day <= end ? "active" : "outside";
}

function formatBangkokDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

const operatorEntries = verifiedOperators as VerifiedOperatorEntry[];

const stopwords = new Set([
  "the",
  "and",
  "tour",
  "tours",
  "co",
  "ltd",
  "company",
  "shop",
  "restaurant",
  "cafe",
  "service",
  "services",
  "thailand",
  "thai",
]);

function normalizeOperatorStatus(value: string | undefined): TrustedOperatorSignalLocal["status"] {
  const candidate = (value || "").toLowerCase();
  if (candidate === "verified" || candidate === "demo_verified") return "verified";
  if (candidate === "no_license" || candidate === "unverified") return "no_license";
  return "not_in_directory";
}

function isOperatorType(value: unknown): value is TrustedOperatorSignalLocal["operator_type"] {
  return value === "tour" || value === "rental" || value === "restaurant" || value === "transport" || value === "wellness";
}

function tokenizeOperatorName(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u0e00-\u0e7f\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stopwords.has(token));
}

function operatorEntryToSignal(entry: VerifiedOperatorEntry): TrustedOperatorSignalLocal {
  return {
    operator_name: entry.name,
    status: normalizeOperatorStatus(entry.status),
    tat_license: entry.tat_license || undefined,
    operator_type: isOperatorType(entry.operator_type) ? entry.operator_type : undefined,
    city: entry.city,
    notes: entry.notes,
  };
}

/**
 * Look up an operator by name (and optional city) against the demo verified-operator directory.
 * Returns the structured trusted-operator signal. When no entry matches, returns a `not_in_directory`
 * placeholder so the UI can still render the "we don't know this place" guidance card.
 *
 * Matching is best-effort: case-insensitive substring first, then token overlap with a small
 * stopword list. City is used as a soft preference, never a hard filter.
 *
 * TODO: replace `TrustedOperatorSignalLocal` with `TrustedOperatorSignal` from `@/lib/types`
 * once Agent B merges the shared types module.
 */
export function lookupOperator(operatorName: string | null, city?: string): TrustedOperatorSignalLocal | null {
  if (!operatorName) return null;
  const trimmed = operatorName.trim();
  if (!trimmed) return null;

  const lowerInput = trimmed.toLowerCase();
  const inputTokens = tokenizeOperatorName(trimmed);
  if (inputTokens.length === 0) {
    return { operator_name: trimmed, status: "not_in_directory" };
  }

  const candidates = operatorEntries.map((entry) => {
    const entryLower = entry.name.toLowerCase();
    const entryTokens = tokenizeOperatorName(entry.name);
    const tokenOverlap = inputTokens.filter((token) => entryTokens.includes(token)).length;
    const substringMatch = entryLower.includes(lowerInput) || lowerInput.includes(entryLower);
    const cityMatch = city && entry.city ? city.toLowerCase() === entry.city.toLowerCase() : false;

    let score = 0;
    if (substringMatch) score += 100;
    score += tokenOverlap * 20;
    if (cityMatch) score += 10;

    return { entry, score, tokenOverlap, substringMatch };
  });

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const minimumOverlap = inputTokens.length >= 2 ? 2 : 1;
  if (best && (best.substringMatch || best.tokenOverlap >= minimumOverlap)) {
    return operatorEntryToSignal(best.entry);
  }

  return { operator_name: trimmed, status: "not_in_directory" };
}

export function lookupOperatorFromText(text: string, city?: string): TrustedOperatorSignalLocal | null {
  if (!text) return null;
  const hints = extractEvidenceHints(text);
  const candidates = [...hints.business_names];
  const lowerText = text.toLowerCase();
  for (const entry of operatorEntries) {
    if (lowerText.includes(entry.name.toLowerCase())) candidates.unshift(entry.name);
  }

  for (const candidate of candidates) {
    const match = lookupOperator(candidate, city);
    if (match && match.status !== "not_in_directory") return match;
  }
  return candidates[0] ? lookupOperator(candidates[0], city) : null;
}
