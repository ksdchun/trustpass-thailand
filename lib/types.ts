export type RiskLevel = "Low" | "Caution" | "High" | "Emergency";

export type Language = "English" | "Thai" | "Chinese";

export type EvidenceTopic =
  | "transport"
  | "food_menu"
  | "tour_payment"
  | "qr_payment"
  | "rental_document"
  | "damage_claim"
  | "job_lure"
  | "unknown";

export type EvidenceRelevance = "relevant" | "weak" | "unrelated";

export type EvidenceRelevanceResult = {
  topic: EvidenceTopic;
  relevance: EvidenceRelevance;
  reason: string;
  usable_as_case_evidence: boolean;
};

export type RiskPattern = {
  id: string;
  category: string;
  riskLevel: RiskLevel;
  signals: string[];
  why: string;
  actions: string[];
  thaiPhrase: string;
};

export type UserLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: "browser" | "manual";
};

export type GroundingConfidence = "low" | "medium" | "high";

export type GroundingSignal = {
  tool: string;
  title: string;
  summary: string;
  confidence: GroundingConfidence;
  citations?: Array<{
    title: string;
    url: string;
  }>;
  metadata?: Record<string, unknown>;
  source_file?: string;
  source_label?: string;
  confidence_percentage?: number;
};

export const GROUNDING_CONFIDENCE_PERCENT: Record<GroundingConfidence, number> = {
  low: 60,
  medium: 80,
  high: 95
};

export type TrustedOperatorSignal = {
  operator_name: string;
  status: "verified" | "no_license" | "not_in_directory";
  tat_license?: string;
  operator_type?: "tour" | "rental" | "restaurant" | "transport" | "wellness";
  city?: string;
  notes?: string;
};

export type CommunityCorroboration = {
  similar_incident_count: number;
  window_days: number;
  location_label: string;
  link_to_dashboard?: string;
};

export type RiskCheckRequest = {
  message: string;
  city: string;
  language: Language;
  extractedText?: string;
  evidenceText?: string;
  evidenceRelevance?: EvidenceRelevanceResult;
  ignoredEvidenceText?: string;
  incidentDateIso?: string;
  userLocation?: UserLocation;
  clarificationAnswers?: Record<string, string>;
  attachmentsMetadata?: Array<{
    name: string;
    type: string;
    size: number;
  }>;
  evidenceImage?: string;
  evidenceImageMime?: string;
  evidenceSanitizationFlagged?: boolean;
  evidenceSanitizationReasons?: string[];
};

export type RiskCheckResult = {
  risk_level: RiskLevel;
  category: string;
  suspicious_signals: string[];
  why_it_matters: string;
  safe_next_steps: string[];
  thai_phrase: string;
  evidence_to_save: string[];
  contact_recommendation: string;
  incident_report_summary: {
    english: string;
    thai: string;
  };
  grounding?: GroundingSignal[];
  source: "azure-openai" | "local-demo" | "demo-mode-cache";
  trusted_operator?: TrustedOperatorSignal;
  community?: CommunityCorroboration;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: RiskCheckResult;
  attachmentName?: string;
};

export type EvidenceHints = {
  prices: string[];
  phone_numbers: string[];
  account_names: string[];
  business_names: string[];
  place_names: string[];
  risky_phrases: string[];
  visible_dates: string[];
};

export type EvidenceExtractResult = {
  extractedText: string;
  detectedFields: {
    source: "azure-document-intelligence" | "fallback" | "demo-mode-cache";
    pages: number;
    hints: EvidenceHints;
    relevance: EvidenceRelevance;
    relevance_reason: string;
    evidence_topic: EvidenceTopic;
    usable_as_case_evidence: boolean;
    recoverable: boolean;
    note?: string;
  };
};

export type SituationAnalyzeRequest = {
  message: string;
  city: string;
  language: Language;
  incidentDateIso: string;
  userLocation?: UserLocation;
  evidenceText?: string;
  evidenceRelevance?: EvidenceRelevanceResult;
  attachmentsMetadata?: RiskCheckRequest["attachmentsMetadata"];
  clarificationAnswers?: Record<string, string>;
  evidenceImage?: string;
};

export type CompletedResponse = {
  status: "completed";
  risk_level: RiskLevel;
  category: string;
  signals: string[];
  next_steps: string[];
  why_it_matters: string;
  thai_phrase: string;
  evidence_to_save: string[];
  contact_recommendation: string;
  report: RiskCheckResult["incident_report_summary"];
  grounding: GroundingSignal[];
  source: RiskCheckResult["source"];
  trusted_operator?: TrustedOperatorSignal;
  community?: CommunityCorroboration;
  request_id?: string;
  latency_ms?: number;
};

export type NeedsClarificationResponse = {
  status: "needs_clarification";
  clarification_key?: string;
  question: string;
  reason: string;
  suggested_answers: string[];
  grounding: GroundingSignal[];
};

export type OutOfScopeResponse = {
  status: "out_of_scope";
  message: string;
  suggested_next_inputs: string[];
  evidence_relevance?: EvidenceRelevanceResult;
  grounding: GroundingSignal[];
};

export type EvidenceMismatchResponse = {
  status: "evidence_mismatch";
  clarification_key: "evidence_choice";
  question: string;
  reason: string;
  suggested_answers: string[];
  message_topic: EvidenceTopic;
  evidence_topic: EvidenceTopic;
  evidence_relevance: EvidenceRelevanceResult;
  grounding: GroundingSignal[];
};

export type DegradedResponse = {
  status: "degraded";
  reason: "azure_unavailable" | "schema_validation_failed" | "azure_timeout" | "content_safety_blocked";
  reason_text: string;
  fallback_result: CompletedResponse;
  grounding: GroundingSignal[];
  request_id?: string;
  latency_ms?: number;
};

export type SituationAnalyzeResponse =
  | CompletedResponse
  | NeedsClarificationResponse
  | OutOfScopeResponse
  | EvidenceMismatchResponse
  | DegradedResponse;
