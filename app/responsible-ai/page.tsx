import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Metadata } from "next";
import {
  AlertTriangle,
  BookOpen,
  Database,
  FileCheck2,
  GaugeCircle,
  Hammer,
  Layers,
  ListChecks,
  Scale,
  ShieldCheck,
  Sparkles
} from "lucide-react";

import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Responsible AI - TrustPass Thailand",
  description:
    "Model card, evaluation methodology, known failure modes, bias statement, and data sources for the TrustPass Thailand scam-and-fraud risk classifier."
};

type EvalSummary = {
  risk_level_accuracy?: number;
  risk_level_proximity?: number;
  category_recall?: number;
  signal_f1?: number;
  grounding_tool_coverage?: number;
  latency_p50_ms?: number;
  latency_p95_ms?: number;
};

type EvalResults = {
  timestamp_iso?: string;
  model?: string;
  case_count?: number;
  summary?: EvalSummary;
};

function loadEvalResults(): EvalResults | null {
  try {
    const path = resolve(process.cwd(), "data", "eval", "results-latest.json");
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as EvalResults;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function formatPercent(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(value * 1000) / 10}%`;
}

function formatLatency(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "-";
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${value} ms`;
}

function formatTimestamp(value: string | undefined): string {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toUTCString().replace(":00 GMT", " UTC");
  } catch {
    return value;
  }
}

const DATA_SOURCES: Array<{
  file: string;
  purpose: string;
}> = [
  {
    file: "data/risk_patterns.json",
    purpose:
      "Thailand-specific scam pattern definitions: signal phrases, category, risk level, suggested actions, and one Thai phrase per pattern."
  },
  {
    file: "data/taxi_fare_reference.json",
    purpose:
      "Bangkok taxi route baselines used by the fare-reference grounding tool to decide whether a quote is normal, modestly over reference, or far above baseline."
  },
  {
    file: "data/food_price_reference.json",
    purpose:
      "Bangkok venue tiers (street stall, casual, food court, premium) and item price bands. Prevents over-warning at legitimately premium venues like Jay Fai."
  },
  {
    file: "data/verified_operators.demo.json",
    purpose:
      "Demo set of TAT-licensed operators used by the Trusted Operator card. Matches against operator name; surfaces verified, no-license, or not-in-directory."
  },
  {
    file: "data/emergency_contacts.json",
    purpose:
      "Tourist Police, embassies, and other escalation contacts surfaced when a result reaches High or Emergency."
  },
  {
    file: "data/location_context.json",
    purpose:
      "Zones, neighborhoods, and known venue references used to disambiguate ambiguous food, taxi, or tour situations."
  },
  {
    file: "data/thai_phrases.json",
    purpose:
      "Reusable Thai phrases the tourist can show on a phone, grouped by situation type (verify operator, ask for receipt, ask for meter, etc.)."
  },
  {
    file: "data/damage_claim_reference.json",
    purpose:
      "Rental damage claim references (jet-ski, motorbike) used to detect cash-pressure tactics and recommend the safer paper-trail path."
  }
];

const FAILURE_MODES: Array<{ title: string; detail: string }> = [
  {
    title: "Ambiguous food prices without venue context",
    detail:
      "If a tourist photographs a menu showing 350 baht Pad Thai but the photo does not show the restaurant name or GPS, the system asks a clarifying question (street stall or sit-down restaurant?) instead of guessing. The failure mode is asks a question instead of answering, which we judged safer than confidently misclassifying."
  },
  {
    title: "Legitimate Mae Sot visa runs",
    detail:
      "Mae Sot is the closest visa-run border for many long-stay tourists; not every mention is a luring case. The pattern requires a combination of signals (controlled transport + secrecy + inducement) - a solo tourist saying I am doing a visa run to Mae Sot tomorrow receives a Low response with a generic safety note."
  },
  {
    title: "OCR with no readable text",
    detail:
      "If the uploaded evidence has no extractable text (low-resolution photo, unusual fonts, hand-written), Azure Document Intelligence returns an empty or low-confidence result. The system tells the user the evidence is weak and asks them to paste the key text or describe what they see."
  },
  {
    title: "Highly informal conversational input without specifics",
    detail:
      "Inputs like is Thailand safe? or saw something weird without concrete details (amounts, locations, screenshots, account names) produce a generic verification advice response rather than a confident risk classification."
  }
];

const ESCALATION_NOTES: string[] = [
  "This is a risk assessment based on observed signals, not a legal accusation. TrustPass never says this business is a scam - only that the situation contains signals consistent with a documented pattern.",
  "Tourist Police 1155 is for emergencies, serious pressure, threats, refusal to let you leave, or clear fraud escalation. Low-risk and ordinary verification cases should not call 1155.",
  "Not legal advice, not medical advice. When in doubt, the safest first step is to ask hotel staff, a verified operator, or your embassy before proceeding."
];

export default function ResponsibleAIPage() {
  const evalResults = loadEvalResults();
  const summary = evalResults?.summary ?? null;

  return (
    <main>
      <SiteNav />

      <section className="border-b border-fluent-border bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-semibold text-azure">
            <ShieldCheck className="h-4 w-4" />
            Responsible AI
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Responsible AI at TrustPass Thailand
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-fluent-muted">
            TrustPass is preventive trust infrastructure for Thailand&apos;s tourism industry, not a chatbot. This page
            documents how the underlying model is configured, how we measure its accuracy, what it gets wrong, how we
            handle bias around sensitive locations like Mae Sot, and what data sources ground its reasoning. Every claim
            on this page is backed by a file you can inspect in this repository.
          </p>
        </div>
      </section>

      <section className="border-b border-fluent-border bg-fluent-canvas">
        <div className="mx-auto grid max-w-5xl gap-5 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-azure">
              <Sparkles className="h-4 w-4" />
              Model card
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink">
              GPT-4o on Azure OpenAI, configured for reproducibility.
            </h2>
            <p className="mt-3 text-sm leading-6 text-fluent-muted">
              The classifier is a single Azure OpenAI deployment. Deterministic grounding tools run before the model is
              called, so the model receives Thailand-specific context (taxi fares, food tiers, TAT operator status,
              location zones) alongside the tourist&apos;s text and OCR. The system prompt forbids accusations of specific
              businesses or people - only documented pattern matches are surfaced as signals.
            </p>
          </div>
          <div className="grid gap-3">
            <ModelFact
              label="Deployment"
              value="GPT-4o via Azure OpenAI"
              detail="Configurable through AZURE_OPENAI_DEPLOYMENT - same JSON schema works for GPT-4o, GPT-4.1, or a reasoning model after a re-run of the eval harness."
            />
            <ModelFact
              label="Temperature"
              value="0.1"
              detail="Low temperature keeps risk classification stable across repeated takes during a recorded demo."
            />
            <ModelFact
              label="Seed"
              value="42"
              detail="AZURE_OPENAI_SEED pins generation for reproducibility. Same input + same grounding context produces the same output."
            />
            <ModelFact
              label="Response format"
              value="JSON schema, strict mode"
              detail="The response shape (risk_level, suspicious_signals, why_it_matters, safe_next_steps, thai_phrase, evidence_to_save, contact_recommendation, incident_report_summary) is enforced via Azure OpenAI structured outputs."
            />
            <ModelFact
              label="Safety overlay"
              value="Azure AI Content Safety Prompt Shields (optional)"
              detail="When AZURE_CONTENT_SAFETY_ENDPOINT and AZURE_CONTENT_SAFETY_KEY are present, every untrusted OCR string is checked against the Prompt Shields API before being injected into the model context. Graceful degrade if the keys are absent."
            />
            <ModelFact
              label="Prompt source"
              value="lib/system-prompt.ts"
              detail="System prompt explicitly forbids verdict language (this is a scam, you will get your money back) and enforces proportional escalation: Low = no escalation, Caution = staff/hotel, High = verify before paying, Emergency = call 1155 from safety."
            />
          </div>
        </div>
      </section>

      <section className="border-b border-fluent-border bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-azure">
            <GaugeCircle className="h-4 w-4" />
            Evaluation methodology
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">
            A 50-case gold set covering hero scenarios, negatives, edges, mid-risk, and adversarial inputs.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-fluent-muted">
            Every prompt change is regression-tested against a gold-labeled evaluation set covering five categories:
            hero scenarios (Wang Xing-style WeChat lure, jet-ski damage pressure), explicit negatives (Jay Fai 1500-baht
            crab omelette, normal taxi fare, solo Mae Sot visa run), edge cases (passport copy rentals, ambiguous food
            prices), mid-risk cases (vague meter language, partial fare deposit), and adversarial cases (OCR carrying
            prompt-injection attempts). Risk-level accuracy, category recall, grounding-tool coverage, signal F1, and
            latency are all tracked per run; results are written to{" "}
            <code className="rounded bg-fluent-panel px-1.5 py-0.5 text-xs text-ink">data/eval/results-latest.json</code>.
          </p>

          {summary ? (
            <div className="mt-6 grid gap-4 rounded-[8px] border border-fluent-border bg-fluent-canvas p-5 md:grid-cols-3">
              <MetricStat
                label="Risk level accuracy"
                value={formatPercent(summary.risk_level_accuracy)}
                detail="Exact-match risk level vs gold label"
              />
              <MetricStat
                label="Risk level proximity"
                value={formatPercent(summary.risk_level_proximity)}
                detail="Partial credit for off-by-one (Caution-High)"
              />
              <MetricStat
                label="Category recall"
                value={formatPercent(summary.category_recall)}
                detail="Did the model name the correct scam category?"
              />
              <MetricStat
                label="Signal F1"
                value={formatPercent(summary.signal_f1)}
                detail="Precision/recall of suspicious_signals[] list"
              />
              <MetricStat
                label="Grounding tool coverage"
                value={formatPercent(summary.grounding_tool_coverage)}
                detail="% of cases where the expected grounding tool ran"
              />
              <MetricStat
                label="Latency P50 / P95"
                value={`${formatLatency(summary.latency_p50_ms)} / ${formatLatency(summary.latency_p95_ms)}`}
                detail="End-to-end including grounding + model"
              />
              <div className="md:col-span-3">
                <p className="text-xs text-fluent-muted">
                  Model: <span className="font-semibold text-ink">{evalResults?.model ?? "-"}</span> {" | "} Cases:{" "}
                  <span className="font-semibold text-ink">{evalResults?.case_count ?? "-"}</span> {" | "} Last run:{" "}
                  <span className="font-semibold text-ink">{formatTimestamp(evalResults?.timestamp_iso)}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[8px] border border-dashed border-fluent-border bg-fluent-canvas p-5 text-sm leading-6 text-fluent-muted">
              <p className="font-semibold text-ink">Evaluation run pending.</p>
              <p className="mt-2">
                No <code className="rounded bg-fluent-panel px-1.5 py-0.5 text-xs text-ink">data/eval/results-latest.json</code>{" "}
                file is present yet. Run{" "}
                <code className="rounded bg-fluent-panel px-1.5 py-0.5 text-xs text-ink">scripts/run-evals.mjs</code> to
                produce numbers. Once the file exists, this section will render risk-level accuracy, category recall,
                grounding-tool coverage, and latency for the most recent run.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="border-b border-fluent-border bg-fluent-canvas">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-azure">
            <Hammer className="h-4 w-4" />
            Known failure modes
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">
            What we get wrong, in writing, before judges have to ask.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-fluent-muted">
            Acknowledging concrete limitations is more credible than five strength claims. These are the failure modes
            we have observed during scenario testing. Each one is in the evaluation gold set as a regression case.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {FAILURE_MODES.map((mode) => (
              <article
                key={mode.title}
                className="rounded-[8px] border border-fluent-border bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-risk-caution" />
                  <div>
                    <p className="text-base font-bold text-ink">{mode.title}</p>
                    <p className="mt-2 text-sm leading-6 text-fluent-muted">{mode.detail}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-fluent-border bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-azure">
            <Scale className="h-4 w-4" />
            Bias statement
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">
            Mae Sot is flagged by pattern combination, not by location alone.
          </h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[8px] border border-fluent-border bg-fluent-canvas p-5">
              <p className="text-sm font-bold text-ink">Location is one signal among many.</p>
              <p className="mt-2 text-sm leading-6 text-fluent-muted">
                The job-lure pattern requires a combination - border travel{" "}
                <span className="font-semibold text-ink">plus</span> controlled transport{" "}
                <span className="font-semibold text-ink">plus</span> secrecy{" "}
                <span className="font-semibold text-ink">plus</span> a paid inducement like a casting offer. A solo
                tourist saying &quot;I&apos;m doing a visa run to Mae Sot tomorrow&quot; gets a Low response with a
                generic safety note. The pattern only escalates when multiple signals co-occur.
              </p>
            </div>
            <div className="rounded-[8px] border border-fluent-border bg-fluent-canvas p-5">
              <p className="text-sm font-bold text-ink">Grounded in publicly reported cases.</p>
              <p className="mt-2 text-sm leading-6 text-fluent-muted">
                The Mae Sot signal is drawn from public reporting on the Wang Xing case (Reuters, AP, the Guardian,
                January 2025) and Tourist Police published advisories on cross-border lure compounds in Myawaddy and
                surrounding areas. The system cites public sources rather than profiling individuals or businesses.
              </p>
            </div>
            <div className="rounded-[8px] border border-fluent-border bg-fluent-canvas p-5">
              <p className="text-sm font-bold text-ink">Operators are surfaced, never accused.</p>
              <p className="mt-2 text-sm leading-6 text-fluent-muted">
                The system never produces verdicts like &quot;this business is a scam.&quot; It surfaces signals
                consistent with a documented pattern. The Trusted Operator card is positive-sum: a TAT-licensed tour
                appears as &quot;Verified&quot;, unverified ones prompt the tourist to verify, and consistently flagged
                operators get aggregated into the policy dashboard for authorities to investigate through proper
                channels.
              </p>
            </div>
            <div className="rounded-[8px] border border-fluent-border bg-fluent-canvas p-5">
              <p className="text-sm font-bold text-ink">No demographic data reaches the model.</p>
              <p className="mt-2 text-sm leading-6 text-fluent-muted">
                The model receives the tourist&apos;s typed situation, uploaded evidence OCR, optional city, optional
                incident date, and the deterministic grounding context. It does not receive nationality, age, gender, or
                any inferred demographic attribute. UI language preference (English / Thai / Chinese) is the only
                personalization signal.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-fluent-border bg-fluent-canvas">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-azure">
            <Database className="h-4 w-4" />
            Data sources
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">
            Every grounding signal is backed by a file you can inspect in this repository.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-fluent-muted">
            Local JSON grounding is deterministic, auditable, and low-latency. RAG is the obvious next step when the
            knowledge base expands beyond Bangkok, but for the hackathon MVP we keep grounding in source-controlled
            JSON. The list below mirrors the files in{" "}
            <code className="rounded bg-fluent-panel px-1.5 py-0.5 text-xs text-ink">data/</code>.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {DATA_SOURCES.map((source) => (
              <article
                key={source.file}
                className="rounded-[8px] border border-fluent-border bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-azure" />
                  <div className="min-w-0">
                    <code className="block break-all text-sm font-bold text-azure">{source.file}</code>
                    <p className="mt-2 text-sm leading-6 text-fluent-muted">{source.purpose}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-fluent-border bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-azure">
            <ListChecks className="h-4 w-4" />
            Disclaimers and escalation guidance
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">
            Proportional escalation. Never a verdict. Never legal or medical advice.
          </h2>
          <div className="mt-5 grid gap-3">
            {ESCALATION_NOTES.map((note) => (
              <div
                key={note}
                className="flex items-start gap-3 rounded-[8px] border border-fluent-border bg-fluent-canvas p-5"
              >
                <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-trust" />
                <p className="text-sm leading-6 text-fluent-muted">{note}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[8px] border border-blue-100 bg-[#EAF4FE] p-5">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-azure">
              <Layers className="h-4 w-4" />
              In one sentence
            </p>
            <p className="mt-3 text-base leading-7 text-ink">
              TrustPass is informational risk infrastructure. It augments tourist judgment with grounded signals; it
              does not replace law enforcement, the Tourist Police hotline 1155, embassies, or legal counsel.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function ModelFact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[8px] border border-fluent-border bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-fluent-muted">{label}</p>
      <p className="mt-1 text-base font-bold text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-fluent-muted">{detail}</p>
    </div>
  );
}

function MetricStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[8px] border border-fluent-border bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-fluent-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-azure">{value}</p>
      <p className="mt-2 text-xs leading-5 text-fluent-muted">{detail}</p>
    </div>
  );
}
