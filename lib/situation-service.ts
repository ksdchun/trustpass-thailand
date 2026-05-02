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

  const fallback = {
    ...classifyWithLocalRules(payload),
    grounding
  };

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

  if (hasMenuContext(combined, hints.prices) && venueMatch?.matchedByLocation && !venueMatch.matchedByText && !answeredVenue) {
    return {
      question: `Are you currently inside ${venueMatch.venue.name}, or did this menu come from ${venueMatch.venue.name}?`,
      reason: "Your GPS is near a known premium venue, but the menu text does not clearly show the restaurant name. The venue context materially changes whether high prices are normal.",
      suggested_answers: [`Yes, this is ${venueMatch.venue.name}`, "No, this is another restaurant", "Not sure"]
    };
  }

  if (hasMenuContext(combined, hints.prices) && !request.userLocation && hints.place_names.length === 0 && !answeredVenueLocation) {
    return {
      question: "Where is this menu from, or are you currently at the restaurant?",
      reason: "Menu price risk depends heavily on the restaurant and location. The OCR did not find a clear venue name and no GPS location was provided.",
      suggested_answers: ["I am at the restaurant now", "I only have a menu screenshot", "I can share the restaurant name"]
    };
  }

  if (hasQrPersonalAccountConcern(combined) && !hasBusinessIdentity(combined, hints.business_names) && !answeredQrAccount) {
    return {
      question: "Does the QR/payment account name match the business or tour operator name?",
      reason: "A personal payment account can be normal for some small businesses, but a mismatch matters for fraud risk and refund disputes.",
      suggested_answers: ["Yes, it matches", "No, it is a different personal name", "The business name is not shown"]
    };
  }

  if (grounding?.some((signal) => signal.tool === "venue_reference" && signal.title === "Menu venue unknown") && !answeredVenueLocation) {
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

  if (!endpoint || !apiKey || !deployment) {
    return fallback;
  }

  try {
    const messages = buildPrompt(payload, fallback, grounding);
    const response = await fetch(
      `${endpoint.replace(/\/$/, "")}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`,
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
        })
      }
    );

    if (!response.ok) return fallback;

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;
    return normalizeRiskResult(parsed, fallback, "azure-openai");
  } catch {
    return fallback;
  }
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
