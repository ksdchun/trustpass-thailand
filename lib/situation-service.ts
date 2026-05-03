import OpenAI from "openai";
import { extractEvidenceHints } from "@/lib/evidence-hints";
import { buildGroundingContext, getKnownVenueMatch } from "@/lib/grounding-tools";
import { areTopicsCompatible, classifyTextRelevance, isGenericCheckMessage, topicLabel } from "@/lib/relevance";
import { buildPrompt, classifyWithLocalRules, normalizeRiskResult } from "@/lib/risk-engine";
import type { EvidenceTopic, RiskCheckRequest, RiskCheckResult, SituationAnalyzeRequest, SituationAnalyzeResponse } from "@/lib/types";

type AnalyzeOptions = {
  allowClarification: boolean;
};

export async function analyzeSituation(input: SituationAnalyzeRequest, options: AnalyzeOptions): Promise<SituationAnalyzeResponse> {
  const payload = applyEvidencePolicy(normalizeAnalyzeRequest(input));
  const scopeResponse = getScopeResponse(payload);
  if (scopeResponse) return scopeResponse;

  const grounding = await buildGroundingContext(payload);
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

  const result = applyGroundingRiskAdjustments(
    await completeWithAzure(payload, fallback, grounding),
    grounding,
    payload
  );
  return toCompletedResponse(result);
}

export function normalizeAnalyzeRequest(input: Partial<SituationAnalyzeRequest | RiskCheckRequest>): RiskCheckRequest {
  return {
    message: input.message?.trim() || "",
    city: input.city || "Bangkok",
    language: input.language || "English",
    extractedText: "extractedText" in input ? input.extractedText?.trim() : undefined,
    evidenceText: "evidenceText" in input ? input.evidenceText?.trim() : undefined,
    evidenceRelevance: "evidenceRelevance" in input ? input.evidenceRelevance : undefined,
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
  const nonFoodGroundingPresent = hasGroundingTool(grounding, "operator_payment_reference") ||
    hasGroundingTool(grounding, "qr_payment_reference") ||
    hasGroundingTool(grounding, "rental_document_reference") ||
    hasGroundingTool(grounding, "damage_claim_reference") ||
    hasGroundingTool(grounding, "job_lure_reference") ||
    hasGroundingTool(grounding, "fare_reference");

  if (hasDeterministicNonFoodEscalation(grounding)) {
    return null;
  }

  if (
    !nonFoodGroundingPresent &&
    hasMenuContext(combined, hints.prices) &&
    venueMatch?.matchedByLocation &&
    venueMatch.venue.food_tier_id === "premium_famous_venue" &&
    !venueMatch.matchedByText &&
    !answeredVenue
  ) {
    return {
      clarification_key: "venue_confirmation",
      question: `Are you currently inside ${venueMatch.venue.name}, or did this menu come from ${venueMatch.venue.name}?`,
      reason: "Your GPS is near a known premium venue, but the menu text does not clearly show the restaurant name. The venue context materially changes whether high prices are normal.",
      suggested_answers: [`Yes, this is ${venueMatch.venue.name}`, "No, this is another restaurant", "Not sure"]
    };
  }

  if (
    !nonFoodGroundingPresent &&
    hasMenuContext(combined, hints.prices) &&
    !request.userLocation &&
    hints.place_names.length === 0 &&
    !hasFoodTierClue(combined) &&
    !answeredVenueLocation
  ) {
    return {
      clarification_key: "venue_location",
      question: "Where is this menu from, or are you currently at the restaurant?",
      reason: "Menu price risk depends heavily on the restaurant and location. The OCR did not find a clear venue name and no GPS location was provided.",
      suggested_answers: ["I am at the restaurant now", "I only have a menu screenshot"]
    };
  }

  if (
    !nonFoodGroundingPresent &&
    hasMenuContext(combined, hints.prices) &&
    hasStreetOrLocalStallClue(combined) &&
    highestPriceBaht(hints.prices) >= 300 &&
    !venueMatch?.matchedByLocation &&
    !hasConcreteFoodScamSignal(combined) &&
    !answeredVenueLocation
  ) {
    return {
      clarification_key: "venue_location",
      question: "Is this really a street/local stall, or is it a sit-down, mall, seafood, or famous venue?",
      reason: "The detected price is high for a normal street/local stall, but the same price may be normal at seafood, mall, or famous venues.",
      suggested_answers: ["Street/local stall", "Mall or sit-down restaurant", "Famous or seafood venue"]
    };
  }

  if (
    hasQrPersonalAccountConcern(combined) &&
    !hasBusinessIdentity(combined, hints.business_names) &&
    !hasGroundingTool(grounding, "operator_payment_reference") &&
    !answeredQrAccount
  ) {
    return {
      clarification_key: "qr_account_match",
      question: "Does the QR/payment account name match the business or tour operator name?",
      reason: "A personal payment account can be normal for some small businesses, but a mismatch matters for fraud risk and refund disputes.",
      suggested_answers: ["Yes, it matches", "No, it is a different personal name", "The business name is not shown"]
    };
  }

  if (
    grounding?.some((signal) => signal.tool === "venue_reference" && signal.title === "Menu venue unknown") &&
    !nonFoodGroundingPresent &&
    !hasFoodTierClue(combined) &&
    !answeredVenueLocation &&
    !answeredVenue
  ) {
    return {
      clarification_key: "venue_location",
      question: "Can you confirm the restaurant name or share your location?",
      reason: "The evidence appears to be a menu, but the backend cannot ground whether the price is normal for that venue.",
      suggested_answers: ["I am not sure"]
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
  const groundedResult = applyGroundedSignalLabels(result, grounding);
  const taxiFareRiskResult = getTaxiFareRiskResult(groundedResult, grounding, request);
  if (taxiFareRiskResult) return taxiFareRiskResult;

  const damageClaimRiskResult = getDamageClaimRiskResult(groundedResult, grounding, request);
  if (damageClaimRiskResult) return damageClaimRiskResult;

  const normalFoodPriceResult = getNormalFoodPriceResult(groundedResult, grounding, request);
  if (normalFoodPriceResult && !hasDeterministicNonFoodEscalation(grounding) && !hasConcreteFoodScamSignal(combineText(request))) {
    return normalFoodPriceResult;
  }

  if (groundedResult.risk_level !== "Low") return groundedResult;

  const normalTaxiResult = getNormalTaxiResult(groundedResult, grounding, request);
  if (normalTaxiResult) return normalTaxiResult;

  const foodPriceRiskResult = getFoodPriceRiskResult(groundedResult, grounding, request);
  if (foodPriceRiskResult) return foodPriceRiskResult;

  return groundedResult;
}

function getTaxiFareRiskResult(
  result: RiskCheckResult,
  grounding: NonNullable<RiskCheckResult["grounding"]>,
  request: RiskCheckRequest
): RiskCheckResult | null {
  const fareSignal = grounding.find((signal) => signal.tool === "fare_reference");
  if (!fareSignal) return null;

  const farePosition = fareSignal.metadata?.fare_position;
  if (farePosition !== "above" && farePosition !== "far_above") return null;

  const quotedFare = typeof fareSignal.metadata?.quoted_fare_baht === "number" ? fareSignal.metadata.quoted_fare_baht : null;
  const baseline = Array.isArray(fareSignal.metadata?.baseline_range_baht)
    ? fareSignal.metadata.baseline_range_baht
    : null;
  const ratio = typeof fareSignal.metadata?.fare_ratio_to_baseline === "number" ? fareSignal.metadata.fare_ratio_to_baseline : null;
  if (quotedFare === null || !baseline || ratio === null) return null;

  const suspiciousSignals = Array.isArray(fareSignal.metadata?.suspicious_fare_signals)
    ? fareSignal.metadata.suspicious_fare_signals
    : [];
  const hasMeterRefusal = suspiciousSignals.some((signal) => typeof signal === "string" && /meter|no meter|refuse/i.test(signal));
  const highRisk = farePosition === "far_above" || ratio >= 3 || (hasMeterRefusal && ratio >= 2);
  const riskLevel = highRisk ? "High" : "Caution";
  const baselineText = `${baseline[0]}-${baseline[1]} THB`;
  const ratioSignal =
    ratio >= 3
      ? `Extreme fixed fare quote about ${ratio}x above route baseline`
      : `Quoted fare is about ${ratio}x above route baseline`;

  return {
    ...result,
    risk_level: riskLevel,
    category: highRisk ? "Taxi fare far above route baseline" : "Taxi fare verification",
    suspicious_signals: Array.from(new Set([...(result.suspicious_signals || []), ratioSignal])).slice(0, 8),
    why_it_matters:
      `${quotedFare} THB is about ${ratio}x the upper end of the local route baseline (${baselineText}). ` +
      (highRisk
        ? "That gap is large enough to treat the fare as a strong overcharging signal, especially if the meter is unavailable or the price is fixed before the ride."
        : "That is higher than the reference, but not extreme by itself; verify the route, meter, tolls, and waiting-time explanation before riding."),
    safe_next_steps: highRisk
      ? [
          "Decline the ride if the driver will not use the meter or explain the fare clearly.",
          "Use a trusted ride-hailing app, hotel taxi desk, or another taxi.",
          "Save the plate, pickup point, destination, time, and quoted fare if pressure continues."
        ]
      : [
          "Ask whether the fare includes tolls, heavy waiting time, or a special route.",
          "Request the meter or compare against a trusted ride-hailing estimate.",
          "Choose another taxi or app ride if the quote still feels unclear."
        ],
    thai_phrase: hasMeterRefusal ? "กรุณาเปิดมิเตอร์ครับ/ค่ะ" : "ราคานี้รวมค่าทางด่วนหรือค่ารอไหมครับ/ค่ะ",
    evidence_to_save: ["Quoted fare", "Pickup and destination", "Taxi plate if safe", "Time and location"],
    contact_recommendation: highRisk
      ? "Use another transport option first. Contact hotel staff or Tourist Police 1155 only if you are pressured, threatened, blocked from leaving, or already harmed."
      : "No police escalation is recommended. Verify calmly or choose another ride.",
    incident_report_summary: {
      english: `TrustPass taxi check in ${request.city}: ${riskLevel} risk. The quoted ${quotedFare} THB fare is about ${ratio}x above the ${baselineText} route baseline.`,
      thai: `รายงาน TrustPass ในพื้นที่ ${request.city}: ระดับ ${riskLevel} ค่าโดยสาร ${quotedFare} บาทสูงกว่าช่วงอ้างอิง ${baselineText} ประมาณ ${ratio} เท่า`
    }
  };
}

function getDamageClaimRiskResult(
  result: RiskCheckResult,
  grounding: NonNullable<RiskCheckResult["grounding"]>,
  request: RiskCheckRequest
): RiskCheckResult | null {
  const damageSignal = grounding.find((signal) => signal.tool === "damage_claim_reference");
  if (!damageSignal) return null;

  const amount = typeof damageSignal.metadata?.damage_amount_baht === "number" ? damageSignal.metadata.damage_amount_baht : null;
  const severity = typeof damageSignal.metadata?.damage_amount_severity === "string" ? damageSignal.metadata.damage_amount_severity : "unknown";
  const ratio = typeof damageSignal.metadata?.amount_ratio_to_minor_damage_reference === "number"
    ? damageSignal.metadata.amount_ratio_to_minor_damage_reference
    : null;
  const hasNoReceipt = damageSignal.metadata?.has_no_receipt === true;
  const hasImmediateCash = damageSignal.metadata?.has_immediate_cash_payment === true;
  const hasLargeDemand = damageSignal.metadata?.has_large_cash_demand === true;
  const interpretedSignals = Array.isArray(damageSignal.metadata?.interpreted_signals)
    ? damageSignal.metadata.interpreted_signals
    : [];
  const hasNeutralProcessPressure = interpretedSignals.some((signal) => typeof signal === "string" && /avoid police|neutral process|insurer/i.test(signal));

  if (amount === null && result.risk_level !== "High") return null;

  if (
    amount !== null &&
    ratio !== null &&
    ratio <= 1.3 &&
    !hasNoReceipt &&
    !hasImmediateCash &&
    !hasLargeDemand &&
    !hasNeutralProcessPressure
  ) {
    return {
      ...result,
      risk_level: "Low",
      category: "Normal rental damage documentation",
      suspicious_signals: [],
      why_it_matters:
        `${amount.toLocaleString("en-US")} THB is within the low demo range for a minor rental damage claim. No immediate cash pressure, receipt refusal, or instruction to avoid a neutral process was detected.`,
      safe_next_steps: [
        "Ask for a written estimate or receipt before paying.",
        "Compare the claim against your before-use photos and rental contract.",
        "Keep the receipt and damage photo for your records."
      ],
      thai_phrase: "ขอใบเสร็จหรือใบแจ้งค่าเสียหายเป็นลายลักษณ์อักษรได้ไหมครับ/ค่ะ",
      evidence_to_save: ["Receipt or written estimate", "Damage photo", "Rental contract", "Before-use photos"],
      contact_recommendation: "No escalation recommended. Treat this as a documentation check unless pressure, receipt refusal, passport leverage, or threats appear.",
      incident_report_summary: {
        english: `TrustPass rental damage check in ${request.city}: Low risk. The ${amount.toLocaleString("en-US")} THB amount is within the low demo range and no pressure signal was detected.`,
        thai: `รายงาน TrustPass ในพื้นที่ ${request.city}: ระดับ Low จำนวน ${amount.toLocaleString("en-US")} บาทอยู่ในช่วงต่ำของตัวอย่างเดโม และไม่พบสัญญาณกดดัน`
      }
    };
  }

  const highRisk = hasLargeDemand || severity === "large" || severity === "extreme" || (hasNoReceipt && hasImmediateCash && severity === "elevated");
  const riskLevel = highRisk ? "High" : "Caution";
  const amountSignal =
    amount === null
      ? "Rental damage claim needs written documentation"
      : highRisk
        ? `Damage demand is ${amount.toLocaleString("en-US")} THB, about ${ratio ?? "several"}x the demo minor-damage threshold`
        : `Damage demand amount is modest but still needs written proof`;

  return {
    ...result,
    risk_level: riskLevel,
    category: highRisk ? "Rental damage cash pressure" : "Rental damage verification",
    suspicious_signals: Array.from(new Set([...(result.suspicious_signals || []), amountSignal])).slice(0, 8),
    why_it_matters:
      amount === null
        ? "The situation contains rental damage pressure signals. The safest path is to document the claim before paying."
        : `${amount.toLocaleString("en-US")} THB is treated as ${severity} for this demo's rental-damage heuristic. The risk increases when a cash demand is combined with no receipt, no written estimate, or pressure to avoid a neutral process.`,
    safe_next_steps: [
      "Ask for a written damage estimate, itemized receipt, and photos showing the claimed damage.",
      "Compare the claim against the rental contract and your before-use photos.",
      highRisk ? "Do not hand over large cash under pressure; ask hotel staff, platform support, insurer, or Tourist Police 1155 if blocked or threatened." : "Pay only after the amount and receipt are clear."
    ],
    thai_phrase: "ขอใบแจ้งค่าเสียหายเป็นลายลักษณ์อักษรและใบเสร็จก่อนครับ/ค่ะ",
    evidence_to_save: ["Before/after photos", "Rental contract", "Damage quote", "Receipt", "Shop name", "Passport/deposit terms"],
    contact_recommendation: highRisk
      ? "Pause payment and ask hotel staff, platform support, or insurer for help. Contact Tourist Police 1155 if pressured, threatened, blocked, or if your passport is being used as leverage."
      : "No police escalation is recommended from amount alone. Get documentation first and involve hotel/platform support if the shop refuses.",
    incident_report_summary: {
      english: `TrustPass rental damage check in ${request.city}: ${riskLevel} risk${amount ? ` for a ${amount.toLocaleString("en-US")} THB damage demand` : ""}. Documentation and neutral review are recommended before payment.`,
      thai: `รายงาน TrustPass ในพื้นที่ ${request.city}: ระดับ ${riskLevel}${amount ? ` สำหรับการเรียกค่าเสียหาย ${amount.toLocaleString("en-US")} บาท` : ""} ควรขอเอกสารและตรวจสอบอย่างเป็นกลางก่อนชำระเงิน`
    }
  };
}

function getFoodPriceRiskResult(
  groundedResult: RiskCheckResult,
  grounding: NonNullable<RiskCheckResult["grounding"]>,
  request: RiskCheckRequest
): RiskCheckResult | null {
  const foodSignal = grounding.find((signal) => signal.tool === "food_price_reference");
  const pricePosition = foodSignal?.metadata?.price_position;
  const likelyTierLabel = typeof foodSignal?.metadata?.likely_tier_label === "string" ? foodSignal.metadata.likely_tier_label : "the likely restaurant tier";
  const normalItemRange = Array.isArray(foodSignal?.metadata?.normal_item_range_baht)
    ? foodSignal.metadata.normal_item_range_baht.join("-")
    : "the expected";
  const highestPrice = foodSignal?.metadata?.highest_price_baht;
  const maxRatio = typeof foodSignal?.metadata?.max_price_ratio_to_reference === "number" ? foodSignal.metadata.max_price_ratio_to_reference : null;
  const likelyTier = typeof foodSignal?.metadata?.likely_tier === "string" ? foodSignal.metadata.likely_tier : null;
  const confidence = foodSignal?.confidence;

  if (pricePosition !== "far_above" && pricePosition !== "above") return null;

  const highRisk =
    confidence !== "low" &&
    pricePosition === "far_above" &&
    maxRatio !== null &&
    maxRatio > 2;
  const riskLevel = highRisk ? "High" : "Caution";
  const ratioText = maxRatio ? `about ${maxRatio}x above` : pricePosition === "far_above" ? "far above" : "above";

  return {
    ...groundedResult,
    risk_level: riskLevel,
    category: highRisk ? "Food price far above local reference" : "Food price verification",
    suspicious_signals: [
      `Detected menu price ${highestPrice ?? "is"} THB is ${ratioText} the ${likelyTierLabel} reference band`
    ],
    why_it_matters:
      `The price is higher than the curated Bangkok reference for ${likelyTierLabel} (${normalItemRange} THB per item). ${highRisk ? "The gap is unusually large for the stated venue tier, so verify the venue and displayed price before paying." : "This does not prove fraud, but the user should confirm the venue, displayed price, receipt, and service terms before paying."}`,
    safe_next_steps: [
      "Confirm the restaurant name and whether the menu belongs to the venue you are inside.",
      "Ask staff to point to the official displayed price before ordering or paying.",
      "Request an itemized receipt and keep a photo of the menu."
    ],
    thai_phrase: "ขอดูราคาในเมนูอย่างเป็นทางการและขอใบเสร็จแบบแยกรายการได้ไหมครับ/ค่ะ",
    contact_recommendation: highRisk
      ? "Do not pay until the venue, item, and displayed price are confirmed. Ask hotel staff or venue management for help; contact Tourist Police 1155 only if pressured, blocked, or threatened."
      : "Ask hotel staff for a second opinion if the venue or price display feels unclear. Contact Tourist Police 1155 only if pressured or threatened.",
    incident_report_summary: {
      english: `TrustPass food price check in ${request.city}: ${riskLevel} risk for menu price verification. The detected price is above the likely tier reference and should be confirmed with the venue before payment.`,
      thai: `รายงาน TrustPass ในพื้นที่ ${request.city}: ระดับ ${riskLevel} สำหรับการตรวจสอบราคาอาหาร ควรยืนยันราคากับร้านก่อนชำระเงิน`
    }
  };
}

function applyEvidencePolicy(request: RiskCheckRequest): RiskCheckRequest {
  const choice = request.clarificationAnswers?.evidence_choice;
  if (choice === "Use my typed situation") {
    return {
      ...request,
      ignoredEvidenceText: request.evidenceText || request.extractedText,
      evidenceText: undefined,
      extractedText: undefined,
      evidenceRelevance: undefined
    };
  }

  if (choice === "Use the uploaded evidence" && (request.evidenceText || request.extractedText)) {
    return {
      ...request,
      message: "Please check this uploaded evidence.",
      evidenceText: request.evidenceText || request.extractedText,
      extractedText: undefined,
      evidenceRelevance: request.evidenceRelevance || classifyTextRelevance(request.evidenceText || request.extractedText || "", "evidence")
    };
  }

  const evidenceText = request.evidenceText || request.extractedText || "";
  if (!evidenceText.trim()) return request;

  const evidenceRelevance = request.evidenceRelevance || classifyTextRelevance(evidenceText, "evidence");
  if (!evidenceRelevance.usable_as_case_evidence) {
    return {
      ...request,
      evidenceText: undefined,
      extractedText: undefined,
      ignoredEvidenceText: evidenceText,
      evidenceRelevance
    };
  }

  return {
    ...request,
    evidenceText,
    extractedText: undefined,
    evidenceRelevance
  };
}

function getScopeResponse(request: RiskCheckRequest): SituationAnalyzeResponse | null {
  const messageRelevance = classifyTextRelevance(request.message, "message");
  const evidenceText = request.evidenceText || "";
  const evidenceRelevance = request.evidenceRelevance || (evidenceText ? classifyTextRelevance(evidenceText, "evidence") : undefined);
  const hasRelevantEvidence = Boolean(evidenceRelevance?.usable_as_case_evidence && evidenceText.trim());
  const genericMessage = isGenericCheckMessage(request.message);

  if (genericMessage && hasRelevantEvidence) return null;

  if (!messageRelevance.usable_as_case_evidence && !hasRelevantEvidence) {
    return {
      status: "out_of_scope",
      message: "TrustPass checks Thailand tourist scam, fraud, payment, transport, rental, menu-price, and safety-risk situations. I could not detect that kind of situation here.",
      suggested_next_inputs: scopeExamples(),
      evidence_relevance: evidenceRelevance,
      grounding: []
    };
  }

  if (messageRelevance.usable_as_case_evidence && !hasRelevantEvidence) return null;

  if (!messageRelevance.usable_as_case_evidence && hasRelevantEvidence && !genericMessage) {
    return evidenceMismatchResponse(
      "unknown",
      evidenceRelevance!,
      "Your message does not describe a TrustPass case, but the uploaded evidence looks relevant. Which one should I check?"
    );
  }

  if (
    messageRelevance.usable_as_case_evidence &&
    hasRelevantEvidence &&
    evidenceRelevance &&
    !areTopicsCompatible(messageRelevance.topic, evidenceRelevance.topic)
  ) {
    return evidenceMismatchResponse(
      messageRelevance.topic,
      evidenceRelevance!,
      `Your message is about ${topicLabel(messageRelevance.topic)}, but the uploaded evidence looks like ${topicLabel(evidenceRelevance.topic)}. Which one should I check?`
    );
  }

  return null;
}

function evidenceMismatchResponse(
  messageTopic: EvidenceTopic,
  evidenceRelevance: NonNullable<RiskCheckRequest["evidenceRelevance"]>,
  question: string
): SituationAnalyzeResponse {
  return {
    status: "evidence_mismatch",
    clarification_key: "evidence_choice",
    question,
    reason: "TrustPass treats OCR as supporting evidence. The typed situation and uploaded evidence should describe the same case before risk scoring.",
    suggested_answers: ["Use my typed situation", "Use the uploaded evidence", "I will upload the correct evidence"],
    message_topic: messageTopic,
    evidence_topic: evidenceRelevance.topic,
    evidence_relevance: evidenceRelevance,
    grounding: []
  };
}

function scopeExamples() {
  return [
    "Taxi driver says the meter is broken and asks 800 baht from Siam to Wat Pho.",
    "A LINE tour seller asks for full payment to a personal bank account.",
    "The rental shop wants to keep my original passport.",
    "This menu photo looks expensive; is it normal for this restaurant?",
    "A casting recruiter offered airport pickup to Mae Sot and told me not to tell my hotel."
  ];
}

function applyGroundedSignalLabels(result: RiskCheckResult, grounding: NonNullable<RiskCheckResult["grounding"]>): RiskCheckResult {
  const signals: string[] = [];
  const fareSignal = grounding.find((signal) => signal.tool === "fare_reference");
  const farePosition = fareSignal?.metadata?.fare_position;
  const suspiciousFareSignals = Array.isArray(fareSignal?.metadata?.suspicious_fare_signals)
    ? fareSignal.metadata.suspicious_fare_signals
    : [];
  const fareRatio = typeof fareSignal?.metadata?.fare_ratio_to_baseline === "number" ? fareSignal.metadata.fare_ratio_to_baseline : null;

  if (suspiciousFareSignals.some((signal) => typeof signal === "string" && /meter|no meter|refuse/i.test(signal))) {
    signals.push("Meter refusal or meter unavailable");
  }
  if (farePosition === "above" || farePosition === "far_above") {
    signals.push("Fixed fare quote above route baseline");
    if (fareRatio !== null) {
      signals.push(
        fareRatio >= 3
          ? `Extreme fixed fare quote about ${fareRatio}x above route baseline`
          : `Quoted fare is about ${fareRatio}x above route baseline`
      );
    }
  }

  for (const signal of grounding) {
    if (!["operator_payment_reference", "qr_payment_reference", "rental_document_reference", "damage_claim_reference", "job_lure_reference"].includes(signal.tool)) continue;
    const interpreted = signal.metadata?.interpreted_signals;
    if (Array.isArray(interpreted)) {
      signals.push(...interpreted.filter((item): item is string => typeof item === "string"));
    }
  }

  const uniqueSignals = Array.from(new Set(signals)).slice(0, 8);
  if (uniqueSignals.length === 0) return result;

  return {
    ...result,
    suspicious_signals: uniqueSignals
  };
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

  if (response.status === "out_of_scope") {
    return {
      risk_level: "Low",
      category: "Outside TrustPass scope",
      suspicious_signals: [],
      why_it_matters: response.message,
      safe_next_steps: response.suggested_next_inputs.map((input) => `Try: ${input}`),
      thai_phrase: "ขออภัย ระบบนี้ใช้ตรวจสอบความเสี่ยงสำหรับนักท่องเที่ยวในประเทศไทยครับ/ค่ะ",
      evidence_to_save: [],
      contact_recommendation: "No escalation recommended. Submit a tourist scam, payment, rental, transport, menu-price, or safety-risk situation for TrustPass to assess.",
      incident_report_summary: {
        english: "TrustPass did not generate a scam-risk report because the input was outside the supported tourist trust scope.",
        thai: "TrustPass ไม่ได้สร้างรายงานความเสี่ยง เนื่องจากข้อมูลไม่อยู่ในขอบเขตการตรวจสอบสำหรับนักท่องเที่ยว"
      },
      grounding: response.grounding,
      source: "local-demo"
    };
  }

  if (response.status === "evidence_mismatch") {
    return {
      risk_level: "Caution",
      category: "Evidence mismatch",
      suspicious_signals: [],
      why_it_matters: response.reason,
      safe_next_steps: response.suggested_answers,
      thai_phrase: "ขอเลือกว่าจะตรวจสอบข้อความหรือหลักฐานที่อัปโหลดครับ/ค่ะ",
      evidence_to_save: [],
      contact_recommendation: "No escalation recommended. Choose which case TrustPass should analyze before continuing.",
      incident_report_summary: {
        english: "TrustPass paused because the typed situation and uploaded evidence appear to describe different case types.",
        thai: "TrustPass หยุดการประเมินไว้ก่อน เนื่องจากข้อความและหลักฐานที่อัปโหลดดูเหมือนเป็นคนละกรณี"
      },
      grounding: response.grounding,
      source: "local-demo"
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
  const clarificationText = Object.values(request.clarificationAnswers || {}).join(" ");
  return `${request.message} ${request.extractedText ?? ""} ${request.evidenceText ?? ""} ${clarificationText} ${request.city}`.toLowerCase();
}

function hasMenuContext(text: string, prices: string[]) {
  const dishOrMenuSignal = /menu|เมนู|food|dish|crab|omelette|noodle|rice|pad thai|ผัด|อาหาร/i.test(text);
  const restaurantMenuSignal = /(restaurant|ร้าน)[\s\S]{0,80}(menu|เมนู)|(menu|เมนู)[\s\S]{0,80}(restaurant|ร้าน)/i.test(text);
  return prices.length > 0 && (dishOrMenuSignal || restaurantMenuSignal);
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
  return /hidden fee|different price|forced|threat|pay now|cash only|no receipt|personal account|different name|account mismatch|name mismatch|scan to pay.*(?:account|personal|different|mismatch)|bait|not shown|menu price changed/i.test(text);
}

function hasQrPersonalAccountConcern(text: string) {
  if (/account name|ชื่อบัญชี|personal account|personal name|different name|account mismatch|name mismatch|not match|does not match|bank transfer|transfer to/i.test(text)) {
    return true;
  }
  return /qr|scan to pay/i.test(text) && /account|personal|different|mismatch|not match|bank|transfer|recipient|receiver|name/i.test(text);
}

function hasBusinessIdentity(text: string, businessNames: string[]) {
  return businessNames.length > 0 || /company|co\.|ltd|limited|license|operator|tour company|restaurant|ร้าน|บริษัท/i.test(text);
}

function hasGroundingTool(grounding: RiskCheckResult["grounding"], tool: string) {
  return Boolean(grounding?.some((signal) => signal.tool === tool));
}

function hasDeterministicNonFoodEscalation(grounding: RiskCheckResult["grounding"]) {
  return Boolean(
    grounding?.some((signal) =>
      ["operator_payment_reference", "rental_document_reference", "damage_claim_reference", "job_lure_reference"].includes(signal.tool)
    )
  );
}

function hasAnswer(request: RiskCheckRequest, key: string) {
  const value = request.clarificationAnswers?.[key];
  return Boolean(value && value.trim());
}
