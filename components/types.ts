/**
 * Local frontend-only types that mirror the contract Agent B will publish
 * in `lib/types.ts` once their PR merges into master. These exist so this
 * branch compiles independently while Agent B's changes are still in flight.
 *
 * TODO: replace these with `import { ... } from "@/lib/types"` after Agent B
 * merges and rebase removes the duplication.
 */
import type {
  GroundingSignal as BaseGroundingSignal,
  RiskLevel,
  SituationAnalyzeResponse,
} from "@/lib/types";

export type GroundingSignal = BaseGroundingSignal & {
  source_file?: string;
  source_label?: string;
  confidence_percentage?: number;
};

export type OperatorStatus = "verified" | "no_license" | "not_in_directory";

export type OperatorType = "tour" | "rental" | "restaurant" | "transport" | "wellness";

export type TrustedOperatorSignal = {
  operator_name: string;
  status: OperatorStatus;
  tat_license?: string;
  operator_type?: OperatorType;
  city?: string;
  notes?: string;
};

export type CommunityCorroboration = {
  similar_incident_count: number;
  window_days: number;
  location_label: string;
  link_to_dashboard?: string;
};

export type ResultSource = "azure-openai" | "local-demo" | "demo-mode-cache";

export type CompletedSituationWithExtras = Extract<
  SituationAnalyzeResponse,
  { status: "completed" }
> & {
  trusted_operator?: TrustedOperatorSignal;
  community?: CommunityCorroboration;
  source: ResultSource;
  request_id?: string;
  latency_ms?: number;
};

export type DegradedReason =
  | "azure_unavailable"
  | "schema_validation_failed"
  | "azure_timeout"
  | "content_safety_blocked";

export type DegradedResponse = {
  status: "degraded";
  reason: DegradedReason;
  reason_text: string;
  fallback_result: CompletedSituationWithExtras;
  grounding: GroundingSignal[];
};

export type AnalyzeResponse = SituationAnalyzeResponse | DegradedResponse;

export type ConfidenceLevel = "low" | "medium" | "high";

export type FeedbackPayload = {
  request_id: string | null;
  rating: "up" | "down";
  reason?: string;
};

export type Referrer = string;

export const confidencePercentageFor = (
  signal: { confidence: ConfidenceLevel; confidence_percentage?: number },
): number => {
  if (
    typeof signal.confidence_percentage === "number" &&
    Number.isFinite(signal.confidence_percentage)
  ) {
    return Math.max(0, Math.min(100, Math.round(signal.confidence_percentage)));
  }
  if (signal.confidence === "high") return 95;
  if (signal.confidence === "medium") return 80;
  return 60;
};

export const isRiskLevel = (value: unknown): value is RiskLevel =>
  value === "Low" || value === "Caution" || value === "High" || value === "Emergency";
