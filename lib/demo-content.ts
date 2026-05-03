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
    id: "taxi-normal",
    title: "Low risk: normal taxi fare",
    riskLevel: "Low",
    city: "Bangkok",
    touristInput: "A taxi driver says he wants 50 baht to take me from Siam to Wat Pho. Is this normal?",
    evidenceType: "Text situation with route context",
    signals: ["route/fare baseline checked", "no meter refusal", "no pressure signal"],
    whyItMatters: "TrustPass should not over-warn users when the price is normal or cheap. This shows grounded judgment, not generic suspicion."
  },
  {
    id: "taxi",
    title: "Everyday scam: taxi overcharging",
    riskLevel: "Caution",
    city: "Bangkok",
    touristInput: "Taxi driver says meter broken and asks 800 baht from Siam to Wat Pho.",
    evidenceType: "Text chat, taxi plate photo, location",
    signals: ["meter refusal or meter unavailable", "fixed fare above route baseline", "tourist route"],
    whyItMatters: "Small scams are common trust leaks. The app gives a safe phrase, evidence checklist, and escalation path before conflict."
  },
  {
    id: "jay-fai-menu",
    title: "Clarification: expensive famous-venue menu",
    riskLevel: "Low",
    city: "Bangkok",
    touristInput: "This menu shows crab omelette 1,500 baht and drunken noodles 800 baht near Jay Fai. Is this suspicious?",
    evidenceType: "Menu image, OCR text, mock GPS near Jay Fai",
    signals: ["premium/famous venue context", "item-level price comparison", "clarification if venue name is missing"],
    whyItMatters: "High prices are not automatically scams. The app asks for venue confirmation and compares each dish against the right restaurant tier."
  },
  {
    id: "street-food-price",
    title: "Clarification: high street-food price",
    riskLevel: "Caution",
    city: "Bangkok",
    touristInput: "A street food stall menu shows pad thai 320 baht and fried rice 350 baht. Is this normal?",
    evidenceType: "Menu screenshot, market/mock location context",
    signals: ["price above street/local band", "venue tier uncertainty", "receipt/menu verification"],
    whyItMatters: "The same price can be normal in a mall and suspicious at a street stall. TrustPass makes tier and location context explicit."
  },
  {
    id: "tour",
    title: "Payment fraud: fake tour deposit",
    riskLevel: "High",
    city: "Phuket",
    touristInput: "A LINE tour seller asks for full payment today to a personal account, says no license number, and claims they are a local team not a company.",
    evidenceType: "LINE screenshot, tour flyer, payment instruction OCR",
    signals: ["full advance payment requested", "personal account transfer", "missing operator license"],
    whyItMatters: "Tourists need to verify operators before money leaves their account. This case also proves OCR prices and words like “Price” do not get misread as restaurant menus."
  },
  {
    id: "qr-mismatch",
    title: "Payment identity: QR/account mismatch",
    riskLevel: "High",
    city: "Bangkok",
    touristInput: "Restaurant QR payment account name is a different personal name and they say scan to pay now.",
    evidenceType: "QR payment screenshot, receipt/account name",
    signals: ["payment account appears personal or mismatched", "QR payment before identity verified", "receipt needed"],
    whyItMatters: "A mismatched account makes refunds and disputes difficult. The app asks for account verification only when the case is ambiguous."
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
    id: "damage-pressure",
    title: "Rental dispute: damage cash pressure",
    riskLevel: "High",
    city: "Pattaya",
    touristInput: "Jet ski shop claims scratch damage and says pay cash now 20,000 baht with no receipt and no police.",
    evidenceType: "Rental contract, damage photo, chat/cash demand",
    signals: ["large cash demand", "no receipt or written estimate", "pressure to avoid neutral process"],
    whyItMatters: "Legitimate damage claims need documentation. TrustPass guides tourists toward receipts, inspection, insurer/platform help, and safe escalation."
  },
  {
    id: "tuktuk-detour",
    title: "Detour scam: temple closed and gem shop",
    riskLevel: "Caution",
    city: "Bangkok",
    touristInput: "A tuk-tuk driver says the temple is closed and wants to take me to a government gem shop with a special price.",
    evidenceType: "Text situation, map/location, driver quote",
    signals: ["attraction closed claim", "shop detour", "commission-stop pattern"],
    whyItMatters: "Not every case is an emergency. This shows TrustPass can recommend calm verification and route control for common tourist traps."
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
