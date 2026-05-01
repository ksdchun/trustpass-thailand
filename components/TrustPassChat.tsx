"use client";

import { FormEvent, ReactNode, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bot,
  FileText,
  Languages,
  Loader2,
  MapPin,
  Paperclip,
  PhoneCall,
  Send,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import type { ChatMessage, Language, RiskCheckResult, RiskLevel } from "@/lib/types";

const cities = ["Bangkok", "Phuket", "Pattaya", "Chiang Mai", "Mae Sot"];
const languages: Language[] = ["English", "Thai", "Chinese"];

const suggestedChecks = [
  "Taxi driver says meter broken and asks 800 baht from Siam to Wat Pho.",
  "This LINE tour seller asks for full payment today to a personal bank account and shows no license number.",
  "The motorbike rental shop wants to keep my original passport until I return the bike.",
  "A WeChat casting job offers free airport pickup and says a driver will take me to Mae Sot. They told me not to tell my hotel."
];

export function TrustPassChat({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Hi, I’m TrustPass. Describe what is happening or attach evidence like a screenshot, receipt, contract, QR payment, or chat log. I’ll check for scam risk signals before you act."
    }
  ]);
  const [message, setMessage] = useState("");
  const [city, setCity] = useState("Bangkok");
  const [language, setLanguage] = useState<Language>("English");
  const [file, setFile] = useState<File | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const latestResult = useMemo(() => [...messages].reverse().find((item) => item.result)?.result, [messages]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if ((!message.trim() && !file) || isChecking) return;

    setIsChecking(true);
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message.trim() || "Please check this attached evidence.",
      attachmentName: file?.name
    };
    setMessages((current) => [...current, userMessage]);

    try {
      let extracted = "";
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const extractResponse = await fetch("/api/extract", { method: "POST", body: formData });
        const extractData = await extractResponse.json();
        extracted = extractData.extractedText || "";
        setExtractedText(extracted);
      }

      const response = await fetch("/api/risk-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          city,
          language,
          extractedText: extracted,
          attachmentsMetadata: file ? [{ name: file.name, type: file.type, size: file.size }] : []
        })
      });

      const result = (await response.json()) as RiskCheckResult | { error: string };
      if ("error" in result) throw new Error(result.error);

      persistCase(result, city);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `${result.risk_level} risk: ${result.category}`,
          result
        }
      ]);
      setMessage("");
      setFile(null);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error instanceof Error ? error.message : "I could not check this situation. Please try again."
        }
      ]);
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div className={`mx-auto flex w-full max-w-7xl flex-col gap-5 lg:grid ${compact ? "lg:grid-cols-[320px_1fr]" : "lg:grid-cols-[360px_1fr]"}`}>
      <aside className="rounded-[8px] border border-fluent-border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-azure text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-azure">TrustPass Thailand</p>
            <h2 className="text-2xl font-bold text-ink">AI Scam & Fraud Shield</h2>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          Chat with evidence to check suspicious travel situations using Thailand-specific scam patterns and Azure AI workflows.
        </p>

        <div className="mt-5 grid gap-3">
          <Control label="City" icon={<MapPin className="h-4 w-4" />}>
              <select value={city} onChange={(event) => setCity(event.target.value)} className="w-full rounded-[8px] border border-fluent-border bg-white px-3 py-2 text-sm outline-none focus:border-azure">
              {cities.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Control>
          <Control label="Output language" icon={<Languages className="h-4 w-4" />}>
              <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="w-full rounded-[8px] border border-fluent-border bg-white px-3 py-2 text-sm outline-none focus:border-azure">
              {languages.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Control>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <Sparkles className="h-4 w-4 text-saffron" />
              Suggested checks
            </div>
            <div className="grid gap-2">
            {suggestedChecks.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setMessage(prompt)}
                className="rounded-[8px] border border-fluent-border bg-fluent-canvas px-3 py-2 text-left text-xs leading-5 text-fluent-muted transition hover:border-azure hover:bg-blue-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <Link href="/dashboard" className="mt-6 flex items-center justify-center gap-2 rounded-[8px] bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-fluent-blueDark">
          <BarChart3 className="h-4 w-4" />
          Open Trust Dashboard
        </Link>

        {latestResult && (
            <div className="mt-5 rounded-[8px] border border-fluent-border bg-fluent-canvas p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest risk</p>
            <div className="mt-2 flex items-center gap-2">
              <RiskBadge level={latestResult.risk_level} />
              <span className="text-sm font-semibold text-ink">{latestResult.category}</span>
            </div>
          </div>
        )}
      </aside>

      <section className={`flex flex-col rounded-[8px] border border-fluent-border bg-white shadow-sm ${compact ? "min-h-[680px]" : "min-h-[calc(100vh-112px)]"}`}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-fluent-border px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-azure">Chat + Evidence</p>
            <h2 className="text-xl font-bold text-ink">Check a suspicious travel situation</h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
            <BadgeCheck className="h-4 w-4" />
            Azure AI-ready
          </div>
        </header>

        <div className="chat-scroll flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.map((item) => (
            <ChatBubble key={item.id} message={item} />
          ))}
          {isChecking && (
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking OCR, scam patterns, and risk response...
            </div>
          )}
        </div>

        {extractedText && (
          <div className="mx-4 mb-3 rounded-[8px] border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600 sm:mx-6">
            <span className="font-semibold text-ink">Extracted evidence: </span>
            {extractedText}
          </div>
        )}

        <form onSubmit={handleSubmit} className="border-t border-fluent-border p-4 sm:p-6">
          <div className="flex flex-col gap-3 rounded-[8px] border border-fluent-border bg-white p-3 focus-within:border-azure">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask naturally: Is this suspicious? Attach evidence if you have it."
              rows={3}
              className="min-h-20 resize-none border-0 text-sm leading-6 text-ink outline-none placeholder:text-slate-400"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-[8px] border border-fluent-border px-3 py-2 text-sm font-semibold text-fluent-muted transition hover:border-azure hover:text-azure"
                >
                  <Paperclip className="h-4 w-4" />
                  Attach evidence
                </button>
                {file && <span className="max-w-[220px] truncate text-xs text-slate-500">{file.name}</span>}
              </div>
              <button
                type="submit"
                disabled={isChecking || (!message.trim() && !file)}
                  className="flex items-center gap-2 rounded-[8px] bg-azure px-4 py-2 text-sm font-semibold text-white transition hover:bg-fluent-blueDark disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Check risk
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

function Control({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-3xl rounded-[8px] px-4 py-3 ${isUser ? "bg-azure text-white" : "border border-fluent-border bg-fluent-canvas text-ink"}`}>
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold opacity-80">
          {isUser ? <Send className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
          {isUser ? "Tourist" : "TrustPass"}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
        {message.attachmentName && (
          <div className="mt-2 flex items-center gap-2 rounded-[8px] bg-white/15 px-2 py-1 text-xs">
            <FileText className="h-3.5 w-3.5" />
            {message.attachmentName}
          </div>
        )}
        {message.result && <ResultCard result={message.result} />}
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: RiskCheckResult }) {
  return (
    <div className="mt-4 grid gap-3 rounded-[8px] bg-white p-4 text-ink shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RiskBadge level={result.risk_level} />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{result.source === "azure-openai" ? "Azure OpenAI" : "TrustPass Risk Engine"}</span>
      </div>
      <h3 className="text-lg font-bold">{result.category}</h3>
      <p className="text-sm leading-6 text-slate-600">{result.why_it_matters}</p>
      <InfoList title="Suspicious signals" items={result.suspicious_signals} icon={<AlertTriangle className="h-4 w-4 text-saffron" />} />
      <InfoList title="Safe next steps" items={result.safe_next_steps} icon={<ShieldCheck className="h-4 w-4 text-trust" />} />
      <div className="rounded-[8px] border border-blue-100 bg-blue-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-azure">Thai phrase</p>
        <p className="mt-1 text-sm font-semibold text-ink">{result.thai_phrase}</p>
      </div>
      <InfoList title="Evidence checklist" items={result.evidence_to_save} icon={<FileText className="h-4 w-4 text-slate-500" />} />
      <div className="rounded-[8px] border border-red-100 bg-red-50 p-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
          <PhoneCall className="h-4 w-4" />
          Contact recommendation
        </p>
        <p className="mt-1 text-sm leading-6 text-red-900">{result.contact_recommendation}</p>
      </div>
      <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-semibold text-ink">Help report</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{result.incident_report_summary.english}</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{result.incident_report_summary.thai}</p>
      </div>
    </div>
  );
}

function InfoList({ title, items, icon }: { title: string; items: string[]; icon: ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        {icon}
        {title}
      </p>
      {items.length ? (
        <ul className="grid gap-2 text-sm leading-6 text-slate-600">
          {items.map((item) => (
            <li key={item} className="rounded-[8px] bg-slate-50 px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No strong signals detected.</p>
      )}
    </div>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const styles: Record<RiskLevel, string> = {
    Low: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Caution: "bg-amber-100 text-amber-900 border-amber-200",
    High: "bg-orange-100 text-orange-900 border-orange-200",
    Emergency: "bg-red-100 text-red-800 border-red-200"
  };
  return <span className={`rounded-full border px-3 py-1 text-sm font-bold ${styles[level]}`}>{level}</span>;
}

function persistCase(result: RiskCheckResult, city: string) {
  if (typeof window === "undefined") return;
  const existing = JSON.parse(window.localStorage.getItem("trustpass-cases") || "[]");
  existing.unshift({
    city,
    category: result.category,
    riskLevel: result.risk_level,
    signals: result.suspicious_signals,
    createdAt: new Date().toISOString()
  });
  window.localStorage.setItem("trustpass-cases", JSON.stringify(existing.slice(0, 20)));
}
