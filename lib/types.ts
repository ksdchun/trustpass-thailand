export type RiskLevel = "Low" | "Caution" | "High" | "Emergency";

export type Language = "English" | "Thai" | "Chinese";

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
  tool: "location" | "route_distance" | "fare_reference" | "event_context" | "venue_reference" | "web_grounding";
  title: string;
  summary: string;
  confidence: "low" | "medium" | "high";
  citations?: Array<{
    title: string;
    url: string;
  }>;
};

export type RiskCheckRequest = {
  message: string;
  city: string;
  language: Language;
  extractedText?: string;
  evidenceText?: string;
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
  attachmentsMetadata?: RiskCheckRequest["attachmentsMetadata"];
  clarificationAnswers?: Record<string, string>;
};

export type SituationAnalyzeResponse =
  | {
      status: "needs_clarification";
      question: string;
      reason: string;
      suggested_answers: string[];
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
