/**
 * JSON Schema for the strict structured-output response from Azure OpenAI.
 *
 * Fed to `chat.completions.create({ response_format: { type: "json_schema", ... } })`
 * with `strict: true`, the model is guaranteed to emit JSON that matches this shape
 * exactly. The schema mirrors the model-facing fields of `RiskCheckResult`
 * (see lib/types.ts) and is consumed by `normalizeRiskResult` afterwards.
 *
 * `additionalProperties: false` everywhere is required for OpenAI/Azure strict mode.
 */
export const COMPLETED_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    risk_level: {
      type: "string",
      enum: ["Low", "Caution", "High", "Emergency"]
    },
    category: { type: "string" },
    suspicious_signals: {
      type: "array",
      items: { type: "string" }
    },
    why_it_matters: { type: "string" },
    safe_next_steps: {
      type: "array",
      items: { type: "string" }
    },
    thai_phrase: { type: "string" },
    evidence_to_save: {
      type: "array",
      items: { type: "string" }
    },
    contact_recommendation: { type: "string" },
    incident_report_summary: {
      type: "object",
      properties: {
        english: { type: "string" },
        thai: { type: "string" }
      },
      required: ["english", "thai"],
      additionalProperties: false
    }
  },
  required: [
    "risk_level",
    "category",
    "suspicious_signals",
    "why_it_matters",
    "safe_next_steps",
    "thai_phrase",
    "evidence_to_save",
    "contact_recommendation",
    "incident_report_summary"
  ],
  additionalProperties: false
} as const;

/**
 * Runtime validator for the parsed JSON returned by Azure OpenAI.
 *
 * The strict response_format already enforces the schema at the API layer, but
 * we re-validate locally to defend against transport corruption, an older
 * deployment that does not support strict mode, or a deployment that silently
 * downgrades to plain `json_object`. On failure we return a `DegradedResponse`
 * rather than silently coercing.
 */
export function validateCompletedResponseShape(value: unknown):
  | { ok: true }
  | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (!value || typeof value !== "object") {
    return { ok: false, reasons: ["Response was not a JSON object."] };
  }

  const candidate = value as Record<string, unknown>;

  const requiredStringFields = [
    "category",
    "why_it_matters",
    "thai_phrase",
    "contact_recommendation"
  ];
  for (const key of requiredStringFields) {
    if (typeof candidate[key] !== "string" || !(candidate[key] as string).trim()) {
      reasons.push(`Field "${key}" is missing or not a non-empty string.`);
    }
  }

  const requiredStringArrayFields = [
    "suspicious_signals",
    "safe_next_steps",
    "evidence_to_save"
  ];
  for (const key of requiredStringArrayFields) {
    const arr = candidate[key];
    if (!Array.isArray(arr) || arr.some((item) => typeof item !== "string")) {
      reasons.push(`Field "${key}" is missing or not an array of strings.`);
    }
  }

  const riskLevel = candidate.risk_level;
  if (typeof riskLevel !== "string" || !["Low", "Caution", "High", "Emergency"].includes(riskLevel)) {
    reasons.push(`Field "risk_level" must be one of Low | Caution | High | Emergency.`);
  }

  const report = candidate.incident_report_summary;
  if (!report || typeof report !== "object") {
    reasons.push(`Field "incident_report_summary" is missing.`);
  } else {
    const reportRecord = report as Record<string, unknown>;
    if (typeof reportRecord.english !== "string" || !(reportRecord.english as string).trim()) {
      reasons.push(`Field "incident_report_summary.english" must be a non-empty string.`);
    }
    if (typeof reportRecord.thai !== "string" || !(reportRecord.thai as string).trim()) {
      reasons.push(`Field "incident_report_summary.thai" must be a non-empty string.`);
    }
  }

  if (reasons.length > 0) return { ok: false, reasons };
  return { ok: true };
}
