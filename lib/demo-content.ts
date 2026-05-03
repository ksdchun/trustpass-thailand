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
  riskRange: string;
  city: string;
  touristInput: string;
  evidenceType: string;
  signals: string[];
  trustPassDoes: string;
  whyItMatters: string;
  image?: string;
  imageAlt?: string;
  imageClassName?: string;
}> = [
  {
    id: "transport",
    title: "Transport overcharging and detours",
    riskLevel: "Caution",
    riskRange: "Low to High",
    city: "Bangkok",
    touristInput: "A taxi says the meter is broken, or a tuk-tuk says the temple is closed and wants to stop at a shop.",
    evidenceType: "Route, fare quote, taxi plate, chat, location context",
    signals: ["meter refusal", "fixed fare above route baseline", "attraction-closed detour", "shop commission stop"],
    trustPassDoes: "Compares route/fare context, separates normal cheap fares from suspicious quotes, and gives calm Thai phrases.",
    whyItMatters: "Transport scams are frequent trust leaks, but the app should not over-warn when a fare is normal."
  },
  {
    id: "food-menu",
    title: "Food and menu price verification",
    riskLevel: "Low",
    riskRange: "Low to Caution",
    city: "Bangkok",
    touristInput: "This menu looks expensive. Is 1,500 baht for crab omelette normal here?",
    evidenceType: "Menu photo, OCR text, restaurant name, GPS or venue context",
    signals: ["menu item prices", "venue tier", "premium/famous venue context", "missing venue confirmation"],
    trustPassDoes: "Extracts all visible menu items, compares each item against the likely venue tier, and asks for venue clarification when needed.",
    whyItMatters: "High prices can be normal at famous venues but suspicious at local stalls. Venue context is the key.",
    image: "/evidence/jay-fai-menu-demo.png",
    imageAlt: "Synthetic restaurant menu evidence used to test food price grounding"
  },
  {
    id: "payment",
    title: "Tour, QR, and payment fraud",
    riskLevel: "High",
    riskRange: "Caution to High",
    city: "Phuket",
    touristInput: "A tour seller asks for full payment to a personal account, or a QR code name does not match the business.",
    evidenceType: "LINE/WhatsApp screenshot, flyer, QR screen, account name, receipt",
    signals: ["full advance payment", "personal or mismatched account", "missing license", "time pressure"],
    trustPassDoes: "Prioritizes payment fraud grounding over unrelated OCR noise and recommends verification before money leaves the account.",
    whyItMatters: "Payment identity and operator legitimacy are central to avoiding fake bookings and refund disputes.",
    image: "/evidence/fake-tour-payment-demo.png",
    imageAlt: "Synthetic chat evidence showing a fake tour payment pattern"
  },
  {
    id: "rental-documents",
    title: "Rental passport and document risk",
    riskLevel: "High",
    riskRange: "Caution to High",
    city: "Chiang Mai",
    touristInput: "A motorbike or scooter rental shop wants to keep my original passport as a deposit.",
    evidenceType: "Rental contract, receipt, passport clause, shop name",
    signals: ["original passport requested", "unclear deposit terms", "vehicle rental leverage"],
    trustPassDoes: "Flags document leverage risk and suggests safer alternatives such as passport copy plus written deposit terms.",
    whyItMatters: "Passport leverage can turn a minor rental issue into a serious traveler safety problem.",
    image: "/evidence/rental-passport-demo.png",
    imageAlt: "Synthetic rental contract evidence with passport-retention language"
  },
  {
    id: "rental-damage",
    title: "Rental damage cash pressure",
    riskLevel: "High",
    riskRange: "High",
    city: "Pattaya",
    touristInput: "A jet ski or motorbike shop claims damage and demands cash now with no receipt or neutral inspection.",
    evidenceType: "Damage photo, rental contract, chat/cash demand, receipt refusal",
    signals: ["large cash demand", "no receipt or written estimate", "pressure to avoid neutral process"],
    trustPassDoes: "Separates legitimate damage documentation from pressure patterns and recommends written estimates, photos, and neutral help.",
    whyItMatters: "Legitimate damage claims need documentation. TrustPass guides tourists toward receipts, inspection, insurer/platform help, and safe escalation."
  },
  {
    id: "job-lure",
    title: "Fake job or casting emergency luring",
    riskLevel: "Emergency",
    riskRange: "Emergency",
    city: "Mae Sot",
    touristInput: "A recruiter offers paid casting, free pickup, secrecy, and travel toward Mae Sot or the border.",
    evidenceType: "WeChat/LINE chat, profile, phone number, pickup point, route instruction",
    signals: ["controlled pickup", "border travel", "secrecy or isolation", "informal recruiter"],
    trustPassDoes: "Treats the combination as a stop-now emergency and generates evidence to save for hotel, police, or embassy help.",
    whyItMatters: "This connects directly to the trust crisis around fake job/casting luring and cross-border scam-compound fears.",
    image: "/evidence/fake-casting-demo.png",
    imageAlt: "Synthetic chat evidence showing fake casting and border-travel luring"
  }
];

export const azureServices = [
  {
    title: "Azure OpenAI",
    description: "Uses the configured GPT-4o deployment for structured risk reasoning, safe next steps, Thai phrases, and incident reports."
  },
  {
    title: "Azure AI Document Intelligence",
    description: "Reads uploaded images and PDFs, then returns OCR text and evidence hints such as prices, accounts, places, and risky phrases."
  },
  {
    title: "TrustPass Grounding Layer",
    description: "Local deterministic tools check scope, evidence mismatch, taxi fares, food tiers, payment fraud, rental risk, and job-lure patterns before Azure OpenAI."
  },
  {
    title: "Regional Intelligence Dashboard",
    description: "Aggregates eligible Caution, High, and Emergency cases into demo intelligence for hotels, tourism operators, TAT, and tourist police."
  }
];

export const visualStories = [
  {
    title: "Menu price context",
    label: "Food / venue grounding",
    image: "/evidence/jay-fai-menu-demo.png",
    alt: "Synthetic premium restaurant menu evidence for food price verification",
    text: "High food prices are not automatically scams. TrustPass asks for venue context, then compares visible menu items against Bangkok food tiers."
  },
  {
    title: "Payment identity risk",
    label: "Tour / QR fraud",
    image: "/evidence/fake-tour-payment-demo.png",
    alt: "Synthetic mobile chat showing a fake tour payment request",
    text: "Full prepayment, personal accounts, missing license details, and urgency language are grounded as stronger payment-fraud signals.",
    imageClassName: "object-cover object-top"
  },
  {
    title: "QR account mismatch",
    label: "Restaurant payment",
    image: "/evidence/restaurant-qr-mismatch-demo.png",
    alt: "Synthetic restaurant QR payment evidence showing a personal account mismatch",
    text: "TrustPass flags when the restaurant name and QR payment account do not match, especially when the tourist is pressured to scan and pay immediately."
  },
  {
    title: "Document leverage",
    label: "Rental protection",
    image: "/evidence/rental-passport-demo.png",
    alt: "Synthetic rental document requesting original passport retention",
    text: "Passport retention and unclear deposit terms are treated as document-leverage risk, with safer alternatives suggested before conflict starts."
  }
];
