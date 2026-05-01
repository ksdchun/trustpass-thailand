"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, MapPin, ShieldAlert } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import demoCases from "@/data/demo_cases.json";

type DashboardCase = {
  city: string;
  category: string;
  riskLevel: string;
  signals: string[];
  createdAt?: string;
};

export default function DashboardPage() {
  const [cases, setCases] = useState<DashboardCase[]>(demoCases as DashboardCase[]);

  useEffect(() => {
    const stored = JSON.parse(window.localStorage.getItem("trustpass-cases") || "[]") as DashboardCase[];
    if (stored.length) setCases([...stored, ...(demoCases as DashboardCase[])]);
  }, []);

  const cityCounts = useMemo(() => countBy(cases, "city"), [cases]);
  const categoryCounts = useMemo(() => countBy(cases, "category"), [cases]);
  const riskCounts = useMemo(() => countBy(cases, "riskLevel"), [cases]);
  const signalCounts = useMemo(() => countSignals(cases), [cases]);

  return (
    <main className="min-h-screen">
      <SiteNav />
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-azure hover:text-fluent-blueDark">
          <ArrowLeft className="h-4 w-4" />
          Back to overview
        </Link>

        <header className="rounded-[8px] border border-slate-200 bg-white/90 p-6 shadow-soft">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-azure">
            <BarChart3 className="h-4 w-4" />
            Hotel / TAT / Tourist Police Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Tourism trust intelligence</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Individual tourist checks become structured signals for scam categories, hotspot cities, and common risk patterns. This is the B2B/B2G transformation layer for hotels, TAT, tourist police, and legitimate operators.
          </p>
        </header>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <Metric title="Total checks" value={cases.length.toString()} />
          <Metric title="High or emergency" value={cases.filter((item) => ["High", "Emergency"].includes(item.riskLevel)).length.toString()} />
          <Metric title="Cities covered" value={Object.keys(cityCounts).length.toString()} />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <Panel title="Cases by city" icon={<MapPin className="h-4 w-4" />}>
            <BarList data={cityCounts} />
          </Panel>
          <Panel title="Risk levels" icon={<ShieldAlert className="h-4 w-4" />}>
            <BarList data={riskCounts} />
          </Panel>
          <Panel title="Scam categories" icon={<BarChart3 className="h-4 w-4" />}>
            <BarList data={categoryCounts} />
          </Panel>
          <Panel title="Common suspicious signals" icon={<ShieldAlert className="h-4 w-4" />}>
            <BarList data={signalCounts} />
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-[8px] border border-slate-200 bg-white/90 p-5 shadow-soft">
          <h2 className="text-lg font-bold text-ink">Recent checks</h2>
          <div className="mt-4 grid gap-3">
            {cases.slice(0, 8).map((item, index) => (
              <div key={`${item.category}-${index}`} className="grid gap-2 rounded-[8px] border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[120px_1fr_120px] sm:items-center">
                <span className="text-sm font-semibold text-azure">{item.city}</span>
                <span className="text-sm text-ink">{item.category}</span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-center text-xs font-bold text-slate-700">{item.riskLevel}</span>
              </div>
            ))}
          </div>
          </div>
          <div className="rounded-[8px] border border-blue-100 bg-[#EAF4FE] p-5 shadow-soft">
            <h2 className="text-lg font-bold text-ink">Operational value</h2>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-fluent-muted">
              <p>Hotels can triage guest concerns faster with structured summaries.</p>
              <p>TAT and local offices can see which scam categories damage trust.</p>
              <p>Tourist police can receive cleaner evidence packs instead of fragmented screenshots.</p>
              <p>Verified operators can be distinguished from risky or unknown actors.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-fluent-border bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-2 text-4xl font-bold text-ink">{value}</p>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[8px] border border-fluent-border bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
        {icon}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function BarList({ data }: { data: Record<string, number> }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div className="grid gap-3">
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-slate-700">{key}</span>
            <span className="text-slate-500">{value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-azure" style={{ width: `${(value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function countBy(items: DashboardCase[], key: "city" | "category" | "riskLevel") {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}

function countSignals(items: DashboardCase[]) {
  return items.flatMap((item) => item.signals).reduce<Record<string, number>>((acc, signal) => {
    acc[signal] = (acc[signal] || 0) + 1;
    return acc;
  }, {});
}
