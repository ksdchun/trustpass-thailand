import locationContext from "@/data/location_context.json";
import taxiFareReference from "@/data/taxi_fare_reference.json";
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
  context: string;
  menu_price_band_baht: [number, number];
  verification_advice: string;
};

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
    getEventGrounding(request),
    getWebGroundingStatus()
  ].filter((signal): signal is GroundingSignal => Boolean(signal));
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
    const typicalRange = matchedRoute.typical_meter_fare_baht;
    const isPlausibleOrCheap = quotedFareBaht !== null && quotedFareBaht <= typicalRange[1];
    return {
      tool: "fare_reference",
      title: "Bangkok taxi fare reference",
      summary:
        isPlausibleOrCheap && suspiciousFareSignals.length === 0
          ? `${quotedFareBaht} THB is plausible or cheap for this short central Bangkok route. ${matchedRoute.interpretation}`
          : `Compare the quote against the ${typicalRange[0]}-${typicalRange[1]} THB demo baseline for this route and the official Bangkok meter rule. Suspicious fare signals found: ${suspiciousFareSignals.length ? suspiciousFareSignals.join(", ") : "none"}.`,
      confidence: "high",
      citations: [bangkokTaxiCitation]
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
      citations: [bangkokTaxiCitation]
    };
  }

  return {
    tool: "fare_reference",
    title: "Bangkok taxi meter rule",
    summary: `Official Bangkok taxi grounding: first kilometer is ${bangkokReference.official_meter_rule.first_km_baht} THB, then ${bangkokReference.official_meter_rule.km_1_to_10_baht_per_km} THB/km from 1-10 km, plus waiting charges in heavy traffic. Escalate only when the fare is high for the route or concrete suspicious signals exist.`,
    confidence: "high",
    citations: [bangkokTaxiCitation]
  };
}

function getVenueGrounding(request: RiskCheckRequest): GroundingSignal | null {
  const combined = combineText(request);
  const match = getKnownVenueMatch(request);
  const mentionsMenu = hasMenuContext(combined);

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
  return /menu|เมนู|restaurant|ร้าน|food|dish|crab|omelette|noodle|rice|pad thai|ผัด|อาหาร/i.test(text);
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
