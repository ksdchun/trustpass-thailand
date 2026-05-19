"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, Bot, FileText, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { scenarios, visualStories as visualStoriesBase } from "@/lib/demo-content";
import { useLanguage } from "@/lib/language-context";
import { translations } from "@/lib/translations";

export default function HomePage() {
  const { lang } = useLanguage();
  const t = translations[lang];
  return (
    <main>
      <SiteNav />
      <section className="border-b border-fluent-border bg-white">
        <div className="mx-auto grid max-w-7xl items-stretch gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-14">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-semibold text-azure">
              <Sparkles className="h-4 w-4" />
              {t.homeBadge}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              {t.homeH1}
            </h1>
            <p className="mt-4 max-w-2xl text-xl font-semibold text-fluent-muted">
              {t.homeSubtitle}
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-fluent-muted">
              {t.homeDesc}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/check" className="inline-flex items-center gap-2 rounded-[8px] bg-azure px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-fluent-blueDark">
                {t.tryRiskCheck}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-[8px] border border-fluent-border bg-white px-5 py-3 text-sm font-bold text-ink transition hover:border-azure hover:text-azure">
                {t.viewDashboard}
                <BarChart3 className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="relative min-h-[360px] overflow-hidden rounded-[8px] border border-fluent-border bg-white shadow-soft lg:min-h-full">
            <Image
              src="/trustpass-hero-tourist-risk-check.png"
              alt="Tourist using TrustPass Thailand risk check with travel evidence context"
              fill
              priority
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {t.evidenceCards.map((card) => (
            <div key={card.label} className="rounded-[8px] border border-fluent-border bg-white p-5 shadow-sm">
              <p className="text-3xl font-bold text-azure">{card.value}</p>
              <p className="mt-2 text-sm font-bold text-ink">{card.label}</p>
              <p className="mt-2 text-sm leading-6 text-fluent-muted">{card.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-fluent-border bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-azure">{t.problemKicker}</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">{t.problemH2}</h2>
            <p className="mt-4 text-base leading-7 text-fluent-muted">{t.problemText}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {t.problemCards.map(([title, text]) => (
              <div key={title} className="rounded-[8px] border border-fluent-border bg-fluent-canvas p-5">
                <p className="font-bold text-ink">{title}</p>
                <p className="mt-2 text-sm leading-6 text-fluent-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-wide text-azure">{t.touristEvidenceKicker}</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-bold text-ink">{t.touristEvidenceH2}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-fluent-muted">{t.touristEvidenceDesc}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {t.visualStories.map((story, i) => (
            <article key={story.title} className="overflow-hidden rounded-[8px] border border-fluent-border bg-white shadow-sm">
              <div className="relative aspect-[2/3] bg-fluent-canvas">
                <Image src={visualStoriesBase[i].image} alt={visualStoriesBase[i].alt} fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw" className="object-contain" />
              </div>
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-azure">{story.label}</p>
                <h3 className="mt-2 text-lg font-bold text-ink">{story.title}</h3>
                <p className="mt-2 text-sm leading-6 text-fluent-muted">{story.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-azure">{t.liveProductKicker}</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">{t.liveProductH2}</h2>
          </div>
          <Link href="/scenarios" className="inline-flex items-center gap-2 rounded-[8px] border border-fluent-border bg-white px-4 py-2 text-sm font-bold text-ink transition hover:border-azure hover:text-azure">
            {t.seeAllScenarios}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario, i) => (
            <div key={scenario.id} className="rounded-[8px] border border-fluent-border bg-white p-5 shadow-sm">
              <RiskPill level={scenario.riskLevel} label={t.riskPillLabels[scenario.riskLevel]} />
              <h3 className="mt-4 text-lg font-bold text-ink">{t.scenarioCards[i]?.title ?? scenario.title}</h3>
              <p className="mt-3 text-sm leading-6 text-fluent-muted">{t.scenarioCards[i]?.touristInput ?? scenario.touristInput}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-fluent-border bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="self-start rounded-[8px] border border-fluent-border bg-white p-3 shadow-sm">
            <Image src="/trustpass-risk-ladder.png" alt="TrustPass scam risk ladder" width={1400} height={788} className="block h-auto w-full rounded-[8px] border border-fluent-border bg-white" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold uppercase tracking-wide text-azure">{t.whyNotChatGptKicker}</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">{t.whyNotChatGptH2}</h2>
            <div className="mt-5 grid gap-3">
              {t.whyNotCards.map(([title, text]) => (
                <div key={title} className="rounded-[8px] border border-fluent-border bg-white p-4">
                  <p className="font-bold text-ink">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-fluent-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6">
            <p className="text-sm font-bold uppercase tracking-wide text-azure">{t.aiStackKicker}</p>
          <h2 className="mt-2 text-3xl font-bold text-ink">{t.aiStackH2}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {t.azureServices.map((service) => (
            <div key={service.title} className="rounded-[8px] border border-fluent-border bg-white p-5 shadow-sm">
              <Bot className="h-6 w-6 text-azure" />
              <p className="mt-3 font-bold text-ink">{service.title}</p>
              <p className="mt-2 text-sm leading-6 text-fluent-muted">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-fluent-border bg-[#EAF4FE]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-azure">{t.productFlowKicker}</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">{t.productFlowH2}</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/check" className="inline-flex items-center gap-2 rounded-[8px] bg-azure px-5 py-3 text-sm font-bold text-white transition hover:bg-fluent-blueDark">
              {t.launchRiskCheck}
              <ShieldCheck className="h-4 w-4" />
            </Link>
            <Link href="/architecture" className="inline-flex items-center gap-2 rounded-[8px] border border-azure bg-white px-5 py-3 text-sm font-bold text-azure transition hover:bg-blue-50">
              {t.showArchitecture}
              <FileText className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function RiskPill({ level, label }: { level: string; label?: string }) {
  const styles: Record<string, string> = {
    Low: "border-green-200 bg-green-50 text-green-700",
    Caution: "border-yellow-200 bg-yellow-50 text-yellow-800",
    High: "border-orange-200 bg-orange-50 text-orange-800",
    Emergency: "border-red-200 bg-red-50 text-red-700"
  };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${styles[level]}`}>
      <ShieldAlert className="h-3.5 w-3.5" />
      {label ?? level}
    </span>
  );
}
