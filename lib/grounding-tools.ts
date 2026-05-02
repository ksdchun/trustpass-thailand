import locationContext from "@/data/location_context.json";
import taxiFareReference from "@/data/taxi_fare_reference.json";
import foodPriceReference from "@/data/food_price_reference.json";
import { extractEvidenceHints } from "@/lib/evidence-hints";
import type { GroundingSignal, RiskCheckRequest } from "@/lib/types";

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

type PricePosition = "within" | "above" | "far_above";

const zones = locationContext.zones as Zone[];
const events = locationContext.events as EventContext[];
const venues = locationContext.venues as Venue[];

const bangkokTaxiCitation = {
  title: "Thailand.go.th: Bangkok taxis increase fares",
  url: "https://www.thailand.go.th/issue-focus-detail/001_08_001"
};

export function buildGroundingContext(request: RiskCheckRequest): GroundingSignal[] {
  return [
    getLocationGrounding(request),
    getRouteDistanceGrounding(request),
    getTaxiFareGrounding(request),
    getVenueGrounding(request),
    getFoodPriceGrounding(request),
    getEventGrounding(request),
    getWebGroundingStatus()
  ].filter((signal): signal is GroundingSignal => Boolean(signal));
}

function getFoodPriceGrounding(request: RiskCheckRequest): GroundingSignal | null {
  const combined = combineText(request);
  const text = `${request.message} ${request.extractedText ?? ""} ${request.evidenceText ?? ""}`;
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
  const venueMatch = getKnownVenueMatch(request);
  const likelyTier = chooseFoodTier(combined, tiers, venueMatch?.venue.food_tier_id);
  const highestPrice = Math.max(...prices);
  const itemBand = likelyTier.typical_item_baht;
  const mealBand = likelyTier.typical_meal_baht;
  const pricePosition = getPricePosition(highestPrice, itemBand);
  const confidence = venueMatch ? "high" : inferFoodTierConfidence(combined);
  const dishNotes = getDishNotes(combined);
  const allTierSummary = tiers
    .map((tier) => `${tier.label}: ${tier.typical_item_baht[0]}-${tier.typical_item_baht[1]} THB/item`)
    .join("; ");

  return {
    tool: "food_price_reference",
    title: `Food price tier: ${likelyTier.label}`,
    summary:
      `Detected menu prices: ${prices.join(", ")} THB. Highest detected price is ${highestPrice} THB, which is ${formatPricePosition(pricePosition)} the likely ${likelyTier.label} item band (${itemBand[0]}-${itemBand[1]} THB) and meal band (${mealBand[0]}-${mealBand[1]} THB). ` +
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
      dish_notes: dishNotes ? [dishNotes] : [],
      matched_known_venue: venueMatch?.venue.name ?? null,
      tier_confidence: confidence,
      reference_tiers: tiers.map((tier) => ({
        id: tier.id,
        label: tier.label,
        typical_item_baht: tier.typical_item_baht,
        typical_meal_baht: tier.typical_meal_baht
      }))
    }
  };
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

function getPricePosition(highestPrice: number, itemBand: [number, number]): PricePosition {
  if (highestPrice <= itemBand[1]) return "within";
  if (highestPrice <= itemBand[1] * 1.6) return "above";
  return "far_above";
}

function formatPricePosition(position: PricePosition) {
  if (position === "far_above") return "far above";
  return position;
}

export function getKnownVenueMatch(request: RiskCheckRequest) {
  const combined = combineText(request);
  const cityVenues = venues.filter((venue) => venue.city.toLowerCase() === request.city.toLowerCase());
  const textVenue = cityVenues.find((venue) => venue.keywords.some((keyword) => combined.includes(keyword.toLowerCase())));
  const nearbyVenue = request.userLocation
    ? cityVenues.find((venue) => distanceMeters(request.userLocation!.latitude, request.userLocation!.longitude, venue.lat, venue.lng) <= venue.radius_m)
    : null;

  if (!textVenue && !nearbyVenue) return null;

  return {
    venue: textVenue || nearbyVenue!,
    matchedByText: Boolean(textVenue),
    matchedByLocation: Boolean(nearbyVenue),
    distanceMeters: nearbyVenue && request.userLocation ? Math.round(distanceMeters(request.userLocation.latitude, request.userLocation.longitude, nearbyVenue.lat, nearbyVenue.lng)) : null
  };
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

function getTaxiFareGrounding(request: RiskCheckRequest): GroundingSignal | null {
  const combined = combineText(request);
  if (!combined.includes("taxi")) return null;

  const amountMatch = combined.match(/(?:฿\s*|)(\d{2,5})\s*(?:thb|baht|บาท|฿)/i);
  const quotedFareBaht = amountMatch ? Number(amountMatch[1]) : null;
  const bangkokReference = taxiFareReference.bangkok;
  const routeEstimate = estimateBangkokRoute(request);
  const matchedRoute = bangkokReference.known_city_routes.find((route) => {
    const hasOrigin = route.origin_keywords.some((keyword) => combined.includes(keyword));
    const hasDestination = route.destination_keywords.some((keyword) => combined.includes(keyword));
    return hasOrigin && hasDestination;
  });

  const suspiciousFareSignals = [
    "meter broken",
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
        fare_position: getFarePosition(quotedFareBaht, typicalRange),
        suspicious_fare_signals: suspiciousFareSignals
      }
    };
  }

  if (routeEstimate) {
    const meter = bangkokReference.official_meter_rule;
    const estimateBaht = estimateMeterFare(routeEstimate.estimatedRoadKm, meter.first_km_baht, meter.km_1_to_10_baht_per_km);
    return {
      tool: "fare_reference",
      title: "Bangkok taxi fare estimate",
      summary: `Estimated route: ${routeEstimate.origin.name} to ${routeEstimate.destination.name}, about ${routeEstimate.estimatedRoadKm.toFixed(1)} km by road approximation. Baseline meter fare without heavy waiting time is about ${estimateBaht.low}-${estimateBaht.high} THB. Quoted fare: ${quotedFareBaht ?? "not provided"} THB. Escalate only if the quote is high for this baseline or suspicious signals are present.`,
      confidence: "medium",
      citations: [bangkokTaxiCitation],
      metadata: {
        quoted_fare_baht: quotedFareBaht,
        baseline_range_baht: [estimateBaht.low, estimateBaht.high],
        route_distance_km: routeEstimate.estimatedRoadKm,
        fare_position: getFarePosition(quotedFareBaht, [estimateBaht.low, estimateBaht.high]),
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
      suspicious_fare_signals: suspiciousFareSignals
    }
  };
}

function getFarePosition(quotedFareBaht: number | null, baselineRange: [number, number]) {
  if (quotedFareBaht === null) return "unknown";
  if (quotedFareBaht <= baselineRange[1]) return "within_or_below";
  if (quotedFareBaht <= baselineRange[1] * 1.5) return "above";
  return "far_above";
}

function getVenueGrounding(request: RiskCheckRequest): GroundingSignal | null {
  const combined = combineText(request);
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

function getRouteDistanceGrounding(request: RiskCheckRequest): GroundingSignal | null {
  const combined = combineText(request);
  if (!combined.includes("taxi")) return null;

  const routeEstimate = estimateBangkokRoute(request);
  if (!routeEstimate) return null;

  return {
    tool: "route_distance",
    title: `${routeEstimate.origin.name} to ${routeEstimate.destination.name}`,
    summary: `Approximate straight-line distance is ${routeEstimate.straightLineKm.toFixed(1)} km. Road-adjusted demo estimate is ${routeEstimate.estimatedRoadKm.toFixed(1)} km. This is a grounding estimate, not live navigation.`,
    confidence: "medium"
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
  return `${request.message} ${request.extractedText ?? ""} ${request.evidenceText ?? ""} ${request.city}`.toLowerCase();
}

function estimateBangkokRoute(request: RiskCheckRequest) {
  if (request.city.toLowerCase() !== "bangkok") return null;

  const combined = combineText(request);
  const places = taxiFareReference.bangkok.places as Place[];
  const matchedPlaces = places.filter((place) => place.keywords.some((keyword) => combined.includes(keyword.toLowerCase())));
  if (matchedPlaces.length < 2) return null;

  const [origin, destination] = matchedPlaces;
  const straightLineKm = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
  const estimatedRoadKm = straightLineKm * 1.35;

  return {
    origin,
    destination,
    straightLineKm,
    estimatedRoadKm
  };
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
  return /menu|เมนู|food|dish|crab|omelette|noodle|rice|pad thai|ผัด|อาหาร|ราคา|price/i.test(text);
}

function hasPriceMention(text: string) {
  return /(?:฿\s*)?\d{2,6}(?:,\d{3})?\s*(?:baht|thb|บาท|฿)/i.test(text);
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
