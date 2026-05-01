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

export type RiskCheckRequest = {
  message: string;
  city: string;
  language: Language;
  extractedText?: string;
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
  source: "azure-openai" | "local-demo";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: RiskCheckResult;
  attachmentName?: string;
};
