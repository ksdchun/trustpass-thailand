import OpenAI from "openai";
import { extractEvidenceHints } from "@/lib/evidence-hints";
import { buildGroundingContext, getKnownVenueMatch } from "@/lib/grounding-tools";
import { buildPrompt, classifyWithLocalRules, normalizeRiskResult } from "@/lib/risk-engine";
import type { RiskCheckRequest, RiskCheckResult, SituationAnalyzeRequest, SituationAnalyzeResponse } from "@/lib/types";

type AnalyzeOptions = {
  allowClarification: boolean;
};

export async function analyzeSituation(input: SituationAnalyzeRequest, options: AnalyzeOptions): Promise<SituationAnalyzeResponse> {
  const payload = normalizeAnalyzeRequest(input);
  const grounding = buildGroundingContext(payload);
  const clarification = options.allowClarification ? getClarification(payload, grounding) : null;

  if (clarification) {
    return {
      status: "needs_clarification",
      grounding,
      ...clarification
    };
  }

  const fallback = applyGroundingRiskAdjustments(
    {
      ...classifyWithLocalRules(payload),
      grounding
    },
    grounding,
    payload
  );

  if (shouldReturnDeterministicResult(fallback, grounding)) {
    return toCompletedResponse(fallback);
  }

  const result = await completeWithAzure(payload, fallback, grounding);
  return toCompletedResponse(result);
}

export function normalizeAnalyzeRequest(input: Partial<SituationAnalyzeRequest | RiskCheckRequest>): RiskCheckRequest {
  return {
    message: input.message?.trim() || "",
    city: input.city || "Bangkok",
    language: input.language || "English",
    extractedText: "extractedText" in input ? input.extractedText?.trim() : undefined,
    evidenceText: "evidenceText" in input ? input.evidenceText?.trim() : undefined,
    incidentDateIso: input.incidentDateIso || new Date().toISOString(),
    userLocation: input.userLocation,
    clarificationAnswers: input.clarificationAnswers,
    attachmentsMetadata: input.attachmentsMetadata || []
  };
}

function getClarification(request: RiskCheckRequest, grounding: RiskCheckResult["grounding"]) {
  const combined = combineText(request);
  const hints = extractEvidenceHints(`${request.message} ${request.extractedText ?? ""} ${request.evidenceText ?? ""}`);
  const venueMatch = getKnownVenueMatch(request);
  const answeredVenue = hasAnswer(request, "venue_confirmation");
  const answeredVenueLocation = hasAnswer(request, "venue_location");
  const answeredQrAccount = hasAnswer(request, "qr_account_match");

  if (
    hasMenuContext(combined, hints.prices) &&
    venueMatch?.matchedByLocation &&
    venueMatch.venue.food_tier_id === "premium_famous_venue" &&
    !venueMatch.matchedByText &&
    !answeredVenue
  ) {
    return {
      question: `Are you currently inside ${venueMatch.venue.name}, or did this menu come from ${venueMatch.venue.name}?`,
      reason: "Your GPS is near a known premium venue, but the menu text does not clearly show the restaurant name. The venue context materially changes whether high prices are normal.",
      suggested_answers: [`Yes, this is ${venueMatch.venue.name}`, "No, this is another restaurant", "Not sure"]
    };
  }

  if (
    hasMenuContext(combined, hints.prices) &&
    !request.userLocation &&
    hints.place_names.length === 0 &&
    !hasFoodTierClue(combined) &&
    !answeredVenueLocation
  ) {
    return {
      question: "Where is this menu from, or are you currently at the restaurant?",
      reason: "Menu price risk depends heavily on the restaurant and location. The OCR did not find a clear venue name and no GPS location was provided.",
      suggested_answers: ["I am at the restaurant now", "I only have a menu screenshot", "I can share the restaurant name"]
    };
  }

  if (
    hasMenuContext(combined, hints.prices) &&
    hasStreetOrLocalStallClue(combined) &&
    highestPriceBaht(hints.prices) >= 300 &&
    !venueMatch?.matchedByLocation &&
    !hasConcreteFoodScamSignal(combined) &&
    !answeredVenueLocation
  ) {
    return {
      question: "Is this really a street/local stall, or is it a sit-down, mall, seafood, or famous venue?",
      reason: "The detected price is high for a normal street/local stall, but the same price may be normal at seafood, mall, or famous venues.",
      suggested_answers: ["Street/local stall", "Mall or sit-down restaurant", "Famous or seafood venue"]
    };
  }

  if (hasQrPersonalAccountConcern(combined) && !hasBusinessIdentity(combined, hints.business_names) && !answeredQrAccount) {
    return {
      question: "Does the QR/payment account name match the business or tour operator name?",
      reason: "A personal payment account can be normal for some small businesses, but a mismatch matters for fraud risk and refund disputes.",
      suggested_answers: ["Yes, it matches", "No, it is a different personal name", "The business name is not shown"]
    };
  }

  if (
    grounding?.some((signal) => signal.tool === "venue_reference" && signal.title === "Menu venue unknown") &&
    !hasFoodTierClue(combined) &&
    !answeredVenueLocation
  ) {
    return {
      question: "Can you confirm the restaurant name or share your location?",
      reason: "The evidence appears to be a menu, but the backend cannot ground whether the price is normal for that venue.",
      suggested_answers: ["I can share location", "I can type the restaurant name", "I am not sure"]
    };
  }

  return null;
}

async function completeWithAzure(payload: RiskCheckRequest, fallback: RiskCheckResult, grounding: NonNullable<RiskCheckResult["grounding"]>) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
  const timeoutMs = Number(process.env.AZURE_OPENAI_TIMEOUT_MS || 12000);

  if (!endpoint || !apiKey || !deployment) {
    return fallback;
  }

  try {
    const messages = buildPrompt(payload, fallback, grounding);
    const normalizedEndpoint = endpoint.replace(/\/$/, "");
    const openAICompatibleBaseUrl = getOpenAICompatibleBaseUrl(normalizedEndpoint);

    if (openAICompatibleBaseUrl) {
      const client = new OpenAI({
        baseURL: openAICompatibleBaseUrl,
        apiKey,
        timeout: timeoutMs
      });

      const completion = await client.chat.completions.create({
        model: deployment,
        messages,
        temperature: 0.2,
        max_tokens: 900,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0]?.message?.content;
      const parsed = content ? JSON.parse(content) : null;
      return normalizeRiskResult(parsed, fallback, "azure-openai");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(
      `${normalizedEndpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "api-key": apiKey
        },
        body: JSON.stringify({
          messages,
          temperature: 0.2,
          max_tokens: 900,
          response_format: { type: "json_object" }
        }),
        signal: controller.signal
      }
    );
    clearTimeout(timeout);

    if (!response.ok) return fallback;

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;
    return normalizeRiskResult(parsed, fallback, "azure-openai");
  } catch {
    return fallback;
  }
}

function getOpenAICompatibleBaseUrl(endpoint: string) {
  if (endpoint.endsWith("/openai/v1")) return endpoint;
  if (endpoint.includes(".services.ai.azure.com") && endpoint.includes("/api/projects/")) {
    return `${endpoint}/openai/v1`;
  }
  return null;
}

function toCompletedResponse(result: RiskCheckResult): SituationAnalyzeResponse {
  return {
    status: "completed",
    risk_level: result.risk_level,
    category: result.category,
    signals: result.suspicious_signals,
    next_steps: result.safe_next_steps,
    why_it_matters: result.why_it_matters,
    thai_phrase: result.thai_phrase,
    evidence_to_save: result.evidence_to_save,
    contact_recommendation: result.contact_recommendation,
    report: result.incident_report_summary,
    grounding: result.grounding || [],
    source: result.source
  };
}

function applyGroundingRiskAdjustments(
  result: RiskCheckResult,
  grounding: NonNullable<RiskCheckResult["grounding"]>,
  request: RiskCheckRequest
): RiskCheckResult {
  const normalFoodPriceResult = getNormalFoodPriceResult(result, grounding, request);
  if (normalFoodPriceResult && result.risk_level !== "High" && result.risk_level !== "Emergency" && !hasConcreteFoodScamSignal(combineText(request))) {
    return normalFoodPriceResult;
  }

  if (result.risk_level !== "Low") return result;

  const normalTaxiResult = getNormalTaxiResult(result, grounding, request);
  if (normalTaxiResult) return normalTaxiResult;

  const foodSignal = grounding.find((signal) => signal.tool === "food_price_reference");
  const pricePosition = foodSignal?.metadata?.price_position;
  const likelyTierLabel = typeof foodSignal?.metadata?.likely_tier_label === "string" ? foodSignal.metadata.likely_tier_label : "the likely restaurant tier";
  const normalItemRange = Array.isArray(foodSignal?.metadata?.normal_item_range_baht)
    ? foodSignal.metadata.normal_item_range_baht.join("-")
    : "the expected";
  const highestPrice = foodSignal?.metadata?.highest_price_baht;

  if (pricePosition !== "far_above" && pricePosition !== "above") return result;

  return {
    ...result,
    risk_level: "Caution",
    category: "Food price verification",
    suspicious_signals: [
      `Detected menu price ${highestPrice ?? "is"} THB is ${pricePosition === "far_above" ? "far above" : "above"} the ${likelyTierLabel} reference band`
    ],
    why_it_matters:
      `The price is higher than the curated Bangkok reference for ${likelyTierLabel} (${normalItemRange} THB per item). This does not prove fraud, but the user should confirm the venue, displayed price, receipt, and service terms before paying.`,
    safe_next_steps: [
      "Confirm the restaurant name and whether the menu belongs to the venue you are inside.",
      "Ask staff to point to the official displayed price before ordering or paying.",
      "Request an itemized receipt and keep a photo of the menu."
    ],
    thai_phrase: "ขอดูราคาในเมนูอย่างเป็นทางการและขอใบเสร็จแบบแยกรายการได้ไหมครับ/ค่ะ",
    contact_recommendation: "Ask hotel staff for a second opinion if the venue or price display feels unclear. Contact Tourist Police 1155 only if pressured or threatened.",
    incident_report_summary: {
      english: `TrustPass food price check in ${request.city}: Caution risk for menu price verification. The detected price is above the likely tier reference and should be confirmed with the venue before payment.`,
      thai: `รายงาน TrustPass ในพื้นที่ ${request.city}: ระดับ Caution สำหรับการตรวจสอบราคาอาหาร ควรยืนยันราคากับร้านก่อนชำระเงิน`
    }
  };
}

function shouldReturnDeterministicResult(result: RiskCheckResult, grounding: NonNullable<RiskCheckResult["grounding"]>) {
  if (result.category === "Normal taxi fare") return true;

  const foodSignal = grounding.find((signal) => signal.tool === "food_price_reference");
  return (
    result.risk_level === "Low" &&
    foodSignal?.confidence === "high" &&
    foodSignal.metadata?.price_position === "within" &&
    typeof foodSignal.metadata?.matched_known_venue === "string"
  );
}

function getNormalFoodPriceResult(
  result: RiskCheckResult,
  grounding: NonNullable<RiskCheckResult["grounding"]>,
  request: RiskCheckRequest
): RiskCheckResult | null {
  const foodSignal = grounding.find((signal) => signal.tool === "food_price_reference");
  if (!foodSignal || foodSignal.metadata?.price_position !== "within") return null;

  const confidence = foodSignal.confidence;
  const tierLabel = typeof foodSignal.metadata.likely_tier_label === "string" ? foodSignal.metadata.likely_tier_label : "the likely restaurant tier";
  const matchedVenue = typeof foodSignal.metadata.matched_known_venue === "string" ? foodSignal.metadata.matched_known_venue : null;
  const highestPrice = typeof foodSignal.metadata.highest_price_baht === "number" ? foodSignal.metadata.highest_price_baht : null;
  const normalItemRange = Array.isArray(foodSignal.metadata.normal_item_range_baht)
    ? foodSignal.metadata.normal_item_range_baht.join("-")
    : "the expected";
  const normalMealRange = Array.isArray(foodSignal.metadata.normal_meal_range_baht)
    ? foodSignal.metadata.normal_meal_range_baht.join("-")
    : "the expected";

  if (confidence !== "high" || !highestPrice) return null;

  const venueText = matchedVenue ? ` at ${matchedVenue}` : "";

  return {
    ...result,
    risk_level: "Low",
    category: matchedVenue ? `${matchedVenue} price context` : "Premium restaurant price context",
    suspicious_signals: [],
    why_it_matters:
      `${highestPrice} THB is within the curated Bangkok ${tierLabel} reference${venueText}. The expected band is about ${normalItemRange} THB per item or ${normalMealRange} THB per meal, and no payment mismatch, hidden fee, pressure, or bait-and-switch signal was detected.`,
    safe_next_steps: [
      "No scam signal is detected from the price alone.",
      "Confirm the menu item and displayed price with staff before ordering.",
      "Keep the receipt if you decide to pay."
    ],
    thai_phrase: "ขอยืนยันราคาเมนูนี้ก่อนสั่งอาหารครับ/ค่ะ",
    evidence_to_save: ["Receipt or menu photo only if the final bill differs from the displayed price."],
    contact_recommendation: "No escalation recommended. Ask staff to confirm the price if anything is unclear.",
    incident_report_summary: {
      english: `TrustPass food price check in ${request.city}: Low risk. The ${highestPrice} THB price is within the ${tierLabel} reference${venueText}, and no suspicious payment or pressure signal was detected.`,
      thai: `รายงาน TrustPass ในพื้นที่ ${request.city}: ระดับ Low ราคา ${highestPrice} บาทอยู่ในช่วงอ้างอิงของ ${tierLabel}${matchedVenue ? ` (${matchedVenue})` : ""} และไม่พบสัญญาณกดดันหรือการชำระเงินที่น่าสงสัย`
    }
  };
}

function getNormalTaxiResult(
  result: RiskCheckResult,
  grounding: NonNullable<RiskCheckResult["grounding"]>,
  request: RiskCheckRequest
): RiskCheckResult | null {
  const fareSignal = grounding.find((signal) => signal.tool === "fare_reference");
  if (!fareSignal) return null;

  const farePosition = fareSignal.metadata?.fare_position;
  const suspiciousSignals = Array.isArray(fareSignal.metadata?.suspicious_fare_signals)
    ? fareSignal.metadata.suspicious_fare_signals
    : [];
  const quotedFare = typeof fareSignal.metadata?.quoted_fare_baht === "number" ? fareSignal.metadata.quoted_fare_baht : null;
  const baseline = Array.isArray(fareSignal.metadata?.baseline_range_baht)
    ? fareSignal.metadata.baseline_range_baht
    : null;

  if (farePosition !== "within_or_below" || suspiciousSignals.length > 0 || quotedFare === null) return null;

  const baselineText = baseline?.length === 2 ? ` The local reference range for this route is about ${baseline[0]}-${baseline[1]} THB before heavy waiting time.` : "";

  return {
    ...result,
    risk_level: "Low",
    category: "Normal taxi fare",
    suspicious_signals: [],
    why_it_matters:
      `${quotedFare} THB is within or below the Bangkok taxi fare grounding for the described route.${baselineText} No meter refusal, hidden fee, route diversion, pressure, or safety signal was detected.`,
    safe_next_steps: [
      "No special action is needed based on the fare alone.",
      "Confirm the destination before getting in.",
      "Pay the agreed fare or meter fare at the end of the ride."
    ],
    thai_phrase: "ไปวัดโพธิ์ ราคา 50 บาท ใช่ไหมครับ/ค่ะ",
    evidence_to_save: ["No evidence needed for a normal low-risk ride unless something changes."],
    contact_recommendation: "No escalation recommended. Ask for help only if the driver changes the price, refuses the agreed route, or pressures you.",
    incident_report_summary: {
      english: `TrustPass taxi fare check in ${request.city}: Low risk. The quoted ${quotedFare} THB fare is within or below the local route reference and no suspicious signal was detected.`,
      thai: `รายงาน TrustPass ในพื้นที่ ${request.city}: ระดับ Low ค่าโดยสาร ${quotedFare} บาทอยู่ในช่วงปกติหรือต่ำกว่าช่วงอ้างอิง และไม่พบสัญญาณน่าสงสัย`
    }
  };
}

export function toLegacyRiskResult(response: SituationAnalyzeResponse): RiskCheckResult {
  if (response.status === "completed") {
    return {
      risk_level: response.risk_level,
      category: response.category,
      suspicious_signals: response.signals,
      why_it_matters: response.why_it_matters,
      safe_next_steps: response.next_steps,
      thai_phrase: response.thai_phrase,
      evidence_to_save: response.evidence_to_save,
      contact_recommendation: response.contact_recommendation,
      incident_report_summary: response.report,
      grounding: response.grounding,
      source: response.source
    };
  }

  return {
    risk_level: "Caution",
    category: "More context needed",
    suspicious_signals: [],
    why_it_matters: response.reason,
    safe_next_steps: [response.question, ...response.suggested_answers.map((answer) => `Answer option: ${answer}`)],
    thai_phrase: "ขอข้อมูลเพิ่มเติมเพื่อช่วยตรวจสอบความเสี่ยงครับ/ค่ะ",
    evidence_to_save: ["Restaurant/operator name if visible", "Current location or venue name", "Menu, QR, receipt, or chat screenshot"],
    contact_recommendation: "Ask staff to confirm the venue, price, receipt, or payment account before paying.",
    incident_report_summary: {
      english: `TrustPass needs clarification: ${response.question}`,
      thai: `TrustPass ต้องการข้อมูลเพิ่มเติม: ${response.question}`
    },
    grounding: response.grounding,
    source: "local-demo"
  };
}

function combineText(request: RiskCheckRequest) {
  return `${request.message} ${request.extractedText ?? ""} ${request.evidenceText ?? ""} ${request.city}`.toLowerCase();
}

function hasMenuContext(text: string, prices: string[]) {
  return prices.length > 0 && /menu|เมนู|restaurant|ร้าน|food|dish|crab|omelette|noodle|rice|pad thai|ผัด|อาหาร|ราคา|price/i.test(text);
}

function hasFoodTierClue(text: string) {
  return /jay fai|michelin|premium|famous venue|department store|food court|food hall|mall|paragon|emporium|emquartier|centralworld|gaysorn|central embassy|terminal 21|pier 21|mbk|street food|stall|market|local restaurant|local stall|sit-down|fine dining|higher-end|high end/i.test(text);
}

function hasStreetOrLocalStallClue(text: string) {
  return /street food|local stall|stall|market/i.test(text);
}

function highestPriceBaht(prices: string[]) {
  return prices
    .map((price) => Number(price.replace(/[^\d]/g, "")))
    .filter((price) => Number.isFinite(price))
    .reduce((highest, price) => Math.max(highest, price), 0);
}

function hasConcreteFoodScamSignal(text: string) {
  return /hidden fee|different price|forced|threat|pay now|cash only|no receipt|personal account|different name|qr|scan to pay|bait|not shown|menu price changed/i.test(text);
}

function hasQrPersonalAccountConcern(text: string) {
  return /qr|scan to pay|account name|ชื่อบัญชี|personal account|personal name|different name/i.test(text);
}

function hasBusinessIdentity(text: string, businessNames: string[]) {
  return businessNames.length > 0 || /company|co\.|ltd|limited|license|operator|tour company|restaurant|ร้าน|บริษัท/i.test(text);
}

function hasAnswer(request: RiskCheckRequest, key: string) {
  const value = request.clarificationAnswers?.[key];
  return Boolean(value && value.trim());
}
