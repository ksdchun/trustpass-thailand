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

export type GroundingSignal = {
  tool:
    | "location"
    | "route_distance"
    | "fare_reference"
    | "food_price_reference"
    | "operator_payment_reference"
    | "qr_payment_reference"
    | "rental_document_reference"
    | "damage_claim_reference"
    | "job_lure_reference"
    | "event_context"
    | "venue_reference"
    | "web_grounding";
  title: string;
  summary: string;
  confidence: "low" | "medium" | "high";
  citations?: Array<{
    title: string;
    url: string;
  }>;
  metadata?: Record<string, unknown>;
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
  source: "azure-openai" | "local-demo";
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
    source: "azure-document-intelligence" | "fallback";
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
};

export type SituationAnalyzeResponse =
  | {
      status: "needs_clarification";
      clarification_key?: string;
      question: string;
      reason: string;
      suggested_answers: string[];
      grounding: GroundingSignal[];
    }
  | {
      status: "out_of_scope";
      message: string;
      suggested_next_inputs: string[];
      evidence_relevance?: EvidenceRelevanceResult;
      grounding: GroundingSignal[];
    }
  | {
      status: "evidence_mismatch";
      clarification_key: "evidence_choice";
      question: string;
      reason: string;
      suggested_answers: string[];
      message_topic: EvidenceTopic;
      evidence_topic: EvidenceTopic;
      evidence_relevance: EvidenceRelevanceResult;
      grounding: GroundingSignal[];
    }
  | {
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
    };
