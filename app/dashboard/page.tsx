"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building,
  ChevronRight,
  MapPin,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { ThailandHeatmap } from "@/components/ThailandHeatmap";

type IntelligenceReport = {
  id: string;
  timestamp: string;
  city: string;
  category: string;
  risk_level: string;
  risk_score: number;
  signal_count: number;
  suspicious_signals?: string[];
  safe_next_steps?: string[];
  thai_phrase?: string;
  contact_recommendation?: string;
  why_it_matters?: string;
  incident_report_summary?: { english: string; thai: string };
  trusted_operator?: {
    operator_name: string;
    status: string;
    tat_license?: string;
    operator_type?: string;
    city?: string;
  };
  community?: {
    similar_incident_count: number;
    window_days: number;
    location_label: string;
  };
};

type HotelReferralStats = {
  hotel: string;
  count: number;
  countThisWeek: number;
};

type RiskCounts = {
  Low: number;
  Caution: number;
  High: number;
  Emergency: number;
};

type CityStats = {
  total: number;
  emergency: number;
  topCategory: string;
  maxRiskLevel: string;
  mapRiskLevel?: string;
  averageRiskScore?: number;
  riskCounts?: Partial<RiskCounts>;
  categoryCounts?: Record<string, number>;
};

type IntelligenceData = {
  kpis: {
    totalChecks7d: number;
    emergencyCount7d: number;
    topCategory: string;
    mostAffectedCity: string;
    sessionChecks?: number;
  };
  cityStats: Record<string, CityStats>;
  recentReports: IntelligenceReport[];
  hotelReferrals?: HotelReferralStats[];
};

const SESSION_CASES_KEY = "trustpass-session-cases";
const FRESH_FLAG_KEY = "trustpass-fresh-report-ids";
const FRESH_DURATION_MS = 3500;

function DashboardContent() {
  const searchParams = useSearchParams();
  const filterPattern = searchParams?.get("pattern") || null;
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [drawerReport, setDrawerReport] = useState<IntelligenceReport | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const initialFreshRunRef = useRef(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch("/api/intelligence");
      if (!res.ok) throw new Error("Failed to fetch");
      const jsonData = await res.json() as IntelligenceData;
      const merged = mergeSessionData(jsonData, readSessionReports());
      setData(merged);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Pick up the just-submitted report (set in TrustPassChat via sessionStorage) and animate it.
  useEffect(() => {
    if (initialFreshRunRef.current) return;
    if (!data) return;
    initialFreshRunRef.current = true;

    let storedFresh: string[] = [];
    try {
      const rawFresh = window.sessionStorage.getItem(FRESH_FLAG_KEY);
      storedFresh = rawFresh ? JSON.parse(rawFresh) : [];
    } catch {
      storedFresh = [];
    }

    const sessionIds = readSessionReports().map((report) => report.id);
    const newest = sessionIds[0];
    const next = new Set<string>(storedFresh);
    if (newest && !next.has(newest)) next.add(newest);

    if (next.size === 0) return;
    setFreshIds(next);
    window.sessionStorage.setItem(FRESH_FLAG_KEY, JSON.stringify(Array.from(next)));

    const timer = window.setTimeout(() => {
      setFreshIds(new Set());
      window.sessionStorage.removeItem(FRESH_FLAG_KEY);
    }, FRESH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [data]);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "low": return "bg-green-100 text-green-800 border-green-200";
      case "caution": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "emergency": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const filteredReports = useMemo(() => {
    if (!data) return [] as IntelligenceReport[];
    if (!filterPattern) return data.recentReports;
    return data.recentReports.filter((report) => report.category === filterPattern);
  }, [data, filterPattern]);

  return (
    <main className="min-h-screen bg-slate-50">
      <SiteNav />
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-5">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-azure hover:text-fluent-blueDark">
            <ArrowLeft className="h-4 w-4" />
            Back to overview
          </Link>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <header className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-azure">
            <Activity className="h-4 w-4" />
            Real-time threat intelligence
          </p>
          <h1 className="mt-2 text-3xl font-bold text-ink">B2G Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Live aggregated Caution, High, and Emergency signals from tourist risk-checks across Thailand. Used by TAT and Tourist Police to monitor hotspots, identify emerging scam patterns, and deploy preventive resources.
          </p>
          {filterPattern && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-azure/30 bg-blue-50 px-3 py-1 text-xs font-semibold text-azure">
              <ShieldAlert className="h-3.5 w-3.5" />
              Filtered to pattern: {filterPattern.replace(/_/g, ' ')}
              <Link href="/dashboard" className="ml-1 text-azure underline">Clear</Link>
            </div>
          )}
        </header>

        {isLoading && !data ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azure"></div>
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiCard label="Tracked cases (7d)" value={data.kpis.totalChecks7d.toString()} icon={<BarChart3 className="h-4 w-4 text-slate-400" />} />
              <KpiCard label="Emergency cases (7d)" value={data.kpis.emergencyCount7d.toString()} icon={<AlertTriangle className="h-4 w-4 text-red-500" />} valueClass="text-red-600" />
              <KpiCard label="Top scam category" value={data.kpis.topCategory.replace(/_/g, ' ')} icon={<ShieldAlert className="h-4 w-4 text-slate-400" />} small />
              <KpiCard label="Most affected city" value={data.kpis.mostAffectedCity} icon={<MapPin className="h-4 w-4 text-slate-400" />} small />
            </div>

            <div className="mb-6 rounded-[8px] border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex flex-wrap items-center gap-2">
              <span className="font-bold">{data.kpis.sessionChecks || 0} session checks</span>
              <span className="text-blue-700">with Caution or higher risk are included in this browser session.</span>
              {data.hotelReferrals && data.hotelReferrals.length > 0 && (
                <span className="ml-auto text-xs text-blue-800">
                  Top hotel partner this week:{" "}
                  <strong>{data.hotelReferrals[0].hotel}</strong>{" "}
                  &middot; {data.hotelReferrals[0].countThisWeek} {data.hotelReferrals[0].countThisWeek === 1 ? "check" : "checks"}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm flex flex-col items-center">
                <h2 className="text-lg font-bold text-ink w-full mb-4">Risk heatmap</h2>
                <div className="w-full max-w-sm">
                  <ThailandHeatmap cityStats={data.cityStats} />
                </div>
                {data.hotelReferrals && data.hotelReferrals.length > 0 && (
                  <div className="mt-6 w-full">
                    <p className="flex items-center gap-2 text-sm font-bold text-ink">
                      <Building className="h-4 w-4 text-azure" />
                      Hotel partner referrals
                    </p>
                    <ul className="mt-2 grid gap-1.5">
                      {data.hotelReferrals.slice(0, 5).map((entry) => (
                        <li key={entry.hotel} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                          <span className="font-semibold text-slate-800">{entry.hotel}</span>
                          <span>{entry.countThisWeek} this week · {entry.count} total</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-ink">Recent live reports</h2>
                  <span className="text-xs text-slate-500">Showing last 10</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">City</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Risk level</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {filteredReports.map((report) => {
                        const isFresh = freshIds.has(report.id);
                        return (
                          <tr
                            key={report.id}
                            data-fresh={isFresh ? "true" : undefined}
                            className={`dashboard-report-row cursor-pointer transition-colors hover:bg-slate-50 ${isFresh ? "bg-blue-50 animate-pulse-emergency" : ""}`}
                            onClick={() => setDrawerReport(report)}
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                              {isFresh && <span className="mr-2 inline-flex items-center rounded-full bg-azure px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">New</span>}
                              {formatTimeAgo(report.timestamp)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{report.city}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{report.category.replace(/_/g, ' ')}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskBadgeColor(report.risk_level)}`}>
                                {report.risk_level}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
                            </td>
                          </tr>
                        );
                      })}
                      {filteredReports.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                            No reports match the current filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {drawerReport && (
        <IncidentReportDrawer report={drawerReport} onClose={() => setDrawerReport(null)} />
      )}
      <SiteFooter />
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" aria-hidden />}>
      <DashboardContent />
    </Suspense>
  );
}

function KpiCard({
  label,
  value,
  icon,
  valueClass,
  small,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClass?: string;
  small?: boolean;
}) {
  return (
    <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500">{label}</h3>
        {icon}
      </div>
      <p className={`mt-2 ${small ? "text-xl" : "text-3xl"} font-bold ${valueClass || "text-slate-900"} ${small ? "truncate" : ""}`} title={value}>
        {value}
      </p>
    </div>
  );
}

function IncidentReportDrawer({ report, onClose }: { report: IntelligenceReport; onClose: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const summary = report.incident_report_summary;
  const signals = report.suspicious_signals || [];
  const steps = report.safe_next_steps || [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Incident report detail"
    >
      <aside
        className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-azure">Live report</p>
            <h2 className="mt-1 text-lg font-bold text-ink">
              {report.category.replace(/_/g, ' ')} · {report.city}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {new Date(report.timestamp).toLocaleString()} · risk score {report.risk_score}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5">
          {report.trusted_operator && (
            <DetailSection title="Operator verification">
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">{report.trusted_operator.operator_name}</span>
                {" "}— status: {report.trusted_operator.status.replace(/_/g, ' ')}
                {report.trusted_operator.tat_license && <> · {report.trusted_operator.tat_license}</>}
              </p>
            </DetailSection>
          )}

          {report.community && (
            <DetailSection title="Community signal">
              <p className="text-sm text-slate-700">
                <Users className="mr-1 inline-block h-3.5 w-3.5 text-azure" />
                {report.community.similar_incident_count} similar incidents near {report.community.location_label} in the last {report.community.window_days} days.
              </p>
            </DetailSection>
          )}

          <DetailSection title="Why this is risky">
            <p className="text-sm leading-relaxed text-slate-700">
              {report.why_it_matters || "No detailed write-up was attached to this report. Open the source check for the full Azure response."}
            </p>
          </DetailSection>

          <DetailSection title="Detected signals">
            {signals.length > 0 ? (
              <ul className="grid gap-1.5 text-sm text-slate-700">
                {signals.map((signal) => (
                  <li key={signal} className="flex items-start gap-2">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-azure" />
                    <span className="leading-relaxed">{signal}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No signal list attached to this report.</p>
            )}
          </DetailSection>

          <DetailSection title="Recommended next steps">
            {steps.length > 0 ? (
              <ol className="grid gap-1.5 text-sm text-slate-700">
                {steps.map((step, idx) => (
                  <li key={`${idx}-${step.slice(0, 16)}`} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">{idx + 1}</span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">No action plan attached.</p>
            )}
          </DetailSection>

          {report.thai_phrase && (
            <DetailSection title="Thai phrase">
              <p className="rounded-md bg-blue-50 px-3 py-2 text-base font-semibold text-azure">
                {report.thai_phrase}
              </p>
            </DetailSection>
          )}

          {report.contact_recommendation && (
            <DetailSection title="Contact recommendation">
              <p className="text-sm leading-relaxed text-slate-700">{report.contact_recommendation}</p>
            </DetailSection>
          )}

          {summary && (
            <DetailSection title="Incident report (English)">
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{summary.english}</p>
            </DetailSection>
          )}

          {summary && summary.thai && (
            <DetailSection title="Incident report (Thai)">
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{summary.thai}</p>
            </DetailSection>
          )}
        </div>
      </aside>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      {children}
    </section>
  );
}

function readSessionReports(): IntelligenceReport[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(SESSION_CASES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((report): report is IntelligenceReport => (
      typeof report?.id === "string" &&
      typeof report.timestamp === "string" &&
      typeof report.city === "string" &&
      typeof report.category === "string" &&
      typeof report.risk_level === "string" &&
      report.risk_level.toLowerCase() !== "low" &&
      typeof report.risk_score === "number" &&
      typeof report.signal_count === "number"
    ));
  } catch {
    return [];
  }
}

function mergeSessionData(seedData: IntelligenceData, sessionReports: IntelligenceReport[]): IntelligenceData {
  const eligibleSessionReports = sessionReports.filter((report) => report.risk_level.toLowerCase() !== "low");

  if (eligibleSessionReports.length === 0) {
    return {
      ...seedData,
      kpis: {
        ...seedData.kpis,
        sessionChecks: 0
      }
    };
  }

  const recentSessionReports = eligibleSessionReports.filter(isWithin7Days);
  const cityStats = mergeCityStats(seedData.cityStats, eligibleSessionReports);

  return {
    kpis: {
      totalChecks7d: seedData.kpis.totalChecks7d + recentSessionReports.length,
      emergencyCount7d: seedData.kpis.emergencyCount7d + recentSessionReports.filter((report) => report.risk_level.toLowerCase() === "emergency").length,
      topCategory: topCategoryWithSession(seedData.kpis.topCategory, recentSessionReports),
      mostAffectedCity: topCityFromStats(cityStats),
      sessionChecks: eligibleSessionReports.length
    },
    cityStats,
    recentReports: [...eligibleSessionReports, ...seedData.recentReports.filter((report) => report.risk_level.toLowerCase() !== "low")]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10),
    hotelReferrals: seedData.hotelReferrals,
  };
}

function countBy(reports: IntelligenceReport[], getKey: (report: IntelligenceReport) => string) {
  return reports.reduce<Record<string, number>>((counts, report) => {
    const key = getKey(report);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function topKey(counts: Record<string, number>) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
}

function topCategoryWithSession(seedTopCategory: string, sessionReports: IntelligenceReport[]) {
  const sessionTop = topKey(countBy(sessionReports, (report) => report.category));
  return sessionTop === "N/A" ? seedTopCategory : sessionTop;
}

function topCityFromStats(cityStats: IntelligenceData["cityStats"]) {
  return Object.entries(cityStats).sort((a, b) => b[1].total - a[1].total)[0]?.[0] || "N/A";
}

function mergeCityStats(seedStats: IntelligenceData["cityStats"], sessionReports: IntelligenceReport[]): IntelligenceData["cityStats"] {
  const merged: IntelligenceData["cityStats"] = Object.fromEntries(
    Object.entries(seedStats).map(([city, stats]) => [city, normalizeCityStats(stats)])
  );
  const sessionByCity = sessionReports.reduce<Record<string, IntelligenceReport[]>>((groups, report) => {
    groups[report.city] ??= [];
    groups[report.city].push(report);
    return groups;
  }, {});

  for (const [city, reports] of Object.entries(sessionByCity)) {
    const current = merged[city] || normalizeCityStats({ total: 0, emergency: 0, topCategory: "N/A", maxRiskLevel: "Low" });
    const sessionMaxScore = Math.max(...reports.map((report) => report.risk_score));
    const total = current.total + reports.length;
    const riskCounts = { ...normalizeRiskCounts(current.riskCounts, current.emergency) };
    const categoryCounts = { ...(current.categoryCounts || {}) };
    let riskScoreTotal = (current.averageRiskScore || riskScoreFromLevel(current.mapRiskLevel || current.maxRiskLevel)) * current.total;

    for (const report of reports) {
      riskCounts[riskBucket(report.risk_level)] += 1;
      categoryCounts[report.category] = (categoryCounts[report.category] || 0) + 1;
      riskScoreTotal += report.risk_score;
    }

    const averageRiskScore = total > 0 ? riskScoreTotal / total : 0;

    merged[city] = {
      total,
      emergency: riskCounts.Emergency,
      topCategory: topKey(categoryCounts),
      maxRiskLevel: higherRiskLevel(current.maxRiskLevel, riskLevelFromScore(sessionMaxScore)),
      mapRiskLevel: dominantRiskLevel(riskCounts),
      averageRiskScore,
      riskCounts,
      categoryCounts
    };
  }

  return merged;
}

function normalizeCityStats(stats: CityStats): CityStats {
  const riskCounts = normalizeRiskCounts(stats.riskCounts, stats.emergency);
  const categoryCounts = stats.categoryCounts || (stats.topCategory !== "N/A" ? { [stats.topCategory]: stats.total } : {});
  const averageRiskScore = stats.averageRiskScore ?? riskScoreFromCounts(riskCounts, stats.total, stats.maxRiskLevel);

  return {
    ...stats,
    riskCounts,
    categoryCounts,
    averageRiskScore,
    mapRiskLevel: stats.mapRiskLevel || dominantRiskLevel(riskCounts)
  };
}

function normalizeRiskCounts(counts?: Partial<RiskCounts>, emergency = 0): RiskCounts {
  return {
    Low: counts?.Low || 0,
    Caution: counts?.Caution || 0,
    High: counts?.High || 0,
    Emergency: counts?.Emergency ?? emergency
  };
}

function riskBucket(level: string): keyof RiskCounts {
  switch (level.toLowerCase()) {
    case "emergency": return "Emergency";
    case "high": return "High";
    case "caution": return "Caution";
    default: return "Low";
  }
}

function riskScoreFromCounts(counts: RiskCounts, total: number, fallbackLevel: string) {
  if (total <= 0) return riskScoreFromLevel(fallbackLevel);
  return (
    counts.Low * riskScoreFromLevel("Low") +
    counts.Caution * riskScoreFromLevel("Caution") +
    counts.High * riskScoreFromLevel("High") +
    counts.Emergency * riskScoreFromLevel("Emergency")
  ) / total;
}

function dominantRiskLevel(counts: RiskCounts) {
  const order: Array<keyof RiskCounts> = ["Emergency", "High", "Caution", "Low"];
  return order.sort((a, b) => counts[b] - counts[a])[0];
}

function isWithin7Days(report: IntelligenceReport) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return new Date(report.timestamp) >= sevenDaysAgo;
}

function higherRiskLevel(a: string, b: string) {
  return riskScoreFromLevel(a) >= riskScoreFromLevel(b) ? a : b;
}

function riskLevelFromScore(score: number) {
  if (score >= 90) return "Emergency";
  if (score >= 70) return "High";
  if (score >= 45) return "Caution";
  return "Low";
}

function riskScoreFromLevel(level: string) {
  if (level.toLowerCase() === "emergency") return 90;
  if (level.toLowerCase() === "high") return 70;
  if (level.toLowerCase() === "caution") return 45;
  return 20;
}
