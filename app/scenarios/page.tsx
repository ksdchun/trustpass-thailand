import Link from "next/link";
import { ArrowRight, FileText, MapPin, ShieldAlert, Sparkles } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { scenarios } from "@/lib/demo-content";

// Maps scenario IDs in lib/demo-content.ts to chip IDs in components/TrustPassChat.tsx
// so the "Try this case" CTA can deep-link to /check?chip=...&autoplay=1.
const scenarioToChipId: Record<string, string> = {
  "job-lure": "wechat-casting",
  transport: "taxi-meter-broken",
  "rental-documents": "motorbike-passport",
  payment: "line-tour-payment",
  "food-menu": "jay-fai-menu",
  "rental-damage": "motorbike-passport",
};

function buildChipHref(scenarioId: string): string {
  const chipId = scenarioToChipId[scenarioId];
  if (!chipId) return "/check";
  return `/check?chip=${encodeURIComponent(chipId)}&autoplay=1`;
}

export default function ScenariosPage() {
  return (
    <main>
      <SiteNav />
      <section className="border-b border-fluent-border bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-wide text-azure">Guided product scenarios</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-bold text-ink">Major tourist scam categories TrustPass can detect.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-fluent-muted">
            Each category shows how the product combines situation details, evidence extraction, grounded risk checks, clarification, Thai phrase support, and incident reporting. Tap <strong>Try this case</strong> to autoplay the matching scenario in Risk Check.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:px-8">
        {scenarios.map((scenario, index) => {
          const tryHref = buildChipHref(scenario.id);
          return (
            <article key={scenario.id} className="grid gap-5 rounded-[8px] border border-fluent-border bg-white p-5 shadow-sm lg:grid-cols-[220px_1fr_280px]">
              <div>
                <p className="text-sm font-bold text-azure">Scenario {index + 1}</p>
                <h2 className="mt-2 text-2xl font-bold text-ink">{scenario.title}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-fluent-border bg-fluent-canvas px-3 py-1 text-xs font-bold text-fluent-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    {scenario.city}
                  </span>
                  <RiskPill level={scenario.riskLevel} />
                  <span className="inline-flex rounded-full border border-fluent-border bg-white px-3 py-1 text-xs font-bold text-fluent-muted">
                    {scenario.riskRange}
                  </span>
                </div>
                <Link
                  href={tryHref}
                  className="mt-5 inline-flex items-center gap-2 rounded-[8px] bg-azure px-4 py-2 text-sm font-bold text-white transition hover:bg-fluent-blueDark"
                >
                  <Sparkles className="h-4 w-4" />
                  Try this case
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid gap-4">
                <Block title="What a tourist might ask" text={scenario.touristInput} />
                <Block title="Evidence type" text={scenario.evidenceType} />
                <Block title="What TrustPass does" text={scenario.trustPassDoes} />
                <Block title="Why it matters" text={scenario.whyItMatters} />
              </div>
              <div className="rounded-[8px] border border-fluent-border bg-fluent-canvas p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  <ShieldAlert className="h-4 w-4 text-azure" />
                  Detected signals
                </p>
                <div className="mt-3 grid gap-2">
                  {scenario.signals.map((signal) => (
                    <span key={signal} className="rounded-[8px] bg-white px-3 py-2 text-sm text-fluent-muted">
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="border-t border-fluent-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-lg font-bold text-ink">Recommended walkthrough</p>
            <p className="mt-1 text-sm text-fluent-muted">Start with the WeChat casting hero case, then run a payment scenario, and finish with food/menu clarification to show grounding nuance.</p>
          </div>
          <Link href="/check?chip=wechat-casting&autoplay=1" className="inline-flex items-center gap-2 rounded-[8px] bg-azure px-5 py-3 text-sm font-bold text-white transition hover:bg-fluent-blueDark">
            Run hero scenario
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function Block({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[8px] border border-fluent-border bg-fluent-canvas p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-ink">
        <FileText className="h-4 w-4 text-azure" />
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-fluent-muted">{text}</p>
    </div>
  );
}

function RiskPill({ level }: { level: string }) {
  const styles: Record<string, string> = {
    Low: "border-green-200 bg-green-50 text-green-700",
    Caution: "border-yellow-200 bg-yellow-50 text-yellow-800",
    High: "border-orange-200 bg-orange-50 text-orange-800",
    Emergency: "border-red-200 bg-red-50 text-red-700"
  };
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${styles[level]}`}>{level}</span>;
}
