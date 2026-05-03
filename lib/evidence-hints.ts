import type { EvidenceHints } from "@/lib/types";

const riskyPhrasePatterns = [
  "full payment",
  "deposit now",
  "personal account",
  "no license",
  "meter broken",
  "original passport",
  "keep passport",
  "pay cash now",
  "no receipt",
  "do not tell",
  "keep secret",
  "driver will pick you up",
  "airport pickup",
  "mae sot",
  "border",
  "temple is closed",
  "gem shop"
];

const knownPlaces = [
  "Jay Fai",
  "Silom",
  "Siam Paragon",
  "Wat Pho",
  "Grand Palace",
  "Mae Sot",
  "Patong",
  "Chiang Mai"
];

export function extractEvidenceHints(text: string): EvidenceHints {
  const normalized = text.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();

  return {
    prices: unique(matches(normalized, /(?:฿\s*)?(?:\d{1,3}(?:,\d{3})+|\d{2,6})\s*(?:baht|thb|บาท|฿)?/gi).filter(looksLikePrice)).slice(0, 12),
    phone_numbers: unique(matches(normalized, /(?:\+66|0)\s?\d{1,2}[\s-]?\d{3,4}[\s-]?\d{3,4}/g)).slice(0, 8),
    account_names: unique(matches(normalized, /(?:account name|บัญชี|ชื่อบัญชี)\s*[:\-]?\s*([A-Za-zก-๙ .]{3,60})/gi).map(cleanLabel)).slice(0, 6),
    business_names: unique(matches(normalized, /(?:company|tour|restaurant|ร้าน|บริษัท)\s*[:\-]?\s*([A-Za-zก-๙0-9 .&'-]{3,60})/gi).map(cleanLabel)).slice(0, 8),
    place_names: knownPlaces.filter((place) => lower.includes(place.toLowerCase())),
    risky_phrases: riskyPhrasePatterns.filter((phrase) => lower.includes(phrase)),
    visible_dates: unique(matches(normalized, /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/gi)).slice(0, 6)
  };
}

function matches(text: string, pattern: RegExp) {
  return Array.from(text.matchAll(pattern), (match) => match[1] || match[0]).map((item) => item.trim());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function cleanLabel(value: string) {
  return value.replace(/\s{2,}/g, " ").replace(/[.,;]+$/, "").trim();
}

function looksLikePrice(value: string) {
  return /baht|thb|บาท|฿/i.test(value);
}
