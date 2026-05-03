import { extractEvidenceHints } from "@/lib/evidence-hints";
import type { EvidenceRelevanceResult, EvidenceTopic } from "@/lib/types";

const topicLabels: Record<EvidenceTopic, string> = {
  transport: "taxi/transport",
  food_menu: "restaurant menu or food price",
  tour_payment: "tour/operator payment",
  qr_payment: "QR/payment account",
  rental_document: "rental/passport document",
  damage_claim: "rental damage claim",
  job_lure: "job/casting safety risk",
  unknown: "unknown"
};

export function topicLabel(topic: EvidenceTopic) {
  return topicLabels[topic];
}

export function classifyTextRelevance(text: string, source: "message" | "evidence" = "message"): EvidenceRelevanceResult {
  const normalized = text.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();

  if (!normalized || normalized.length < 12 || /uploaded evidence could not be read/i.test(normalized)) {
    return {
      topic: "unknown",
      relevance: "weak",
      reason: source === "evidence" ? "No readable TrustPass evidence was detected." : "The message is too short to identify a tourist scam or safety situation.",
      usable_as_case_evidence: false
    };
  }

  const hints = extractEvidenceHints(normalized);
  const topic = detectTopic(lower, hints.prices.length > 0);

  if (topic !== "unknown") {
    return {
      topic,
      relevance: "relevant",
      reason: `Detected ${topicLabel(topic)} context.`,
      usable_as_case_evidence: true
    };
  }

  return {
    topic: "unknown",
    relevance: "unrelated",
    reason: "No Thailand tourist scam, payment, transport, rental, menu-price, or safety-risk signal was detected.",
    usable_as_case_evidence: false
  };
}

export function isGenericCheckMessage(text: string) {
  const lower = text.replace(/\s+/g, " ").trim().toLowerCase();
  if (!lower) return true;
  if (lower.length <= 90 && /^(please\s+)?(can you\s+)?(check|look at|review|analyze|analyse)( this| it| my screenshot| this screenshot| this evidence| this uploaded evidence)?[?.!]?$/.test(lower)) return true;
  return lower.length <= 80 && /^(is this (a scam|suspicious|normal)|does this look suspicious|help me check this)[?.!]?$/.test(lower);
}

export function areTopicsCompatible(messageTopic: EvidenceTopic, evidenceTopic: EvidenceTopic) {
  if (messageTopic === "unknown" || evidenceTopic === "unknown") return true;
  if (messageTopic === evidenceTopic) return true;

  const paymentTopics = new Set<EvidenceTopic>(["tour_payment", "qr_payment"]);
  if (paymentTopics.has(messageTopic) && paymentTopics.has(evidenceTopic)) return true;

  const rentalTopics = new Set<EvidenceTopic>(["rental_document", "damage_claim"]);
  if (rentalTopics.has(messageTopic) && rentalTopics.has(evidenceTopic)) return true;

  return false;
}

function detectTopic(text: string, hasPrice: boolean): EvidenceTopic {
  if (hasAny(text, ["casting", "modeling", "modelling", "photoshoot", "job offer", "recruiter", "wechat", "mae sot", "myanmar", "border"]) &&
    hasAny(text, ["pickup", "driver", "do not tell", "keep secret", "hotel", "interview", "mae sot", "border", "myanmar", "chat", "screenshot"])) {
    return "job_lure";
  }

  if (hasAny(text, ["scratch", "damage", "claim", "repair", "jet ski"]) &&
    hasAny(text, ["cash now", "pay cash", "pay now", "no receipt", "police", "insurer", "20,000", "20000", "written estimate", "demand"])) {
    return "damage_claim";
  }

  if (hasAny(text, ["rental", "rent", "motorbike", "scooter", "jet ski", "vehicle", "contract"]) &&
    hasAny(text, ["passport", "deposit", "agreement", "contract", "damage policy", "terms", "dispute", "screenshot"])) {
    return "rental_document";
  }

  if (hasAny(text, ["tour", "operator", "booking", "package", "island", "license number", "tat license", "travel agent"]) &&
    hasAny(text, ["payment", "pay", "full payment", "deposit", "transfer", "bank account", "personal account", "license", "chat", "screenshot", "line"])) {
    return "tour_payment";
  }

  if (hasAny(text, ["qr payment", "scan to pay", "account name", "payment account", "ชื่อบัญชี", "different personal name", "does not match", "account mismatch", "name mismatch"]) ||
    (text.includes("qr") && hasAny(text, ["personal", "account", "different", "mismatch", "not match", "receiver", "recipient", "bank transfer"]))) {
    return "qr_payment";
  }

  if ((hasPrice && (hasAny(text, ["menu", "restaurant", "food", "dish", "crab", "omelette", "noodle", "pad thai", "ผัด", "อาหาร", "price in thai baht"]) || /\brice\b/i.test(text))) ||
    (text.includes("menu") && hasAny(text, ["jay fai", "restaurant", "food", "ocr", "photo", "screenshot", "price"])) ||
    /(?:restaurant|ร้าน)[\s\S]{0,80}(menu|เมนู)|(menu|เมนู)[\s\S]{0,80}(restaurant|ร้าน)/i.test(text)) {
    return "food_menu";
  }

  if (hasAny(text, ["taxi", "cab", "grab", "bolt", "tuk-tuk", "tuktuk", "meter", "fare", "driver", "temple is closed", "gem shop"]) &&
    hasAny(text, ["taxi", "fare", "meter", "from", "to", "driver", "ride", "take me", "closed", "gem shop", "chat", "screenshot"])) {
    return "transport";
  }

  return "unknown";
}

function hasAny(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase));
}
