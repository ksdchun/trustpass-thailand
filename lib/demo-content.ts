import type { RiskLevel } from "@/lib/types";

export const navItems = [
  { href: "/", label: "Overview" },
  { href: "/check", label: "Risk Check" },
  { href: "/scenarios", label: "Scenarios" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/architecture", label: "Architecture" }
];

export const evidenceCards = [
  {
    value: "35M+",
    label: "foreign visitors in 2024",
    note: "Thailand tourism is a national economic engine."
  },
  {
    value: "USD 48B",
    label: "tourism revenue in 2024",
    note: "Trust failures have direct economic consequences."
  },
  {
    value: "10K",
    label: "reported Chinese cancellations",
    note: "Safety concerns created real demand loss in early 2025."
  },
  {
    value: "2025",
    label: "Trusted Thailand Stamp",
    note: "TAT already treats safety and trust as a priority."
  }
];

export const scenarios: Array<{
  id: string;
  title: string;
  riskLevel: RiskLevel;
  city: string;
  touristInput: string;
  evidenceType: string;
  signals: string[];
  whyItMatters: string;
}> = [
  {
    id: "taxi",
    title: "Everyday scam: taxi overcharging",
    riskLevel: "Caution",
    city: "Bangkok",
    touristInput: "Taxi driver says meter broken and asks 800 baht from Siam to Wat Pho.",
    evidenceType: "Text chat, taxi plate photo, location",
    signals: ["meter refused", "unusual fixed fare", "tourist route"],
    whyItMatters: "Small scams are common trust leaks. The app gives a safe phrase, evidence checklist, and escalation path before conflict."
  },
  {
    id: "tour",
    title: "Payment fraud: fake tour deposit",
    riskLevel: "High",
    city: "Phuket",
    touristInput: "The tour seller asks for full payment to a personal bank account and shows no license number.",
    evidenceType: "LINE screenshot, tour flyer, QR payment screen",
    signals: ["personal transfer", "full prepayment", "missing license"],
    whyItMatters: "Tourists need a way to verify operators before money leaves their account."
  },
  {
    id: "rental",
    title: "Rental risk: passport retention",
    riskLevel: "High",
    city: "Chiang Mai",
    touristInput: "The motorbike rental shop wants to keep my original passport until I return the bike.",
    evidenceType: "Rental contract, receipt, passport clause",
    signals: ["original passport requested", "unclear damage policy", "deposit pressure"],
    whyItMatters: "Passport leverage can turn a minor rental dispute into a serious traveler safety problem."
  },
  {
    id: "casting",
    title: "Critical risk: fake casting or job luring",
    riskLevel: "Emergency",
    city: "Mae Sot",
    touristInput: "A WeChat casting job offers free airport pickup and says a driver will take me to Mae Sot. They told me not to tell my hotel.",
    evidenceType: "WeChat/LINE chat, profile, phone number, pickup point",
    signals: ["free controlled transport", "border travel", "secrecy pressure"],
    whyItMatters: "This connects directly to the trust crisis around fake job/casting luring and cross-border scam-compound fears."
  }
];

export const azureServices = [
  {
    title: "Azure OpenAI / AI Foundry",
    description: "Classifies risk, explains suspicious signals, generates safe next steps, Thai phrases, and incident reports."
  },
  {
    title: "Azure AI Document Intelligence",
    description: "Extracts text from screenshots, receipts, contracts, flyers, QR payment screens, and chat logs."
  },
  {
    title: "Optional Azure AI Vision",
    description: "Future expansion for signs, taxi plates, storefront images, and richer multimodal evidence."
  },
  {
    title: "Tourism Trust Data",
    description: "Risk patterns, emergency contacts, verified operator signals, and safety guidance ground the AI in tourism-specific context."
  }
];
