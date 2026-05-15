import { randomUUID } from "crypto";
import { RiskCheckResult } from "./types";

export type IntelligenceReport = {
  id: string;
  timestamp: Date;
  city: string;
  category: string;
  risk_level: string;
  risk_score: number;
  signal_count: number;
  referrer?: string;
};

type RiskCounts = {
  Low: number;
  Caution: number;
  High: number;
  Emergency: number;
};

export type CityIntelligenceStats = {
  total: number;
  emergency: number;
  topCategory: string;
  maxRiskLevel: string;
  mapRiskLevel: string;
  averageRiskScore: number;
  riskCounts: RiskCounts;
  categoryCounts: Record<string, number>;
};

declare global {
  // eslint-disable-next-line no-var
  var __trustpassStore: IntelligenceReport[] | undefined;
  // eslint-disable-next-line no-var
  var __trustpassHotelReferrals: Record<string, HotelReferralEntry> | undefined;
}

export type HotelReferralEntry = {
  hotel: string;
  count: number;
  recentTimestamps: string[];
};

const getRiskScore = (level: string): number => {
  switch (level.toLowerCase()) {
    case "low": return 20;
    case "caution": return 45;
    case "high": return 70;
    case "emergency": return 90;
    default: return 0;
  }
};

const getRiskLevelFromScore = (score: number): string => {
  if (score >= 90) return "Emergency";
  if (score >= 70) return "High";
  if (score >= 45) return "Caution";
  return "Low";
};

const getRiskBucket = (level: string): keyof RiskCounts => {
  switch (level.toLowerCase()) {
    case "emergency": return "Emergency";
    case "high": return "High";
    case "caution": return "Caution";
    default: return "Low";
  }
};

const getDominantRiskLevel = (counts: RiskCounts): string => {
  const order: Array<keyof RiskCounts> = ["Emergency", "High", "Caution", "Low"];
  return order.sort((a, b) => counts[b] - counts[a])[0];
};

const generatePastDate = (maxDaysAgo: number): Date => {
  const date = new Date();
  const daysAgo = Math.random() * maxDaysAgo;
  date.setDate(date.getDate() - daysAgo);
  return date;
};

const createMockReport = (city: string, category: string, level: string, maxDaysAgo: number): IntelligenceReport => ({
  id: randomUUID(),
  timestamp: generatePastDate(maxDaysAgo),
  city,
  category,
  risk_level: level,
  risk_score: getRiskScore(level),
  signal_count: Math.floor(Math.random() * 3) + 2,
});

const seedReports = (): IntelligenceReport[] => {
  const reports: IntelligenceReport[] = [];

  // Bangkok
  for (let i = 0; i < 12; i++) reports.push(createMockReport("Bangkok", "taxi_overcharging", "High", 7));
  for (let i = 0; i < 10; i++) reports.push(createMockReport("Bangkok", "tour_payment_fraud", "Caution", 7));
  for (let i = 0; i < 5; i++) reports.push(createMockReport("Bangkok", "fake_job_luring", "Emergency", 7));
  for (let i = 0; i < 5; i++) reports.push(createMockReport("Bangkok", "rental_passport_retention", "High", 7));
  for (let i = 0; i < 3; i++) reports.push(createMockReport("Bangkok", "qr_payment_fraud", "Caution", 7));

  // Phuket
  for (let i = 0; i < 5; i++) reports.push(createMockReport("Phuket", "rental_passport_retention", "High", 7));
  for (let i = 0; i < 3; i++) reports.push(createMockReport("Phuket", "tour_payment_fraud", "Caution", 7));

  // Pattaya
  for (let i = 0; i < 4; i++) reports.push(createMockReport("Pattaya", "tour_payment_fraud", "Caution", 7));
  for (let i = 0; i < 3; i++) reports.push(createMockReport("Pattaya", "taxi_overcharging", "High", 7));

  // Chiang Mai
  for (let i = 0; i < 2; i++) reports.push(createMockReport("Chiang Mai", "tour_payment_fraud", "Caution", 7));
  for (let i = 0; i < 2; i++) reports.push(createMockReport("Chiang Mai", "rental_passport_retention", "High", 7));
  for (let i = 0; i < 1; i++) reports.push(createMockReport("Chiang Mai", "fake_job_luring", "Emergency", 7));

  // Mae Sot — emphasis on fake-job-luring corridor (hero scenario backing).
  for (let i = 0; i < 4; i++) reports.push(createMockReport("Mae Sot", "fake_job_luring", "Emergency", 2));
  for (let i = 0; i < 3; i++) reports.push(createMockReport("Mae Sot", "fake_job_luring", "Emergency", 6));

  // Krabi
  for (let i = 0; i < 2; i++) reports.push(createMockReport("Krabi", "tour_payment_fraud", "Caution", 7));

  // Koh Samui
  for (let i = 0; i < 2; i++) reports.push(createMockReport("Koh Samui", "tour_payment_fraud", "Caution", 7));

  // Chiang Rai
  for (let i = 0; i < 1; i++) reports.push(createMockReport("Chiang Rai", "tour_payment_fraud", "Caution", 7));
  for (let i = 0; i < 2; i++) reports.push(createMockReport("Chiang Rai", "fake_job_luring", "Emergency", 7));

  return reports.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

export const store = globalThis.__trustpassStore ??= seedReports();
const hotelReferrals: Record<string, HotelReferralEntry> = globalThis.__trustpassHotelReferrals ??= {};

export const isIntelligenceEligible = (result: RiskCheckResult): boolean => {
  if (result.risk_level === "Low") return false;
  if (result.category === "No strong scam pattern detected") return false;
  if (result.category === "Outside TrustPass scope") return false;
  if (result.category === "Evidence mismatch") return false;
  return true;
};

const isReportEligible = (report: IntelligenceReport): boolean => {
  if (report.risk_level.toLowerCase() === "low") return false;
  if (report.category === "No strong scam pattern detected") return false;
  if (report.category === "Outside TrustPass scope") return false;
  if (report.category === "Evidence mismatch") return false;
  return true;
};

export type RecordCheckOptions = {
  referrer?: string;
};

export const recordCheck = (result: RiskCheckResult, city: string, options?: RecordCheckOptions): void => {
  if (!isIntelligenceEligible(result)) return;

  const newReport: IntelligenceReport = {
    id: randomUUID(),
    timestamp: new Date(),
    city,
    category: result.category,
    risk_level: result.risk_level,
    risk_score: getRiskScore(result.risk_level),
    signal_count: result.suspicious_signals?.length || 0,
    referrer: options?.referrer,
  };
  store.unshift(newReport);

  if (options?.referrer) {
    const hotelName = parseHotelReferrer(options.referrer);
    if (hotelName) recordHotelReferral(hotelName);
  }
};

export const getRecentReports = (limit = 10): IntelligenceReport[] => {
  return store.filter(isReportEligible).slice(0, limit);
};

export const getCityStats = (): Record<string, CityIntelligenceStats> => {
  const stats: Record<string, {
    total: number;
    emergency: number;
    categoryCounts: Record<string, number>;
    riskCounts: RiskCounts;
    maxRiskScore: number;
    riskScoreTotal: number;
  }> = {};

  store.filter(isReportEligible).forEach(report => {
    if (!stats[report.city]) {
      stats[report.city] = {
        total: 0,
        emergency: 0,
        categoryCounts: {},
        riskCounts: { Low: 0, Caution: 0, High: 0, Emergency: 0 },
        maxRiskScore: 0,
        riskScoreTotal: 0
      };
    }
    const cityStat = stats[report.city];

    cityStat.total += 1;
    const riskBucket = getRiskBucket(report.risk_level);
    cityStat.riskCounts[riskBucket] += 1;
    if (riskBucket === "Emergency") {
      cityStat.emergency += 1;
    }

    cityStat.categoryCounts[report.category] = (cityStat.categoryCounts[report.category] || 0) + 1;
    cityStat.riskScoreTotal += report.risk_score;

    if (report.risk_score > cityStat.maxRiskScore) {
      cityStat.maxRiskScore = report.risk_score;
    }
  });

  const finalStats: Record<string, CityIntelligenceStats> = {};

  for (const city in stats) {
    const cityData = stats[city];
    let topCategory = "";
    let maxCount = 0;

    for (const category in cityData.categoryCounts) {
      if (cityData.categoryCounts[category] > maxCount) {
        maxCount = cityData.categoryCounts[category];
        topCategory = category;
      }
    }

    const maxRiskLevel = getRiskLevelFromScore(cityData.maxRiskScore);
    const averageRiskScore = cityData.total > 0 ? cityData.riskScoreTotal / cityData.total : 0;

    finalStats[city] = {
      total: cityData.total,
      emergency: cityData.emergency,
      topCategory,
      maxRiskLevel,
      mapRiskLevel: getDominantRiskLevel(cityData.riskCounts),
      averageRiskScore,
      riskCounts: cityData.riskCounts,
      categoryCounts: cityData.categoryCounts
    };
  }

  return finalStats;
};

export const getKPIs = (): { totalChecks7d: number; emergencyCount7d: number; topCategory: string; mostAffectedCity: string } => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let totalChecks7d = 0;
  let emergencyCount7d = 0;
  const categoryCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};

  store.filter(isReportEligible).forEach(report => {
    if (report.timestamp >= sevenDaysAgo) {
      totalChecks7d++;
      if (report.risk_level.toLowerCase() === "emergency") {
        emergencyCount7d++;
      }

      categoryCounts[report.category] = (categoryCounts[report.category] || 0) + 1;
      cityCounts[report.city] = (cityCounts[report.city] || 0) + 1;
    }
  });

  let topCategory = "N/A";
  let maxCategoryCount = 0;
  for (const category in categoryCounts) {
    if (categoryCounts[category] > maxCategoryCount) {
      maxCategoryCount = categoryCounts[category];
      topCategory = category;
    }
  }

  let mostAffectedCity = "N/A";
  let maxCityCount = 0;
  for (const city in cityCounts) {
    if (cityCounts[city] > maxCityCount) {
      maxCityCount = cityCounts[city];
      mostAffectedCity = city;
    }
  }

  return { totalChecks7d, emergencyCount7d, topCategory, mostAffectedCity };
};

export const getAllReports = (): IntelligenceReport[] => {
  return store.filter(isReportEligible);
};

const cityLocationAliases: Record<string, string[]> = {
  bangkok: ["bangkok", "krung thep", "bkk"],
  phuket: ["phuket", "patong"],
  pattaya: ["pattaya"],
  "chiang mai": ["chiang mai", "nimman"],
  "chiang rai": ["chiang rai"],
  krabi: ["krabi"],
  "koh samui": ["koh samui", "samui"],
  "mae sot": ["mae sot", "border", "myanmar", "tak province"],
};

function locationMatches(reportCity: string, candidate: string): boolean {
  const reportLower = reportCity.toLowerCase();
  const candidateLower = candidate.toLowerCase();
  if (reportLower === candidateLower) return true;
  if (reportLower.includes(candidateLower) || candidateLower.includes(reportLower)) return true;

  const aliases = cityLocationAliases[reportLower] || [];
  return aliases.some((alias) => candidateLower.includes(alias));
}

export type SimilarIncidentCountOptions = {
  category?: string;
  cityOrLocation?: string;
  windowDays: number;
};

export type SimilarIncidentCountResult = {
  count: number;
  location_label: string;
};

/**
 * Count recent reports that look similar to the just-submitted situation.
 * Used to render the "N similar incidents in the last X days near {location}"
 * community-corroboration line in the result panel.
 */
export const getSimilarIncidentCount = (
  opts: SimilarIncidentCountOptions,
): SimilarIncidentCountResult => {
  const windowDays = Math.max(1, opts.windowDays);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);

  const requestedLocation = opts.cityOrLocation?.trim();
  const requestedCategory = opts.category?.trim();

  const matches = store.filter((report) => {
    if (!isReportEligible(report)) return false;
    if (report.timestamp < cutoff) return false;
    if (requestedCategory && report.category !== requestedCategory) return false;
    if (requestedLocation && !locationMatches(report.city, requestedLocation)) return false;
    return true;
  });

  const fallbackLabel = requestedLocation || "your area";
  let resolvedLabel = fallbackLabel;
  if (requestedLocation) {
    const cityHit = matches.find((report) => report.city.toLowerCase() === requestedLocation.toLowerCase());
    if (cityHit) resolvedLabel = cityHit.city;
    else if (matches.length > 0) resolvedLabel = `${matches[0].city} area`;
  } else if (matches.length > 0) {
    resolvedLabel = matches[0].city;
  }

  return {
    count: matches.length,
    location_label: resolvedLabel,
  };
};

export function parseHotelReferrer(referrer: string | undefined | null): string | null {
  if (!referrer) return null;
  const match = referrer.match(/^hotel:(.+)$/i);
  if (!match) return null;
  return match[1].replace(/[-_]+/g, " ").trim() || null;
}

function recordHotelReferral(hotelName: string) {
  const key = hotelName.toLowerCase();
  const now = new Date().toISOString();
  const existing = hotelReferrals[key] || { hotel: hotelName, count: 0, recentTimestamps: [] };
  existing.count += 1;
  existing.recentTimestamps = [now, ...existing.recentTimestamps].slice(0, 20);
  existing.hotel = hotelName;
  hotelReferrals[key] = existing;
}

/**
 * Standalone referral recorder used by the client-side fallback POST endpoint while
 * Agent B's analyze route does not yet thread the `referrer` field through to recordCheck.
 * Safe to call independently of recordCheck.
 */
export const recordReferralOnly = (referrer: string | null | undefined): boolean => {
  const hotelName = parseHotelReferrer(referrer ?? null);
  if (!hotelName) return false;
  recordHotelReferral(hotelName);
  return true;
};

export type HotelReferralStats = {
  hotel: string;
  count: number;
  countThisWeek: number;
};

export const getHotelReferralStats = (): HotelReferralStats[] => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return Object.values(hotelReferrals)
    .map((entry) => ({
      hotel: entry.hotel,
      count: entry.count,
      countThisWeek: entry.recentTimestamps.filter((iso) => new Date(iso) >= sevenDaysAgo).length,
    }))
    .sort((a, b) => b.countThisWeek - a.countThisWeek || b.count - a.count);
};
