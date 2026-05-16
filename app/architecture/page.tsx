import Link from "next/link";
import { ArrowRight, Bot, CheckCircle2, Cloud, Database, FileScan, ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { azureServices } from "@/lib/demo-content";

export default function ArchitecturePage() {
  return (
    <main>
      <SiteNav />
      <section className="border-b border-fluent-border bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-azure">Azure AI Architecture</p>
            <h1 className="mt-2 text-4xl font-bold text-ink">Azure AI powers OCR and reasoning after deterministic grounding.</h1>
            <p className="mt-4 text-base leading-7 text-fluent-muted">
              TrustPass combines tourist-provided situation details, uploaded evidence, Azure Document Intelligence OCR, local tourism-grounding tools, and Azure OpenAI reasoning to produce safer next steps before tourists pay, travel, or follow instructions.
            </p>
            <Link href="/check" className="mt-6 inline-flex items-center gap-2 rounded-[8px] bg-azure px-5 py-3 text-sm font-bold text-white transition hover:bg-fluent-blueDark">
              Test the live flow
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-[8px] border border-fluent-border bg-fluent-canvas p-3 shadow-soft">
            <img src="/trustpass-ai-grounding-layer.png" alt="TrustPass Azure AI and grounded safety layer architecture" className="h-auto w-full rounded-[8px] border border-fluent-border bg-white" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {azureServices.map((service) => (
          <div key={service.title} className="rounded-[8px] border border-fluent-border bg-white p-5 shadow-sm">
            <Bot className="h-6 w-6 text-azure" />
            <p className="mt-3 font-bold text-ink">{service.title}</p>
            <p className="mt-2 text-sm leading-6 text-fluent-muted">{service.description}</p>
          </div>
        ))}
      </section>

      <section className="border-y border-fluent-border bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
          <ArchitectureCard icon={<FileScan />} title="Evidence processing" items={["Azure Document Intelligence extracts OCR text from screenshots, menus, receipts, contracts, and PDFs", "OCR hints are shown to the user as supporting evidence", "Weak or unrelated evidence is ignored instead of being forced into the score"]} />
          <ArchitectureCard icon={<Cloud />} title="Risk reasoning" items={["Deterministic grounding runs before Azure OpenAI", "Azure OpenAI receives structured in-scope context and grounding signals", "The result is rendered as a consistent action card and help report"]} />
          <ArchitectureCard icon={<Database />} title="Trust data layer" items={["Tourism scam and fraud risk patterns", "Bangkok food tiers, taxi fare references, venue and event context", "Dashboard records only eligible Caution, High, and Emergency cases"]} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[8px] border border-blue-100 bg-[#EAF4FE] p-6">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-azure">
            <ShieldCheck className="h-4 w-4" />
            Responsible Trust Workflow
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              "The app flags risk signals without declaring a business guilty.",
              "Tourists receive verification steps before payment or travel.",
              "High-risk situations produce clear escalation guidance.",
              "Aggregated Caution, High, and Emergency signals help tourism stakeholders understand where trust is breaking down."
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-[8px] bg-white p-4 text-sm leading-6 text-fluent-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-trust" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function ArchitectureCard({ icon, title, items }: { icon: React.ReactElement; title: string; items: string[] }) {
  return (
    <div className="rounded-[8px] border border-fluent-border bg-fluent-canvas p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-white text-azure">{icon}</div>
      <h2 className="mt-4 text-xl font-bold text-ink">{title}</h2>
      <ul className="mt-4 grid gap-2">
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-fluent-muted">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
