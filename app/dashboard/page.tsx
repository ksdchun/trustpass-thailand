"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, AlertTriangle, MapPin, Activity, ShieldAlert } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { ThailandHeatmap } from "@/components/ThailandHeatmap";

type IntelligenceReport = {
  id: string;
  timestamp: string;
  city: string;
  category: string;
  risk_level: string;
  risk_score: number;
  signal_count: number;
};

type IntelligenceData = {
  kpis: {
    totalChecks7d: number;
    emergencyCount7d: number;
    topCategory: string;
    mostAffectedCity: string;
  };
  cityStats: Record<string, { total: number; emergency: number; topCategory: string; maxRiskLevel: string }>;
  recentReports: IntelligenceReport[];
};

export default function DashboardPage() {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch("/api/intelligence");
      if (!res.ok) throw new Error("Failed to fetch");
      const jsonData = await res.json() as IntelligenceData;
      setData(jsonData);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

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
            Live · Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <header className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-azure">
            <Activity className="h-4 w-4" />
            Real-time Threat Intelligence
          </p>
          <h1 className="mt-2 text-3xl font-bold text-ink">B2G Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Live aggregated signals from tourist risk-checks across Thailand. Used by TAT and Tourist Police to monitor hotspots, identify emerging scam patterns, and deploy preventive resources.
          </p>
        </header>

        {isLoading && !data ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azure"></div>
          </div>
        ) : data ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-500">Total Checks (7d)</h3>
                  <BarChart3 className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-2 text-3xl font-bold text-slate-900">{data.kpis.totalChecks7d}</p>
              </div>
              <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-500">Emergency Cases (7d)</h3>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <p className="mt-2 text-3xl font-bold text-red-600">{data.kpis.emergencyCount7d}</p>
              </div>
              <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-500">Top Scam Category</h3>
                  <ShieldAlert className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-2 text-xl font-bold text-slate-900 truncate" title={data.kpis.topCategory}>
                  {data.kpis.topCategory.replace(/_/g, ' ')}
                </p>
              </div>
              <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-500">Most Affected City</h3>
                  <MapPin className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-2 text-xl font-bold text-slate-900">{data.kpis.mostAffectedCity}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Heatmap */}
              <div className="lg:col-span-1 bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm flex flex-col items-center">
                <h2 className="text-lg font-bold text-ink w-full mb-4">Risk Heatmap</h2>
                <div className="w-full max-w-sm">
                  <ThailandHeatmap cityStats={data.cityStats} />
                </div>
              </div>

              {/* Recent Reports */}
              <div className="lg:col-span-2 bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-ink">Recent Live Reports</h2>
                  <span className="text-xs text-slate-500">Showing last 10</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">City</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Risk Level</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {data.recentReports.map((report) => (
                        <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                            {formatTimeAgo(report.timestamp)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                            {report.city}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                            {report.category.replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskBadgeColor(report.risk_level)}`}>
                              {report.risk_level}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}