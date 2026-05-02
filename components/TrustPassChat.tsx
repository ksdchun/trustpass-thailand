"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Languages,
  LocateFixed,
  Loader2,
  MapPin,
  Maximize2,
  Paperclip,
  PhoneCall,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X
} from "lucide-react";
import type { Language, RiskCheckResult, RiskLevel, UserLocation } from "@/lib/types";

const cities = ["Bangkok", "Phuket", "Pattaya", "Chiang Mai"];
const languageOptions: Array<{ value: Language; label: string }> = [
  { value: "English", label: "English" },
  { value: "Chinese", label: "中文" },
  { value: "Thai", label: "ไทย" }
];

const demoLocations: Array<{ id: string; label: string; location: UserLocation | null }> = [
  { id: "none", label: "No mock location", location: null },
  {
    id: "jay-fai",
    label: "Jay Fai",
    location: { latitude: 13.7526, longitude: 100.5048, accuracy: 25, source: "manual" }
  },
  {
    id: "siam-paragon",
    label: "Siam Paragon mall",
    location: { latitude: 13.7466, longitude: 100.5347, accuracy: 35, source: "manual" }
  },
  {
    id: "chatuchak",
    label: "Chatuchak Market",
    location: { latitude: 13.7999, longitude: 100.5502, accuracy: 45, source: "manual" }
  }
];

const sampleChips: Array<{ label: string; text: string }> = [
  {
    label: "Suspicious taxi",
    text: "A taxi driver says the meter is broken and wants 800 baht to take me from Siam to Wat Pho."
  },
  {
    label: "Tour booking",
    text: "A LINE tour seller is asking for full payment today to a personal bank account and will not show a license number."
  },
  {
    label: "Casting offer",
    text: "A WeChat recruiter offered me a paid casting gig with free airport pickup. The driver said we'll go to Mae Sot for the interview and asked me not to tell my hotel."
  }
];

const loadingStages = [
  "Reading your situation…",
  "Cross-referencing Thailand risk patterns…",
  "Generating action plan…"
];

type RiskTheme = {
  hex: string;
  label: string;
  softBg: string;
  text: string;
  ring: string;
  Icon: typeof AlertOctagon;
  pulse: boolean;
};

const riskTheme: Record<RiskLevel, RiskTheme> = {
  Emergency: {
    hex: "#A4262C",
    label: "EMERGENCY",
    softBg: "rgba(164, 38, 44, 0.08)",
    text: "#A4262C",
    ring: "rgba(164, 38, 44, 0.18)",
    Icon: AlertOctagon,
    pulse: true
  },
  High: {
    hex: "#D83B01",
    label: "HIGH",
    softBg: "rgba(216, 59, 1, 0.08)",
    text: "#B5340A",
    ring: "rgba(216, 59, 1, 0.18)",
    Icon: AlertTriangle,
    pulse: false
  },
  Caution: {
    hex: "#FFB900",
    label: "CAUTION",
    softBg: "rgba(255, 185, 0, 0.14)",
    text: "#7A5A00",
    ring: "rgba(255, 185, 0, 0.30)",
    Icon: AlertCircle,
    pulse: false
  },
  Low: {
    hex: "#107C10",
    label: "LOW",
    softBg: "rgba(16, 124, 16, 0.08)",
    text: "#107C10",
    ring: "rgba(16, 124, 16, 0.18)",
    Icon: CheckCircle2,
    pulse: false
  }
};

function riskScoreFor(level: RiskLevel): number {
  return level === "Emergency" ? 94 : level === "High" ? 74 : level === "Caution" ? 42 : 18;
}

type ActionPriority = "immediate" | "soon" | "preventive";

function actionPriority(action: string): ActionPriority {
  const a = action.toLowerCase();
  if (
    /^(stop|don’t|don't|do not|never|leave|call|contact|stay)/i.test(a) ||
    /1155|embassy|police|public place|right away|immediately|do not follow|do not pay|do not proceed/i.test(a)
  ) {
    return "immediate";
  }
  if (/^(ask|request|verify|check|confirm|move|use)/i.test(a) || /before paying|verify|first|cancellation/i.test(a)) {
    return "soon";
  }
  return "preventive";
}

const priorityStyles: Record<ActionPriority, { label: string; bg: string; text: string }> = {
  immediate: { label: "Immediate", bg: "#FBE9EA", text: "#A4262C" },
  soon: { label: "Soon", bg: "#FBEAE0", text: "#B5340A" },
  preventive: { label: "Preventive", bg: "#E5F1FB", text: "#0B5394" }
};

export function TrustPassChat() {
  const [message, setMessage] = useState("");
  const [city, setCity] = useState("Bangkok");
  const [language, setLanguage] = useState<Language>("English");
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [demoLocationId, setDemoLocationId] = useState("none");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState<RiskCheckResult | null>(null);
  const [resultKey, setResultKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!isChecking) return;
    setStageIndex(0);
    const id = setInterval(() => {
      setStageIndex((s) => (s + 1) % loadingStages.length);
    }, 1100);
    return () => clearInterval(id);
  }, [isChecking]);

  function chooseFile(next: File | null) {
    setFile(next);
    setExtractedText("");
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) chooseFile(dropped);
  }

  function handleDemoLocationChange(id: string) {
    setDemoLocationId(id);
    setLocationError("");
    const match = demoLocations.find((location) => location.id === id);
    setUserLocation(match?.location ?? null);
    if (match?.location) setCity("Bangkok");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if ((!message.trim() && !file) || isChecking) return;

    setIsChecking(true);
    setErrorMessage(null);

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
          incidentDateIso: new Date(`${incidentDate}T12:00:00+07:00`).toISOString(),
          extractedText: extracted,
          userLocation: userLocation ?? undefined,
          attachmentsMetadata: file ? [{ name: file.name, type: file.type, size: file.size }] : []
        })
      });

      const payload = (await response.json()) as RiskCheckResult | { error: string };
      if ("error" in payload) throw new Error(payload.error);

      persistCase(payload, city);
      setResult(payload);
      setResultKey((k) => k + 1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not check this situation. Please try again.");
    } finally {
      setIsChecking(false);
    }
  }

  function handleUseLocation() {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Location is not supported in this browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: "browser"
        });
        setDemoLocationId("none");
        setIsLocating(false);
      },
      (error) => {
        setLocationError(error.message || "Could not read browser location.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
        <FormPanel
          message={message}
          setMessage={setMessage}
          city={city}
          setCity={setCity}
          language={language}
          setLanguage={setLanguage}
          file={file}
          previewUrl={previewUrl}
          extractedText={extractedText}
          chooseFile={chooseFile}
          fileInputRef={fileInputRef}
          dropZoneRef={dropZoneRef}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          onDrop={onDrop}
          onSubmit={handleSubmit}
          isChecking={isChecking}
          demoLocationId={demoLocationId}
          setDemoLocationId={handleDemoLocationChange}
          userLocation={userLocation}
          isLocating={isLocating}
          locationError={locationError}
          onUseLocation={handleUseLocation}
        />

        <div className="min-w-0">
          {errorMessage && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-[#A4262C]/30 bg-[#FBE9EA] px-4 py-3 text-sm text-[#A4262C]">
              <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">We couldn&apos;t complete the check.</p>
                <p className="mt-1 text-[#7A1F25]">{errorMessage}</p>
              </div>
            </div>
          )}

          {isChecking ? (
            <ResultSkeleton stage={loadingStages[stageIndex]} />
          ) : result ? (
            <ResultPanel key={resultKey} result={result} city={city} />
          ) : (
            <EmptyState onPickSample={(text) => setMessage(text)} />
          )}
        </div>
      </div>
    </div>
  );
}

type FormPanelProps = {
  message: string;
  setMessage: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  language: Language;
  setLanguage: (v: Language) => void;
  file: File | null;
  previewUrl: string | null;
  extractedText: string;
  chooseFile: (f: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  dropZoneRef: React.RefObject<HTMLDivElement>;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  onSubmit: (e: FormEvent) => void;
  isChecking: boolean;
  demoLocationId: string;
  setDemoLocationId: (v: string) => void;
  userLocation: UserLocation | null;
  isLocating: boolean;
  locationError: string;
  onUseLocation: () => void;
};

function FormPanel(props: FormPanelProps) {
  const {
    message, setMessage, city, setCity, language, setLanguage,
    file, previewUrl, extractedText, chooseFile, fileInputRef, dropZoneRef,
    isDragging, setIsDragging, onDrop, onSubmit, isChecking,
    demoLocationId, setDemoLocationId, userLocation, isLocating, locationError, onUseLocation
  } = props;

  return (
    <form onSubmit={onSubmit} className="lg:sticky lg:top-20 lg:self-start">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0078D4] text-white shadow-card">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-base font-semibold leading-tight text-[#242424]">TrustPass Thailand</p>
          <p className="text-xs font-medium text-[#616161]">Tourism trust assistant</p>
        </div>
      </div>

      <Card title="Describe Your Situation">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what's happening. For example: A taxi driver says the meter is broken and wants 800 baht to take me to Wat Pho."
          rows={6}
          className="min-h-[160px] w-full resize-y rounded-md border border-[#E1E1E1] bg-white px-3 py-3 text-sm leading-relaxed text-[#242424] placeholder:text-[#9A9A9A] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/30"
        />
      </Card>

      <Card title="Add Evidence" optional>
        <div
          ref={dropZoneRef}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-center transition ${
            isDragging
              ? "border-[#0078D4] bg-[#EFF6FC]"
              : file
              ? "border-[#E1E1E1] bg-[#FAFAFA]"
              : "border-[#E1E1E1] bg-white hover:border-[#0078D4] hover:bg-[#F5FAFD]"
          }`}
        >
          {!file ? (
            <>
              <Upload className="h-6 w-6 text-[#0078D4]" />
              <p className="text-sm font-medium text-[#242424]">Drag &amp; drop a file</p>
              <p className="text-xs text-[#616161]">or</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border border-[#E1E1E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#242424] transition hover:border-[#0078D4] hover:text-[#0078D4]"
              >
                Browse files
              </button>
              <p className="mt-1 text-[11px] text-[#9A9A9A]">Supports JPG, PNG, PDF</p>
            </>
          ) : (
            <div className="flex w-full flex-col items-stretch gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#E1E1E1] bg-[#F3F2F1]">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
                  ) : (
                    <FileText className="h-6 w-6 text-[#616161]" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-[#242424]">{file.name}</p>
                  <p className="text-xs text-[#616161]">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => chooseFile(null)}
                  className="rounded-md p-1.5 text-[#616161] transition hover:bg-[#F3F2F1] hover:text-[#A4262C]"
                  aria-label="Remove file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {extractedText && (
                <div className="rounded-md bg-[#F3F2F1] px-3 py-2 text-left text-xs leading-5 text-[#616161]">
                  <span className="font-semibold text-[#242424]">Extracted: </span>
                  {extractedText.slice(0, 80)}
                  {extractedText.length > 80 && "…"}
                </div>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Field label="City" icon={<MapPin className="h-3.5 w-3.5" />}>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-md border border-[#E1E1E1] bg-white px-3 py-2 text-sm text-[#242424] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/30"
          >
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Language" icon={<Languages className="h-3.5 w-3.5" />}>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="w-full rounded-md border border-[#E1E1E1] bg-white px-3 py-2 text-sm text-[#242424] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/30"
          >
            {languageOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Card title="Location context" optional>
        <div className="grid gap-3">
          <button
            type="button"
            onClick={onUseLocation}
            disabled={isLocating}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#E1E1E1] bg-white px-3 py-2 text-sm font-semibold text-[#242424] transition hover:border-[#0078D4] hover:text-[#0078D4] disabled:cursor-not-allowed disabled:text-[#9A9A9A]"
          >
            {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
            {isLocating ? "Reading location..." : "Use browser location"}
          </button>

          <Field label="Demo location" icon={<MapPin className="h-3.5 w-3.5" />}>
            <select
              value={demoLocationId}
              onChange={(e) => setDemoLocationId(e.target.value)}
              className="w-full rounded-md border border-[#E1E1E1] bg-white px-3 py-2 text-sm text-[#242424] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/30"
            >
              {demoLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.label}
                </option>
              ))}
            </select>
          </Field>

          {userLocation && (
            <p className="rounded-md bg-[#EFF6FC] px-3 py-2 text-xs font-medium text-[#0B5394]">
              Location set: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
            </p>
          )}
          {locationError && (
            <p className="rounded-md bg-[#FBE9EA] px-3 py-2 text-xs font-medium text-[#A4262C]">{locationError}</p>
          )}
        </div>
      </Card>

      <button
        type="submit"
        disabled={isChecking || (!message.trim() && !file)}
        className="group flex w-full items-center justify-center gap-2 rounded-md bg-[#0078D4] px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-[#106EBE] hover:shadow-elevated active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#BDBDBD] disabled:shadow-none"
      >
        {isChecking ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing&hellip;
          </>
        ) : (
          <>
            <Shield className="h-4 w-4" />
            Check Risk
          </>
        )}
      </button>

      <p className="mt-3 text-center text-[11px] font-medium text-[#9A9A9A]">
        Powered by Azure AI &middot; Document Intelligence + OpenAI
      </p>
    </form>
  );
}

function Card({ title, optional, children }: { title: string; optional?: boolean; children: ReactNode }) {
  return (
    <section className="mb-4 rounded-lg border border-[#E1E1E1] bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#242424]">{title}</h2>
        {optional && (
          <span className="rounded-xl bg-[#F3F2F1] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#616161]">
            Optional
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#616161]">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function EmptyState({ onPickSample }: { onPickSample: (text: string) => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-lg border border-dashed border-[#E1E1E1] bg-white px-6 py-14 text-center shadow-card">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FC]">
        <Shield className="h-8 w-8 text-[#0078D4]" />
      </div>
      <h2 className="text-lg font-semibold text-[#242424]">Ready to check</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#616161]">
        Submit a situation on the left to receive a structured risk assessment in seconds.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {sampleChips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => onPickSample(chip.text)}
            className="rounded-xl border border-[#E1E1E1] bg-white px-3 py-1.5 text-xs font-medium text-[#242424] transition hover:border-[#0078D4] hover:bg-[#F5FAFD] hover:text-[#0078D4]"
          >
            <Sparkles className="mr-1.5 inline-block h-3 w-3 -translate-y-px text-[#0078D4]" />
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultSkeleton({ stage }: { stage: string }) {
  return (
    <div className="rounded-lg border border-[#E1E1E1] bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[#0078D4]" />
        <p className="text-sm font-medium text-[#242424] transition-opacity duration-300">{stage}</p>
      </div>
      <div className="animate-skeleton space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 rounded-md bg-[#F3F2F1]" />
          <div className="h-9 w-20 rounded-md bg-[#F3F2F1]" />
        </div>
        <div className="h-7 w-2/3 rounded-md bg-[#F3F2F1]" />
        <div className="h-4 w-24 rounded-xl bg-[#F3F2F1]" />
        <div className="space-y-2 pt-4">
          <div className="h-4 w-full rounded bg-[#F3F2F1]" />
          <div className="h-4 w-11/12 rounded bg-[#F3F2F1]" />
          <div className="h-4 w-3/4 rounded bg-[#F3F2F1]" />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4">
          <div className="h-16 rounded-md bg-[#F3F2F1]" />
          <div className="h-16 rounded-md bg-[#F3F2F1]" />
          <div className="h-16 rounded-md bg-[#F3F2F1]" />
          <div className="h-16 rounded-md bg-[#F3F2F1]" />
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ result, city }: { result: RiskCheckResult; city: string }) {
  const theme = riskTheme[result.risk_level];
  const score = riskScoreFor(result.risk_level);
  const [showLargePhrase, setShowLargePhrase] = useState(false);

  return (
    <article className="animate-fadein overflow-hidden rounded-lg border border-[#E1E1E1] bg-white shadow-card">
      <HeroSection result={result} theme={theme} score={score} city={city} />

      <div className="space-y-7 px-6 py-6 sm:px-7">
        <Section title="Why this is risky">
          <p className="text-sm leading-relaxed text-[#424242]">{result.why_it_matters}</p>
        </Section>

        <SignalsSection signals={result.suspicious_signals} theme={theme} />

        <ActionsSection actions={result.safe_next_steps} />

        <ThaiPhraseCard phrase={result.thai_phrase} onShowLarge={() => setShowLargePhrase(true)} />

        <EvidenceChecklist items={result.evidence_to_save} />

        <ContactSection contactRecommendation={result.contact_recommendation} riskLevel={result.risk_level} />

        <IncidentReportSection summary={result.incident_report_summary} category={result.category} />
      </div>

      <FooterDisclaimer source={result.source} />

      {showLargePhrase && (
        <LargePhraseModal phrase={result.thai_phrase} onClose={() => setShowLargePhrase(false)} />
      )}
    </article>
  );
}

function HeroSection({
  result,
  theme,
  score,
  city
}: {
  result: RiskCheckResult;
  theme: RiskTheme;
  score: number;
  city: string;
}) {
  const Icon = theme.Icon;
  return (
    <header
      className="relative px-6 pb-6 pt-7 sm:px-7"
      style={{ backgroundColor: theme.softBg }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold tracking-wider text-white ${
            theme.pulse ? "animate-pulse-emergency" : ""
          }`}
          style={{ backgroundColor: theme.hex }}
        >
          <Icon className="h-4 w-4" />
          {theme.label}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#616161]">Risk score</p>
          <p className="leading-none">
            <span className="text-3xl font-semibold" style={{ color: theme.text }}>{score}</span>
            <span className="ml-1 text-sm font-medium text-[#616161]">/100</span>
          </p>
        </div>
      </div>
      <h2 className="mt-4 text-xl font-semibold leading-snug text-[#242424] sm:text-2xl">
        {humanHeadline(result, city)}
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-2.5 py-1 text-xs font-medium"
          style={{ borderColor: theme.ring, color: theme.text }}
        >
          {result.category}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E1E1] bg-white px-2.5 py-1 text-xs font-medium text-[#616161]">
          <MapPin className="h-3 w-3" />
          {city}
        </span>
      </div>
    </header>
  );
}

function humanHeadline(result: RiskCheckResult, city: string): string {
  if (result.risk_level === "Emergency") {
    return `Stop now — ${result.category.toLowerCase()} pattern detected in ${city}.`;
  }
  if (result.risk_level === "High") {
    return `Don't proceed yet — verify ${result.category.toLowerCase()} before paying or travelling.`;
  }
  if (result.risk_level === "Caution") {
    return `Verify before continuing — ${result.category.toLowerCase()} signals detected.`;
  }
  return `No strong scam pattern detected — stay alert and verify before paying.`;
}

function Section({ title, children, count }: { title: string; children: ReactNode; count?: number }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-[#242424]">{title}</h3>
        {typeof count === "number" && (
          <span className="text-xs font-medium text-[#616161]">
            {count} {count === 1 ? "signal" : "signals"} detected
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function SignalsSection({ signals, theme }: { signals: string[]; theme: RiskTheme }) {
  if (signals.length === 0) {
    return (
      <Section title="Detected signals" count={0}>
        <p className="rounded-md border border-[#E1E1E1] bg-[#FAFAFA] px-3 py-3 text-sm text-[#616161]">
          No strong signals matched the situation. Stay alert and verify identity, price, and receipt before paying.
        </p>
      </Section>
    );
  }
  return (
    <Section title="Detected signals" count={signals.length}>
      <ul className="grid gap-2">
        {signals.map((signal) => (
          <li
            key={signal}
            className="flex items-start gap-3 rounded-md border border-[#E1E1E1] bg-white px-3 py-2.5 text-sm text-[#242424] transition hover:border-[#0078D4]/40 hover:bg-[#F5FAFD]"
          >
            <span
              className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: theme.hex }}
            />
            <span className="leading-relaxed capitalize">{signal}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ActionsSection({ actions }: { actions: string[] }) {
  return (
    <Section title="Recommended actions">
      <ol className="grid gap-2.5">
        {actions.map((action, idx) => {
          const priority = actionPriority(action);
          const style = priorityStyles[priority];
          return (
            <li
              key={`${idx}-${action.slice(0, 24)}`}
              className="flex items-start gap-3 rounded-md border border-[#E1E1E1] bg-white px-3 py-3"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F3F2F1] text-xs font-semibold text-[#242424]">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-[#242424]">{action}</p>
              </div>
              <span
                className="ml-2 shrink-0 rounded-xl px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ backgroundColor: style.bg, color: style.text }}
              >
                {style.label}
              </span>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

function ThaiPhraseCard({ phrase, onShowLarge }: { phrase: string; onShowLarge: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copyPhrase() {
    try {
      await navigator.clipboard.writeText(phrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }
  return (
    <Section title="Show this in Thai">
      <div className="rounded-lg border border-[#0078D4]/20 bg-[#EFF6FC] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0078D4]">Show your phone</p>
        <p className="mt-2 text-xl font-semibold leading-snug text-[#242424]">{phrase}</p>
        <p className="mt-2 text-xs text-[#616161]">
          Polite, neutral phrasing meant to defuse the situation, not accuse.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyPhrase}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E1E1E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#242424] transition hover:border-[#0078D4] hover:text-[#0078D4]"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={onShowLarge}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#0078D4] bg-[#0078D4] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#106EBE]"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Show large
          </button>
        </div>
      </div>
    </Section>
  );
}

function LargePhraseModal({ phrase, onClose }: { phrase: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadein"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl rounded-lg bg-white px-8 py-12 shadow-elevated sm:px-14 sm:py-16"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-2 text-[#616161] transition hover:bg-[#F3F2F1]"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-[#0078D4]">Show this to a Thai speaker</p>
        <p className="mt-6 text-center text-3xl font-semibold leading-snug text-[#242424] sm:text-4xl">
          {phrase}
        </p>
        <p className="mt-8 text-center text-xs text-[#616161]">Press Esc or tap outside to close</p>
      </div>
    </div>
  );
}

function EvidenceChecklist({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  return (
    <Section title="Evidence to save">
      <ul className="grid gap-2">
        {items.map((item, idx) => {
          const key = `${idx}-${item.slice(0, 16)}`;
          const isChecked = !!checked[key];
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => setChecked((prev) => ({ ...prev, [key]: !prev[key] }))}
                className="flex w-full items-start gap-3 rounded-md border border-[#E1E1E1] bg-white px-3 py-2.5 text-left text-sm transition hover:border-[#0078D4]/40"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                    isChecked
                      ? "border-[#107C10] bg-[#107C10] text-white"
                      : "border-[#E1E1E1] bg-white text-transparent"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span className={`leading-relaxed ${isChecked ? "text-[#9A9A9A] line-through" : "text-[#242424]"}`}>
                  {item}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function ContactSection({
  contactRecommendation,
  riskLevel
}: {
  contactRecommendation: string;
  riskLevel: RiskLevel;
}) {
  const isUrgent = riskLevel === "Emergency" || riskLevel === "High";
  return (
    <Section title="Who to contact">
      <div className="grid gap-3 sm:grid-cols-3">
        <ContactCard
          tone="primary"
          title="Primary"
          subtitle="Tourist Police"
          value="1155"
          icon={<PhoneCall className="h-4 w-4" />}
          highlight
        />
        <ContactCard
          tone="default"
          title="Secondary"
          subtitle="Hotel front desk"
          value="Use hotel number"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <ContactCard
          tone="default"
          title="When to escalate"
          subtitle={isUrgent ? "Embassy / Consulate" : "Trusted platform"}
          value={isUrgent ? "Passport, detention, trafficking" : "Verify operator before paying"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>
      <p className="mt-3 rounded-md bg-[#FAFAFA] px-3 py-2.5 text-xs leading-relaxed text-[#616161]">
        {contactRecommendation}
      </p>
    </Section>
  );
}

function ContactCard({
  title,
  subtitle,
  value,
  icon,
  highlight
}: {
  tone: "primary" | "default";
  title: string;
  subtitle: string;
  value: string;
  icon: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        highlight ? "border-[#0078D4] bg-[#EFF6FC]" : "border-[#E1E1E1] bg-white"
      }`}
    >
      <p className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${
        highlight ? "text-[#0078D4]" : "text-[#616161]"
      }`}>
        {icon}
        {title}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-[#242424]">{subtitle}</p>
      <p className={`mt-1 text-xs ${highlight ? "text-[#0B5394]" : "text-[#616161]"}`}>{value}</p>
    </div>
  );
}

function IncidentReportSection({
  summary,
  category
}: {
  summary: { english: string; thai: string };
  category: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"english" | "thai">("english");
  const [copied, setCopied] = useState(false);

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(tab === "english" ? summary.english : summary.thai);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <Section title="Incident report">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border border-[#E1E1E1] bg-white px-4 py-3 text-left text-sm font-medium text-[#242424] transition hover:border-[#0078D4]/40 hover:bg-[#F5FAFD]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#0078D4]" />
          View structured incident report
        </span>
        <ChevronDown className={`h-4 w-4 text-[#616161] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 animate-fadein rounded-md border border-[#E1E1E1] bg-white p-4">
          <div className="mb-3 inline-flex rounded-md border border-[#E1E1E1] bg-[#FAFAFA] p-0.5">
            <TabButton active={tab === "english"} onClick={() => setTab("english")}>English</TabButton>
            <TabButton active={tab === "thai"} onClick={() => setTab("thai")}>ไทย</TabButton>
          </div>
          <p className="rounded-md bg-[#FAFAFA] px-3 py-3 text-sm leading-relaxed text-[#242424]">
            {tab === "english" ? summary.english : summary.thai}
          </p>
          <div className="mt-3 grid gap-2 text-xs text-[#616161]">
            <p className="font-semibold uppercase tracking-wider text-[#616161]">Key facts</p>
            <ul className="grid gap-1.5">
              <KeyFact label="Category" value={category} />
              <KeyFact label="Generated" value={new Date().toLocaleString()} />
            </ul>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyReport}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E1E1E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#242424] transition hover:border-[#0078D4] hover:text-[#0078D4]"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy report"}
            </button>
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-[#E1E1E1] bg-[#FAFAFA] px-3 py-1.5 text-xs font-semibold text-[#9A9A9A]"
              title="Coming soon"
            >
              <Download className="h-3.5 w-3.5" />
              Download as PDF
              <span className="ml-1 rounded-xl bg-[#F3F2F1] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                Soon
              </span>
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-white text-[#0078D4] shadow-card" : "text-[#616161] hover:text-[#242424]"
      }`}
    >
      {children}
    </button>
  );
}

function KeyFact({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline gap-2">
      <span className="min-w-[80px] text-[11px] font-semibold uppercase tracking-wider text-[#9A9A9A]">{label}</span>
      <span className="text-xs text-[#424242]">{value}</span>
    </li>
  );
}

function FooterDisclaimer({ source }: { source: RiskCheckResult["source"] }) {
  return (
    <footer className="border-t border-[#E1E1E1] bg-[#FAFAFA] px-6 py-4 sm:px-7">
      <p className="text-[11px] leading-relaxed text-[#616161]">
        This is a risk assessment based on observed signals, not a legal accusation. Always verify before acting. In emergencies call Tourist Police 1155.
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[#107C10]">
        <CheckCircle2 className="h-3 w-3" />
        Anonymized signal contributed to TAT regional intelligence
        <span className="ml-2 rounded-xl border border-[#E1E1E1] bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#616161]">
          {source === "azure-openai" ? "Azure OpenAI" : "Local rule engine"}
        </span>
      </p>
    </footer>
  );
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
