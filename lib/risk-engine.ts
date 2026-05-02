import riskPatterns from "@/data/risk_patterns.json";
import contacts from "@/data/emergency_contacts.json";
import { SYSTEM_PROMPT, languageInstruction } from "@/lib/system-prompt";
import type { RiskCheckRequest, RiskCheckResult, RiskLevel, RiskPattern } from "@/lib/types";

const typedPatterns = riskPatterns as RiskPattern[];

const levelWeight: Record<RiskLevel, number> = {
  Low: 0,
  Caution: 1,
  High: 2,
  Emergency: 3
};

const defaultEvidence = [
  "Screenshots or photos of the conversation, flyer, receipt, contract, or QR payment",
  "Business name, phone number, account name, profile name, and license number if shown",
  "Location, time, quoted price, vehicle plate, or pickup point if relevant"
];

const defaultThaiPhrase = "ขอเวลาตรวจสอบข้อมูลก่อนดำเนินการต่อครับ/ค่ะ";

export function classifyWithLocalRules(request: RiskCheckRequest): RiskCheckResult {
  const combined = `${request.message} ${request.extractedText ?? ""} ${request.city}`.toLowerCase();
  const matches = typedPatterns
    .map((pattern) => {
      const hits = pattern.signals.filter((signal) => combined.includes(signal.toLowerCase()));
      return { pattern, hits };
    })
    .filter((match) => match.hits.length > 0)
    .sort((a, b) => {
      const levelDiff = levelWeight[b.pattern.riskLevel] - levelWeight[a.pattern.riskLevel];
      return levelDiff || b.hits.length - a.hits.length;
    });

  if (matches.length === 0) {
    return {
      risk_level: "Low",
      category: "No strong scam pattern detected",
      suspicious_signals: [],
      why_it_matters:
        "The message does not match the strongest tourism scam patterns. Still verify business identity, price, receipt, and cancellation terms before paying or travelling.",
      safe_next_steps: [
        "Ask for an official receipt and written terms before paying.",
        "Use hotel staff or a trusted platform to verify the operator.",
        "Save screenshots and location details if anything feels unusual."
      ],
      thai_phrase: defaultThaiPhrase,
      evidence_to_save: defaultEvidence,
      contact_recommendation: "Ask your hotel front desk to help verify the service. Contact Tourist Police 1155 if pressured or threatened.",
      incident_report_summary: buildReport("No strong scam pattern detected", "Low", request.city, []),
      source: "local-demo"
    };
  }

  const strongest = matches[0].pattern;
  const allSignals = Array.from(new Set(matches.flatMap((match) => match.hits))).slice(0, 8);
  const actionSet = Array.from(new Set(matches.flatMap((match) => match.pattern.actions))).slice(0, 5);

  return {
    risk_level: strongest.riskLevel,
    category: strongest.category,
    suspicious_signals: allSignals,
    why_it_matters: strongest.why,
    safe_next_steps: actionSet,
    thai_phrase: strongest.thaiPhrase,
    evidence_to_save: evidenceFor(strongest.category),
    contact_recommendation: contactFor(strongest.riskLevel),
    incident_report_summary: buildReport(strongest.category, strongest.riskLevel, request.city, allSignals),
    source: "local-demo"
  };
}

export function buildPrompt(request: RiskCheckRequest, baseline: RiskCheckResult) {
  return [
    {
      role: "system" as const,
      content: `${SYSTEM_PROMPT}\n\n${languageInstruction(request.language)}`
    },
    {
      role: "user" as const,
      content: JSON.stringify(
        {
          task: "Classify tourist scam/fraud risk in Thailand. Return JSON matching the schema in the system prompt.",
          tourist_input: {
            message: request.message,
            extracted_evidence_text: request.extractedText ?? null,
            city: request.city,
            output_language: request.language,
            attachments: request.attachmentsMetadata ?? []
          },
          local_rule_baseline: baseline,
          emergency_contacts: contacts
        },
        null,
        2
      )
    }
  ];
}

export function normalizeRiskResult(input: unknown, fallback: RiskCheckResult, source: RiskCheckResult["source"]): RiskCheckResult {
  if (!input || typeof input !== "object") return fallback;
  const value = input as Partial<RiskCheckResult>;
  const level = value.risk_level && ["Low", "Caution", "High", "Emergency"].includes(value.risk_level)
    ? value.risk_level
    : fallback.risk_level;

  return {
    risk_level: level as RiskLevel,
    category: value.category || fallback.category,
    suspicious_signals: arrayOr(value.suspicious_signals, fallback.suspicious_signals),
    why_it_matters: value.why_it_matters || fallback.why_it_matters,
    safe_next_steps: arrayOr(value.safe_next_steps, fallback.safe_next_steps),
    thai_phrase: value.thai_phrase || fallback.thai_phrase,
    evidence_to_save: arrayOr(value.evidence_to_save, fallback.evidence_to_save),
    contact_recommendation: value.contact_recommendation || fallback.contact_recommendation,
    incident_report_summary: {
      english: value.incident_report_summary?.english || fallback.incident_report_summary.english,
      thai: value.incident_report_summary?.thai || fallback.incident_report_summary.thai
    },
    source
  };
}

function arrayOr(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : fallback;
}

function evidenceFor(category: string) {
  if (category.includes("Taxi")) {
    return ["Taxi plate", "Pickup and destination", "Time", "Quoted fare", "Driver or vehicle details if safe"];
  }
  if (category.includes("casting") || category.includes("job")) {
    return ["Chat screenshots", "Phone number", "Profile name", "Pickup location", "Vehicle plate if safe", "Job/casting offer details"];
  }
  if (category.includes("Rental")) {
    return ["Rental contract", "Shop name", "Receipt", "Vehicle photos before use", "Passport/deposit terms"];
  }
  if (category.includes("payment") || category.includes("tour")) {
    return ["Flyer or chat screenshot", "QR/payment account name", "Business name", "License number if shown", "Receipt or cancellation terms"];
  }
  return defaultEvidence;
}

function contactFor(level: RiskLevel) {
  if (level === "Emergency") {
    return "Stop immediately. Contact hotel staff, Tourist Police 1155, or your embassy/consulate from a safe public place.";
  }
  if (level === "High") {
    return "Do not proceed until verified. Ask hotel staff or Tourist Police 1155 for help if pressured.";
  }
  if (level === "Caution") {
    return "Verify first through hotel staff or a trusted platform. Contact Tourist Police 1155 if the situation escalates.";
  }
  return "Proceed carefully and save receipts. Ask hotel staff if you want a second opinion.";
}

function buildReport(category: string, level: RiskLevel, city: string, signals: string[]) {
  const signalText = signals.length ? signals.join(", ") : "no strong signals detected";
  return {
    english: `TrustPass check in ${city}: ${level} risk for ${category}. Signals: ${signalText}. Tourist should verify before proceeding and save evidence.`,
    thai: `รายงาน TrustPass ในพื้นที่ ${city}: ระดับความเสี่ยง ${level} หมวด ${category} สัญญาณที่พบ: ${signalText} ควรตรวจสอบก่อนดำเนินการและเก็บหลักฐานไว้`
  };
}
