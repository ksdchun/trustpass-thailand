import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, Bot, FileText, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { azureServices, evidenceCards, scenarios, visualStories } from "@/lib/demo-content";

export default function HomePage() {
  return (
    <main>
      <SiteNav />
      <section className="border-b border-fluent-border bg-white">
        <div className="mx-auto grid max-w-7xl items-stretch gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-14">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-semibold text-azure">
              <Sparkles className="h-4 w-4" />
              Tourism trust infrastructure
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              TrustPass Thailand
            </h1>
            <p className="mt-4 max-w-2xl text-xl font-semibold text-fluent-muted">
              AI Scam & Fraud Shield for Tourists
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-fluent-muted">
              A universal chat interface where tourists can describe suspicious situations, attach evidence, and get Azure AI-powered risk signals, safe next steps, Thai phrases, and structured help reports before harm happens.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/check" className="inline-flex items-center gap-2 rounded-[8px] bg-azure px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-fluent-blueDark">
                Try Risk Check
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-[8px] border border-fluent-border bg-white px-5 py-3 text-sm font-bold text-ink transition hover:border-azure hover:text-azure">
                View Dashboard
                <BarChart3 className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="flex min-h-[360px] rounded-[8px] border border-fluent-border bg-fluent-canvas p-3 shadow-soft lg:min-h-full">
            <img src="/trustpass-product-flow-current.svg" alt="TrustPass Thailand product flow" className="h-full min-h-[320px] w-full rounded-[8px] border border-fluent-border bg-white object-contain" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {evidenceCards.map((card) => (
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
            <p className="text-sm font-bold uppercase tracking-wide text-azure">Problem</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">Thailand tourism trust is being damaged before tourists ask for help.</h2>
            <p className="mt-4 text-base leading-7 text-fluent-muted">
              Scams and fraud range from everyday overcharging to fake tour payments, passport leverage, and critical fake job or casting luring. Emergency tools help after an incident; TrustPass focuses on the uncertain moment before tourists pay, travel, or follow instructions.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Before payment", "Check QR accounts, deposits, receipts, and license clues."],
              ["Before travel", "Detect risky routes, border luring, secrecy pressure, and controlled transport."],
              ["Before conflict", "Give calm Thai phrases and evidence checklists."],
              ["After reporting", "Turn messy evidence into a structured help report."]
            ].map(([title, text]) => (
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
          <p className="text-sm font-bold uppercase tracking-wide text-azure">Tourist Evidence</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-bold text-ink">The demo is built around real travel moments, not only system diagrams.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-fluent-muted">
            These synthetic evidence samples show the situations TrustPass is designed to read: menus, payment chats, and rental documents. OCR supports the story, but the typed situation remains the primary case unless the user chooses otherwise.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {visualStories.map((story) => (
            <article key={story.title} className="overflow-hidden rounded-[8px] border border-fluent-border bg-white shadow-sm">
              <div className="relative aspect-[4/3] bg-fluent-canvas">
                <Image src={story.image} alt={story.alt} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
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
            <p className="text-sm font-bold uppercase tracking-wide text-azure">Live Product</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">One chat interface for the major tourist-trust cases.</h2>
          </div>
          <Link href="/scenarios" className="inline-flex items-center gap-2 rounded-[8px] border border-fluent-border bg-white px-4 py-2 text-sm font-bold text-ink transition hover:border-azure hover:text-azure">
            See all scenarios
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="rounded-[8px] border border-fluent-border bg-white p-5 shadow-sm">
              <RiskPill level={scenario.riskLevel} />
              <h3 className="mt-4 text-lg font-bold text-ink">{scenario.title}</h3>
              <p className="mt-3 text-sm leading-6 text-fluent-muted">{scenario.touristInput}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-fluent-border bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-[8px] border border-fluent-border bg-fluent-canvas p-3">
            <Image src="/trustpass-risk-ladder.png" alt="TrustPass scam risk ladder" width={1400} height={788} className="h-auto w-full rounded-[8px] border border-fluent-border bg-white" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold uppercase tracking-wide text-azure">Why not just ChatGPT?</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">The value is evidence, tourism risk context, and action workflow.</h2>
            <div className="mt-5 grid gap-3">
              {[
                ["Evidence-aware", "Accepts screenshots, receipts, contracts, QR screens, and chat logs."],
                ["Thailand-specific", "Uses tourism risk patterns, emergency contacts, and verified operator signals."],
                ["Actionable", "Returns Thai phrases, evidence checklists, and incident reports."],
                ["Transformational", "Aggregates eligible Caution, High, and Emergency signals into a dashboard for hotels, TAT, and tourist police."]
              ].map(([title, text]) => (
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
            <p className="text-sm font-bold uppercase tracking-wide text-azure">AI + Grounding Stack</p>
          <h2 className="mt-2 text-3xl font-bold text-ink">Azure AI powers OCR and reasoning after TrustPass grounding.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {azureServices.map((service) => (
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
            <p className="text-sm font-bold uppercase tracking-wide text-azure">Product Flow</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">Start with the trust crisis, then prove the product works.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/check" className="inline-flex items-center gap-2 rounded-[8px] bg-azure px-5 py-3 text-sm font-bold text-white transition hover:bg-fluent-blueDark">
              Launch Risk Check
              <ShieldCheck className="h-4 w-4" />
            </Link>
            <Link href="/architecture" className="inline-flex items-center gap-2 rounded-[8px] border border-azure bg-white px-5 py-3 text-sm font-bold text-azure transition hover:bg-blue-50">
              Show Architecture
              <FileText className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function RiskPill({ level }: { level: string }) {
  const styles: Record<string, string> = {
    Low: "border-green-200 bg-green-50 text-green-700",
    Caution: "border-yellow-200 bg-yellow-50 text-yellow-800",
    High: "border-orange-200 bg-orange-50 text-orange-800",
    Emergency: "border-red-200 bg-red-50 text-red-700"
  };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${styles[level]}`}>
      <ShieldAlert className="h-3.5 w-3.5" />
      {level}
    </span>
  );
}
