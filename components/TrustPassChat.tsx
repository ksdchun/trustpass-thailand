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
  LocateFixed,
  Loader2,
  MapPin,
  Maximize2,
  Paperclip,
  PhoneCall,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X
} from "lucide-react";
import type {
  EvidenceExtractResult,
  GroundingSignal,
  Language,
  RiskCheckResult,
  RiskLevel,
  SituationAnalyzeRequest,
  SituationAnalyzeResponse,
  UserLocation
} from "@/lib/types";

const cities = ["Bangkok", "Phuket", "Pattaya", "Chiang Mai"];
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
    label: "Normal taxi",
    text: "A taxi driver says he wants 50 baht to take me from Siam to Wat Pho. Is this normal?"
  },
  {
    label: "Suspicious taxi",
    text: "A taxi driver says the meter is broken and wants 800 baht to take me from Siam to Wat Pho."
  },
  {
    label: "Mall menu",
    text: "This menu shows seafood pasta 320 baht and crab fried rice 450 baht. I am at Siam Paragon. Is this suspicious?"
  },
  {
    label: "Street food high price",
    text: "A street food stall menu shows pad thai 320 baht and fried rice 350 baht. Is this normal?"
  },
  {
    label: "Jay Fai menu",
    text: "I am at Jay Fai. The menu shows crab omelette 1500 baht and drunken noodles 800 baht. Is this suspicious?"
  },
  {
    label: "Tour booking",
    text: "A LINE tour seller is asking for full payment today to a personal bank account and will not show a license number."
  },
  {
    label: "Passport rental",
    text: "The motorbike rental shop wants to keep my original passport as a deposit."
  },
  {
    label: "QR mismatch",
    text: "Restaurant QR payment account name is a different personal name and they say scan to pay now."
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

type PendingClarification = Extract<SituationAnalyzeResponse, { status: "needs_clarification" }>;
type PendingMismatch = Extract<SituationAnalyzeResponse, { status: "evidence_mismatch" }>;
type OutOfScopeSituation = Extract<SituationAnalyzeResponse, { status: "out_of_scope" }>;
type CompletedSituation = Extract<SituationAnalyzeResponse, { status: "completed" }>;

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

function riskScoreFor(result: RiskCheckResult): number {
  if (result.risk_level === "Emergency") return 94;

  const base = result.risk_level === "High" ? 74 : result.risk_level === "Caution" ? 42 : 18;
  const maxAllowed = result.risk_level === "High" ? 89 : result.risk_level === "Caution" ? 69 : 34;
  const ratioScore = scoreFromGroundingRatios(result, base);
  return Math.min(maxAllowed, Math.max(base, ratioScore));
}

function scoreFromGroundingRatios(result: RiskCheckResult, base: number) {
  const fareSignal = result.grounding?.find((signal) => signal.tool === "fare_reference");
  const foodSignal = result.grounding?.find((signal) => signal.tool === "food_price_reference");
  const damageSignal = result.grounding?.find((signal) => signal.tool === "damage_claim_reference");
  const fareRatio = asNumber(fareSignal?.metadata?.fare_ratio_to_baseline);
  const foodRatio = asNumber(foodSignal?.metadata?.max_price_ratio_to_reference);
  const damageRatio = asNumber(damageSignal?.metadata?.amount_ratio_to_minor_damage_reference);

  const candidates = [base];
  if (fareRatio !== null) candidates.push(Math.round(30 + Math.min(58, fareRatio * 6)));
  if (foodRatio !== null) candidates.push(Math.round(30 + Math.min(55, foodRatio * 4)));
  if (damageRatio !== null) candidates.push(Math.round(35 + Math.min(50, damageRatio * 8)));
  return Math.max(...candidates);
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
  const language: Language = "English";
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [demoLocationId, setDemoLocationId] = useState("none");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [evidenceResult, setEvidenceResult] = useState<EvidenceExtractResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState<RiskCheckResult | null>(null);
  const [pendingClarification, setPendingClarification] = useState<PendingClarification | null>(null);
  const [pendingMismatch, setPendingMismatch] = useState<PendingMismatch | null>(null);
  const [outOfScope, setOutOfScope] = useState<OutOfScopeSituation | null>(null);
  const [pendingRequest, setPendingRequest] = useState<SituationAnalyzeRequest | null>(null);
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [resultKey, setResultKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    setEvidenceResult(null);
    setPendingClarification(null);
    setPendingMismatch(null);
    setOutOfScope(null);
    setClarificationAnswer("");
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

  function handlePickSample(text: string) {
    setMessage(text);
    setErrorMessage(null);
    setPendingClarification(null);
    setPendingMismatch(null);
    setOutOfScope(null);
    setClarificationAnswer("");
    if (result) {
      setResult(null);
      setExtractedText("");
      setEvidenceResult(null);
      setFile(null);
    }
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleNewCheck() {
    setMessage("");
    setFile(null);
    setExtractedText("");
    setEvidenceResult(null);
    setResult(null);
    setPendingClarification(null);
    setPendingMismatch(null);
    setOutOfScope(null);
    setPendingRequest(null);
    setClarificationAnswer("");
    setErrorMessage(null);
    setResultKey((k) => k + 1);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function runSituationAnalysis(body: SituationAnalyzeRequest) {
    const response = await fetch("/api/situation/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    const payload = (await response.json()) as SituationAnalyzeResponse | { error: string };
    if ("error" in payload) throw new Error(payload.error);

    if (payload.status === "needs_clarification") {
      setPendingRequest(body);
      setPendingClarification(payload);
      setPendingMismatch(null);
      setOutOfScope(null);
      setClarificationAnswer("");
      setResult(null);
      return;
    }

    if (payload.status === "evidence_mismatch") {
      setPendingRequest(body);
      setPendingMismatch(payload);
      setPendingClarification(null);
      setOutOfScope(null);
      setClarificationAnswer("");
      setResult(null);
      return;
    }

    if (payload.status === "out_of_scope") {
      setOutOfScope(payload);
      setPendingRequest(null);
      setPendingClarification(null);
      setPendingMismatch(null);
      setClarificationAnswer("");
      setResult(null);
      return;
    }

    const nextResult = situationToRiskResult(payload);
    persistCase(nextResult, body.city);
    setPendingClarification(null);
    setPendingMismatch(null);
    setOutOfScope(null);
    setPendingRequest(null);
    setClarificationAnswer("");
    setResult(nextResult);
    setResultKey((k) => k + 1);
  }

  async function answerClarification(answer: string) {
    if (!pendingRequest || !pendingClarification || isChecking) return;
    const trimmed = answer.trim();
    if (!trimmed) return;

    setIsChecking(true);
    setErrorMessage(null);

    try {
      await runSituationAnalysis({
        ...pendingRequest,
        clarificationAnswers: {
          ...(pendingRequest.clarificationAnswers || {}),
          [pendingClarification.clarification_key || "general_context"]: trimmed
        }
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not continue this check. Please try again.");
    } finally {
      setIsChecking(false);
    }
  }

  async function answerEvidenceMismatch(answer: string) {
    if (!pendingRequest || !pendingMismatch || isChecking) return;
    if (answer === "I will upload the correct evidence") {
      setFile(null);
      setExtractedText("");
      setEvidenceResult(null);
      setPendingMismatch(null);
      setPendingRequest(null);
      setErrorMessage(null);
      setTimeout(() => fileInputRef.current?.click(), 0);
      return;
    }

    setIsChecking(true);
    setErrorMessage(null);

    try {
      await runSituationAnalysis({
        ...pendingRequest,
        clarificationAnswers: {
          ...(pendingRequest.clarificationAnswers || {}),
          evidence_choice: answer
        }
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not continue this check. Please try again.");
    } finally {
      setIsChecking(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if ((!message.trim() && !file) || isChecking) return;

    setIsChecking(true);
    setErrorMessage(null);

    try {
      let extracted = "";
      let extractData: EvidenceExtractResult | null = null;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const extractResponse = await fetch("/api/extract", { method: "POST", body: formData });
        extractData = (await extractResponse.json()) as EvidenceExtractResult;
        extracted = extractData.extractedText || "";
        setEvidenceResult(extractData);
        setExtractedText(extracted);
      }

      const body: SituationAnalyzeRequest = {
        message,
        city,
        language,
        incidentDateIso: new Date(`${incidentDate}T12:00:00+07:00`).toISOString(),
        evidenceText: extracted,
        evidenceRelevance: extractData?.detectedFields
          ? {
              topic: extractData.detectedFields.evidence_topic,
              relevance: extractData.detectedFields.relevance,
              reason: extractData.detectedFields.relevance_reason,
              usable_as_case_evidence: extractData.detectedFields.usable_as_case_evidence
            }
          : undefined,
        userLocation: userLocation ?? undefined,
        attachmentsMetadata: file ? [{ name: file.name, type: file.type, size: file.size }] : []
      };

      await runSituationAnalysis(body);
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
      <ContextBar
        city={city}
        setCity={setCity}
        incidentDate={incidentDate}
        setIncidentDate={setIncidentDate}
        demoLocationId={demoLocationId}
        setDemoLocationId={handleDemoLocationChange}
        userLocation={userLocation}
        isLocating={isLocating}
        locationError={locationError}
        onUseLocation={handleUseLocation}
      />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
        <FormPanel
          message={message}
          setMessage={setMessage}
          textareaRef={textareaRef}
          file={file}
          previewUrl={previewUrl}
          extractedText={extractedText}
          evidenceResult={evidenceResult}
          chooseFile={chooseFile}
          fileInputRef={fileInputRef}
          dropZoneRef={dropZoneRef}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          onDrop={onDrop}
          onSubmit={handleSubmit}
          isChecking={isChecking}
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
          ) : pendingClarification ? (
            <ClarificationPanel
              clarification={pendingClarification}
              answer={clarificationAnswer}
              setAnswer={setClarificationAnswer}
              onAnswer={answerClarification}
            />
          ) : pendingMismatch ? (
            <EvidenceMismatchPanel mismatch={pendingMismatch} onAnswer={answerEvidenceMismatch} />
          ) : outOfScope ? (
            <OutOfScopePanel response={outOfScope} onPickSample={handlePickSample} />
          ) : result ? (
            <ResultPanel key={resultKey} result={result} city={city} onNewCheck={handleNewCheck} />
          ) : (
            <EmptyState onPickSample={handlePickSample} />
          )}
        </div>
      </div>
    </div>
  );
}

type ContextBarProps = {
  city: string;
  setCity: (v: string) => void;
  incidentDate: string;
  setIncidentDate: (v: string) => void;
  demoLocationId: string;
  setDemoLocationId: (v: string) => void;
  userLocation: UserLocation | null;
  isLocating: boolean;
  locationError: string;
  onUseLocation: () => void;
};

function ContextBar({
  city,
  setCity,
  incidentDate,
  setIncidentDate,
  demoLocationId,
  setDemoLocationId,
  userLocation,
  isLocating,
  locationError,
  onUseLocation
}: ContextBarProps) {
  return (
    <section className="mb-5 rounded-lg border border-[#E1E1E1] bg-white p-3 shadow-card">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div className="grid grid-cols-2 gap-2">
          <Field label="City" icon={<MapPin className="h-3.5 w-3.5" />}>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-md border border-[#E1E1E1] bg-white px-2 py-2 text-xs text-[#242424] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/30"
            >
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Date" icon={<FileText className="h-3.5 w-3.5" />}>
            <input
              type="date"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="w-full rounded-md border border-[#E1E1E1] bg-white px-2 py-2 text-xs text-[#242424] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/30"
            />
          </Field>
        </div>

        <Field label="Location context" icon={<MapPin className="h-3.5 w-3.5" />}>
          <select
            value={demoLocationId}
            onChange={(e) => setDemoLocationId(e.target.value)}
            className="w-full rounded-md border border-[#E1E1E1] bg-white px-2 py-2 text-xs text-[#242424] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/30"
          >
            {demoLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>
        </Field>

        <button
          type="button"
          onClick={onUseLocation}
          disabled={isLocating}
          className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-md border border-[#E1E1E1] bg-white px-3 text-xs font-semibold text-[#242424] transition hover:border-[#0078D4] hover:text-[#0078D4] disabled:cursor-not-allowed disabled:text-[#9A9A9A]"
        >
          {isLocating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
          Use GPS
        </button>
      </div>

      {(userLocation || locationError) && (
        <div className="mt-2">
          {userLocation && (
            <p className="rounded-md bg-[#EFF6FC] px-2.5 py-1.5 text-[11px] font-medium text-[#0B5394]">
              Location set: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
            </p>
          )}
          {locationError && (
            <p className="rounded-md bg-[#FBE9EA] px-2.5 py-1.5 text-[11px] font-medium text-[#A4262C]">{locationError}</p>
          )}
        </div>
      )}
    </section>
  );
}

type FormPanelProps = {
  message: string;
  setMessage: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  file: File | null;
  previewUrl: string | null;
  extractedText: string;
  evidenceResult: EvidenceExtractResult | null;
  chooseFile: (f: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  dropZoneRef: React.RefObject<HTMLDivElement>;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  onSubmit: (e: FormEvent) => void;
  isChecking: boolean;
};

function FormPanel(props: FormPanelProps) {
  const {
    message, setMessage, textareaRef,
    file, previewUrl, extractedText, evidenceResult, chooseFile, fileInputRef, dropZoneRef,
    isDragging, setIsDragging, onDrop, onSubmit, isChecking
  } = props;

  return (
    <form onSubmit={onSubmit} className="lg:sticky lg:top-20 lg:flex lg:max-h-[calc(100vh-6rem)] lg:flex-col lg:self-start">
      <div className="mb-4 flex shrink-0 items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0078D4] text-white shadow-card">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-base font-semibold leading-tight text-[#242424]">TrustPass Thailand</p>
          <p className="text-xs font-medium text-[#616161]">Tourism trust assistant</p>
        </div>
      </div>

      <div className="min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
        <Card title="1. Describe Situation">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what's happening. For example: A taxi driver says the meter is broken and wants 800 baht to take me to Wat Pho."
            rows={5}
            className="min-h-[170px] w-full resize-y rounded-md border border-[#E1E1E1] bg-white px-3 py-3 text-sm leading-relaxed text-[#242424] placeholder:text-[#9A9A9A] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/30"
          />
        </Card>

        <Card title="2. Add Evidence" optional>
          <div
            ref={dropZoneRef}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-5 text-center transition ${
              isDragging
                ? "border-[#0078D4] bg-[#EFF6FC]"
                : file
                ? "border-[#E1E1E1] bg-[#FAFAFA]"
                : "border-[#E1E1E1] bg-white hover:border-[#0078D4] hover:bg-[#F5FAFD]"
            }`}
          >
            {!file ? (
              <>
                <Upload className="h-5 w-5 text-[#0078D4]" />
                <p className="text-sm font-medium text-[#242424]">Drop evidence or browse files</p>
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
                {evidenceResult && <EvidenceReadout evidence={evidenceResult} />}
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
      </div>

      <div className="sticky bottom-0 z-10 border-t border-[#E1E1E1] bg-[#FAF9F8]/95 pt-3 backdrop-blur lg:shrink-0">
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

        <p className="mt-2 pb-1 text-center text-[11px] font-medium text-[#9A9A9A]">
          Powered by Azure AI &middot; Document Intelligence + OpenAI
        </p>
      </div>
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

function ClarificationPanel({
  clarification,
  answer,
  setAnswer,
  onAnswer
}: {
  clarification: PendingClarification;
  answer: string;
  setAnswer: (value: string) => void;
  onAnswer: (answer: string) => void;
}) {
  const visibleSuggestions = clarification.suggested_answers.filter((suggested) => {
    if (clarification.clarification_key !== "venue_location") return true;
    return !/share.*restaurant name|type.*restaurant name|can share.*location|can type/i.test(suggested);
  });
  const isVenueLocation = clarification.clarification_key === "venue_location";

  return (
    <article className="animate-fadein rounded-lg border border-[#E1E1E1] bg-white p-6 shadow-card sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FC] text-[#0078D4]">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0078D4]">One detail needed</p>
          <h2 className="mt-2 text-xl font-semibold leading-snug text-[#242424]">{clarification.question}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#616161]">{clarification.reason}</p>
        </div>
      </div>

      {visibleSuggestions.length > 0 && (
        <div className="mt-6 grid gap-2">
          {visibleSuggestions.map((suggested) => (
            <button
              key={suggested}
              type="button"
              onClick={() => onAnswer(suggested)}
              className="rounded-md border border-[#E1E1E1] bg-white px-4 py-3 text-left text-sm font-medium text-[#242424] transition hover:border-[#0078D4] hover:bg-[#F5FAFD] hover:text-[#0078D4]"
            >
              {suggested}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-md border border-[#E1E1E1] bg-[#FAFAFA] p-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#616161]">
          {isVenueLocation ? "Type the restaurant or venue name" : "Or type an answer"}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onAnswer(answer);
            }}
            placeholder={isVenueLocation ? "Example: Jay Fai, Siam Paragon food court, local street stall" : "Type the restaurant name, venue context, or account detail"}
            className="min-w-0 flex-1 rounded-md border border-[#E1E1E1] bg-white px-3 py-2 text-sm text-[#242424] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/30"
          />
          <button
            type="button"
            onClick={() => onAnswer(answer)}
            disabled={!answer.trim()}
            className="rounded-md bg-[#0078D4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#106EBE] disabled:cursor-not-allowed disabled:bg-[#BDBDBD]"
          >
            Continue
          </button>
        </div>
      </div>
    </article>
  );
}

function EvidenceMismatchPanel({ mismatch, onAnswer }: { mismatch: PendingMismatch; onAnswer: (answer: string) => void }) {
  return (
    <article className="animate-fadein rounded-lg border border-[#E1E1E1] bg-white p-6 shadow-card sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FFF4CE] text-[#7A5A00]">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#7A5A00]">Evidence mismatch</p>
          <h2 className="mt-2 text-xl font-semibold leading-snug text-[#242424]">{mismatch.question}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#616161]">{mismatch.reason}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-xl bg-[#EFF6FC] px-2.5 py-1 font-semibold text-[#0B5394]">
              Message: {formatEvidenceTopic(mismatch.message_topic)}
            </span>
            <span className="rounded-xl bg-[#FBEAE0] px-2.5 py-1 font-semibold text-[#B5340A]">
              Evidence: {formatEvidenceTopic(mismatch.evidence_topic)}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-2">
        {mismatch.suggested_answers.map((suggested) => (
          <button
            key={suggested}
            type="button"
            onClick={() => onAnswer(suggested)}
            className="rounded-md border border-[#E1E1E1] bg-white px-4 py-3 text-left text-sm font-medium text-[#242424] transition hover:border-[#0078D4] hover:bg-[#F5FAFD] hover:text-[#0078D4]"
          >
            {suggested}
          </button>
        ))}
      </div>
    </article>
  );
}

function OutOfScopePanel({ response, onPickSample }: { response: OutOfScopeSituation; onPickSample: (text: string) => void }) {
  return (
    <article className="animate-fadein rounded-lg border border-[#E1E1E1] bg-white p-6 shadow-card sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FC] text-[#0078D4]">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0078D4]">Outside TrustPass scope</p>
          <h2 className="mt-2 text-xl font-semibold leading-snug text-[#242424]">This does not look like a tourist scam or safety check.</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#616161]">{response.message}</p>
          {response.evidence_relevance && (
            <p className="mt-3 rounded-md bg-[#FAFAFA] px-3 py-2 text-xs leading-relaxed text-[#616161]">
              Evidence: {response.evidence_relevance.reason}
            </p>
          )}
        </div>
      </div>
      <div className="mt-6 grid gap-2">
        {response.suggested_next_inputs.map((suggested) => (
          <button
            key={suggested}
            type="button"
            onClick={() => onPickSample(suggested)}
            className="rounded-md border border-[#E1E1E1] bg-white px-4 py-3 text-left text-sm font-medium text-[#242424] transition hover:border-[#0078D4] hover:bg-[#F5FAFD] hover:text-[#0078D4]"
          >
            {suggested}
          </button>
        ))}
      </div>
    </article>
  );
}

function EvidenceReadout({ evidence }: { evidence: EvidenceExtractResult }) {
  const { detectedFields } = evidence;
  const sourceLabel = detectedFields.source === "azure-document-intelligence" ? "Azure Document Intelligence" : "Demo fallback extraction";
  const relevanceLabel =
    detectedFields.relevance === "relevant"
      ? "Relevant evidence"
      : detectedFields.relevance === "weak"
        ? "Weak OCR"
        : "Ignored as unrelated";
  const relevanceClass =
    detectedFields.relevance === "relevant"
      ? "border-[#CFE8D1] bg-[#F1FAF1] text-[#107C10]"
      : detectedFields.relevance === "weak"
        ? "border-[#F7E5A1] bg-[#FFF8D6] text-[#7A5A00]"
        : "border-[#E1E1E1] bg-[#FAFAFA] text-[#616161]";
  const hintRows = [
    ["Prices", detectedFields.hints.prices],
    ["Accounts", detectedFields.hints.account_names],
    ["Businesses", detectedFields.hints.business_names],
    ["Places", detectedFields.hints.place_names],
    ["Risk phrases", detectedFields.hints.risky_phrases],
    ["Dates", detectedFields.hints.visible_dates]
  ] as const;

  return (
    <div className="rounded-md border border-[#E1E1E1] bg-white p-3 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#242424]">Evidence readout</p>
        <span className="rounded-xl border border-[#E1E1E1] bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
          {sourceLabel}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className={`rounded-xl border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${relevanceClass}`}>
          {relevanceLabel}
        </span>
        <span className="rounded-xl border border-[#E1E1E1] bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
          {formatEvidenceTopic(detectedFields.evidence_topic)}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-[#616161]">{detectedFields.relevance_reason}</p>
      {detectedFields.note && (
        <p className="mt-2 rounded-md bg-[#FFF4CE] px-2.5 py-1.5 text-[11px] leading-relaxed text-[#7A5A00]">
          {detectedFields.note}
        </p>
      )}
      <div className="mt-3 max-h-24 overflow-y-auto rounded-md bg-[#FAFAFA] px-3 py-2 text-[11px] leading-5 text-[#616161]">
        {evidence.extractedText || "No readable text detected."}
      </div>
      <div className="mt-3 grid gap-2">
        {hintRows.map(([label, values]) => (
          values.length > 0 && (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9A9A9A]">{label}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {values.slice(0, 6).map((value) => (
                  <span key={value} className="rounded-xl bg-[#EFF6FC] px-2 py-0.5 text-[10px] font-medium text-[#0B5394]">
                    {value}
                  </span>
                ))}
              </div>
            </div>
          )
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

function ResultPanel({ result, city, onNewCheck }: { result: RiskCheckResult; city: string; onNewCheck: () => void }) {
  const theme = riskTheme[result.risk_level];
  const score = riskScoreFor(result);
  const [showLargePhrase, setShowLargePhrase] = useState(false);

  return (
    <article className="animate-fadein overflow-hidden rounded-lg border border-[#E1E1E1] bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E1E1E1] bg-white px-5 py-3 sm:px-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">Assessment complete</p>
          <p className="mt-0.5 text-sm font-semibold text-[#242424]">{result.category}</p>
        </div>
        <button
          type="button"
          onClick={onNewCheck}
          className="inline-flex items-center gap-2 rounded-md border border-[#0078D4] bg-white px-3 py-2 text-xs font-semibold text-[#0078D4] transition hover:bg-[#EFF6FC]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          New check
        </button>
      </div>
      <HeroSection result={result} theme={theme} score={score} city={city} />

      <div className="space-y-7 px-6 py-6 sm:px-7">
        <Section title="Why this is risky">
          <p className="text-sm leading-relaxed text-[#424242]">{result.why_it_matters}</p>
        </Section>

        <SignalsSection signals={result.suspicious_signals} theme={theme} />

        <GroundingDetailsSection result={result} />

        <CaseSpecificCardsSection result={result} />

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

type PriceComparison = {
  item_name: string;
  listed_price_baht: number;
  normal_range_baht: [number, number];
  tier_label: string;
  result: "within" | "above" | "far_above";
  price_ratio_to_reference?: number;
  confidence: "low" | "medium" | "high";
  explanation: string;
};

function GroundingDetailsSection({ result }: { result: RiskCheckResult }) {
  const foodSignal = result.grounding?.find((signal) => signal.tool === "food_price_reference");
  const fareSignal = result.grounding?.find((signal) => signal.tool === "fare_reference");
  const routeSignal = result.grounding?.find((signal) => signal.tool === "route_distance");
  const priceComparisons = getPriceComparisons(foodSignal?.metadata);
  const taxiGrounding = getTaxiGrounding(fareSignal?.metadata, routeSignal?.metadata);

  if (priceComparisons.length === 0 && !taxiGrounding) return null;

  return (
    <Section title="Grounding details">
      <div className="grid gap-3">
        {priceComparisons.length > 0 && (
          <div className="overflow-hidden rounded-md border border-[#E1E1E1] bg-white">
            <div className="border-b border-[#E1E1E1] bg-[#FAFAFA] px-4 py-3">
              <p className="text-sm font-semibold text-[#242424]">Menu price comparison</p>
              <p className="mt-1 text-xs leading-relaxed text-[#616161]">
                Compared against curated Bangkok references for {foodSignal?.metadata?.likely_tier_label as string || "the likely venue tier"}.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E1E1E1] text-left text-xs">
                <thead className="bg-white text-[#616161]">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-2 font-semibold">Item</th>
                    <th className="whitespace-nowrap px-4 py-2 font-semibold">Listed</th>
                    <th className="whitespace-nowrap px-4 py-2 font-semibold">Normal range</th>
                    <th className="whitespace-nowrap px-4 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F2F1]">
                  {priceComparisons.map((comparison) => (
                    <tr key={`${comparison.item_name}-${comparison.listed_price_baht}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#242424]">{comparison.item_name}</p>
                        <p className="mt-1 max-w-[280px] text-[11px] leading-relaxed text-[#616161]">{comparison.explanation}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#242424]">
                        {comparison.listed_price_baht} THB
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#616161]">
                        {comparison.normal_range_baht[0]}-{comparison.normal_range_baht[1]} THB
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <GroundingBadge status={comparison.result} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {taxiGrounding && (
          <div className="rounded-md border border-[#E1E1E1] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#242424]">Taxi route and fare grounding</p>
                <p className="mt-1 text-xs leading-relaxed text-[#616161]">
                  {taxiGrounding.origin && taxiGrounding.destination
                    ? `${taxiGrounding.origin} to ${taxiGrounding.destination}`
                    : "Bangkok taxi meter rule"}
                </p>
              </div>
              <span className="rounded-xl border border-[#E1E1E1] bg-[#FAFAFA] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
                {taxiGrounding.source === "azure_maps" ? "Azure Maps" : taxiGrounding.source === "curated" ? "Curated estimate" : "Fallback"}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Metric label="Distance" value={taxiGrounding.distance ? `${taxiGrounding.distance.toFixed(1)} km` : "Unknown"} />
              <Metric label="Expected meter" value={taxiGrounding.estimate ? `${taxiGrounding.estimate[0]}-${taxiGrounding.estimate[1]} THB` : "Rule only"} />
              <Metric label="Quoted fare" value={taxiGrounding.quoted ? `${taxiGrounding.quoted} THB` : "Not provided"} />
              <Metric label="Over baseline" value={taxiGrounding.ratio ? `${taxiGrounding.ratio}x` : "Unknown"} />
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

function CaseSpecificCardsSection({ result }: { result: RiskCheckResult }) {
  const signals = result.grounding || [];
  const cards = [
    buildOperatorCard(signals.find((signal) => signal.tool === "operator_payment_reference")),
    buildQrCard(signals.find((signal) => signal.tool === "qr_payment_reference")),
    buildRentalDocumentCard(signals.find((signal) => signal.tool === "rental_document_reference")),
    buildDamageClaimCard(signals.find((signal) => signal.tool === "damage_claim_reference")),
    buildJobLureCard(signals.find((signal) => signal.tool === "job_lure_reference"))
  ].filter((card): card is CaseGuidanceCard => Boolean(card));

  if (cards.length === 0) return null;

  return (
    <Section title="Case-specific guidance">
      <div className="grid gap-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-md border border-[#E1E1E1] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#242424]">{card.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#616161]">{card.summary}</p>
              </div>
              <span className="rounded-xl border border-[#E1E1E1] bg-[#FAFAFA] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
                {card.badge}
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {card.checks.map((check) => (
                <GuidanceCheck key={check.label} {...check} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

type CaseGuidanceCheck = {
  label: string;
  value: string;
  active: boolean;
};

type CaseGuidanceCard = {
  title: string;
  summary: string;
  badge: string;
  checks: CaseGuidanceCheck[];
};

function GuidanceCheck({ label, value, active }: CaseGuidanceCheck) {
  return (
    <div className={`rounded-md border px-3 py-2.5 ${active ? "border-[#D83B01]/30 bg-[#FBEAE0]" : "border-[#E1E1E1] bg-[#FAFAFA]"}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${active ? "text-[#B5340A]" : "text-[#616161]"}`}>{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#242424]">{value}</p>
    </div>
  );
}

function buildOperatorCard(signal?: GroundingSignal): CaseGuidanceCard | null {
  if (!signal) return null;
  return {
    title: "Tour/operator verification",
    summary: "Verify identity before paying. TrustPass checks whether the seller is asking for advance transfer without the basic operator proof tourists need.",
    badge: "Tour payment",
    checks: [
      {
        label: "Advance payment",
        value: asBoolean(signal.metadata?.has_full_advance_payment) ? "Full advance payment was detected." : "No full advance payment signal detected.",
        active: asBoolean(signal.metadata?.has_full_advance_payment)
      },
      {
        label: "Account identity",
        value: asBoolean(signal.metadata?.has_personal_account) ? "Payment appears to go to a personal account." : "No personal account signal detected.",
        active: asBoolean(signal.metadata?.has_personal_account)
      },
      {
        label: "License proof",
        value: asBoolean(signal.metadata?.has_missing_license) ? "Operator or TAT license details are missing." : "License concern was not detected.",
        active: asBoolean(signal.metadata?.has_missing_license)
      },
      {
        label: "Safer path",
        value: "Ask for license details, written cancellation terms, and an official receipt before paying.",
        active: false
      }
    ]
  };
}

function buildQrCard(signal?: GroundingSignal): CaseGuidanceCard | null {
  if (!signal) return null;
  return {
    title: "QR/payment identity check",
    summary: "The key issue is whether the account receiving money belongs to the business. A mismatch makes refunds and disputes much harder.",
    badge: "Payment",
    checks: [
      {
        label: "Account match",
        value: asBoolean(signal.metadata?.has_account_mismatch) ? "Account name appears personal or mismatched." : "No clear mismatch detected.",
        active: asBoolean(signal.metadata?.has_account_mismatch)
      },
      {
        label: "Receipt",
        value: "Ask for an itemized receipt that names the business before sending a large payment.",
        active: false
      },
      {
        label: "Dispute risk",
        value: "If the account is personal, keep a screenshot of QR code, account name, amount, and chat context.",
        active: true
      },
      {
        label: "Safer path",
        value: "Pay at the counter or through the official booking platform when possible.",
        active: false
      }
    ]
  };
}

function buildRentalDocumentCard(signal?: GroundingSignal): CaseGuidanceCard | null {
  if (!signal) return null;
  return {
    title: "Rental/passport protection",
    summary: "TrustPass treats original passport retention as a leverage risk. Safer rental terms should avoid handing over the original document.",
    badge: "Rental",
    checks: [
      {
        label: "Passport",
        value: asBoolean(signal.metadata?.has_original_passport_request) ? "Original passport requested as deposit." : "No original passport request detected.",
        active: asBoolean(signal.metadata?.has_original_passport_request)
      },
      {
        label: "Alternative",
        value: "Offer a passport copy plus refundable cash/card deposit instead.",
        active: false
      },
      {
        label: "Before use",
        value: "Take photos/video of all sides, fuel level, helmet, and existing scratches.",
        active: false
      },
      {
        label: "Paper trail",
        value: "Keep the contract, receipt, shop name, and deposit terms.",
        active: false
      }
    ]
  };
}

function buildDamageClaimCard(signal?: GroundingSignal): CaseGuidanceCard | null {
  if (!signal) return null;
  const amount = asNumber(signal.metadata?.damage_amount_baht);
  const severity = asString(signal.metadata?.damage_amount_severity);
  const ratio = asNumber(signal.metadata?.amount_ratio_to_minor_damage_reference);
  return {
    title: "Rental damage dispute",
    summary: "The product separates legitimate damage claims from pressure patterns: large immediate cash demands, no receipt, and no neutral inspection.",
    badge: "Damage claim",
    checks: [
      {
        label: "Demand amount",
        value: amount ? `${amount.toLocaleString("en-US")} THB${ratio ? `, about ${ratio}x the demo minor-damage threshold` : ""}.` : "No amount detected.",
        active: Boolean(amount && severity && ["large", "extreme"].includes(severity))
      },
      {
        label: "Cash demand",
        value: asBoolean(signal.metadata?.has_large_cash_demand) || asBoolean(signal.metadata?.has_immediate_cash_payment)
          ? "Immediate or large cash demand detected."
          : "No large immediate cash demand detected.",
        active: asBoolean(signal.metadata?.has_large_cash_demand) || asBoolean(signal.metadata?.has_immediate_cash_payment)
      },
      {
        label: "Receipt",
        value: asBoolean(signal.metadata?.has_no_receipt) ? "No receipt or written estimate was detected." : "Receipt concern was not detected.",
        active: asBoolean(signal.metadata?.has_no_receipt)
      },
      {
        label: "Neutral process",
        value: "Ask for written estimate, photos, contract terms, insurer/platform, or neutral inspection.",
        active: false
      },
      {
        label: "If pressured",
        value: "Move to a public area and contact hotel staff, insurer, platform support, or Tourist Police 1155.",
        active: true
      }
    ]
  };
}

function buildJobLureCard(signal?: GroundingSignal): CaseGuidanceCard | null {
  if (!signal) return null;
  return {
    title: "Fake job/casting emergency protocol",
    summary: "This pattern is safety-first. Recruitment plus controlled pickup, secrecy, and border travel should be treated as a stop condition.",
    badge: "Emergency",
    checks: [
      {
        label: "Controlled pickup",
        value: asBoolean(signal.metadata?.has_controlled_pickup) ? "Pickup or free transport was detected." : "No pickup signal detected.",
        active: asBoolean(signal.metadata?.has_controlled_pickup)
      },
      {
        label: "Border travel",
        value: asBoolean(signal.metadata?.has_border_travel) ? "Mae Sot, Myanmar, or border travel was detected." : "No border travel signal detected.",
        active: asBoolean(signal.metadata?.has_border_travel)
      },
      {
        label: "Secrecy",
        value: asBoolean(signal.metadata?.has_secrecy_instruction) ? "Secrecy or isolation instruction was detected." : "No secrecy signal detected.",
        active: asBoolean(signal.metadata?.has_secrecy_instruction)
      },
      {
        label: "Stop action",
        value: "Do not travel to the pickup point. Stay public and contact hotel staff, Tourist Police 1155, or embassy.",
        active: true
      }
    ]
  };
}

function GroundingBadge({ status }: { status: PriceComparison["result"] }) {
  const style =
    status === "within"
      ? { label: "Normal", bg: "#E8F5E9", text: "#107C10" }
      : status === "above"
      ? { label: "Slightly high", bg: "#FFF4CE", text: "#7A5A00" }
      : { label: "Unusually high", bg: "#FBE9EA", text: "#A4262C" };

  return (
    <span className="rounded-xl px-2 py-1 text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: style.bg, color: style.text }}>
      {style.label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#FAFAFA] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#616161]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#242424]">{value}</p>
    </div>
  );
}

function getPriceComparisons(metadata: Record<string, unknown> | undefined): PriceComparison[] {
  const raw = metadata?.price_comparisons;
  if (!Array.isArray(raw)) return [];

  return raw.filter((item): item is PriceComparison => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<PriceComparison>;
    return (
      typeof candidate.item_name === "string" &&
      typeof candidate.listed_price_baht === "number" &&
      Array.isArray(candidate.normal_range_baht) &&
      candidate.normal_range_baht.length === 2 &&
      typeof candidate.normal_range_baht[0] === "number" &&
      typeof candidate.normal_range_baht[1] === "number" &&
      typeof candidate.tier_label === "string" &&
      (candidate.result === "within" || candidate.result === "above" || candidate.result === "far_above") &&
      typeof candidate.explanation === "string"
    );
  });
}

function getTaxiGrounding(fareMetadata?: Record<string, unknown>, routeMetadata?: Record<string, unknown>) {
  if (!fareMetadata && !routeMetadata) return null;

  const estimate = asNumberPair(fareMetadata?.taxi_meter_estimate_baht ?? fareMetadata?.baseline_range_baht);
  const distance = asNumber(routeMetadata?.route_distance_km ?? fareMetadata?.route_distance_km);
  const quoted = asNumber(fareMetadata?.quoted_fare_baht);
  const ratio = asNumber(fareMetadata?.fare_ratio_to_baseline);
  const source = asString(routeMetadata?.grounding_source ?? fareMetadata?.grounding_source) || "fallback";

  if (!estimate && !distance && !quoted) return null;

  return {
    estimate,
    distance,
    quoted,
    ratio,
    source,
    origin: asString(routeMetadata?.route_origin ?? fareMetadata?.route_origin),
    destination: asString(routeMetadata?.route_destination ?? fareMetadata?.route_destination)
  };
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown) {
  return value === true;
}

function asNumberPair(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  return typeof value[0] === "number" && typeof value[1] === "number" ? [value[0], value[1]] : null;
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
  const support = supportPlanFor(riskLevel);
  return (
    <Section title="Recommended support level">
      <div className="grid gap-3 sm:grid-cols-3">
        {support.map((item) => (
          <ContactCard
            key={item.title}
            title={item.title}
            subtitle={item.subtitle}
            value={item.value}
            icon={item.icon}
            highlight={item.highlight}
          />
        ))}
      </div>
      <p className="mt-3 rounded-md bg-[#FAFAFA] px-3 py-2.5 text-xs leading-relaxed text-[#616161]">
        {contactRecommendation}
      </p>
    </Section>
  );
}

function supportPlanFor(riskLevel: RiskLevel) {
  if (riskLevel === "Emergency") {
    return [
      {
        title: "Immediate help",
        subtitle: "Tourist Police",
        value: "Call 1155 from a safe public place",
        icon: <PhoneCall className="h-4 w-4" />,
        highlight: true
      },
      {
        title: "Safety backup",
        subtitle: "Hotel / Embassy",
        value: "Ask staff or consulate to help now",
        icon: <ShieldCheck className="h-4 w-4" />
      },
      {
        title: "Medical emergency",
        subtitle: "Emergency medical",
        value: "Call 1669 if injured or unsafe",
        icon: <AlertTriangle className="h-4 w-4" />
      }
    ];
  }

  if (riskLevel === "High") {
    return [
      {
        title: "First step",
        subtitle: "Pause and verify",
        value: "Do not pay, travel, or hand over documents yet",
        icon: <ShieldCheck className="h-4 w-4" />,
        highlight: true
      },
      {
        title: "Practical help",
        subtitle: "Hotel / official channel",
        value: "Ask front desk or platform support to verify",
        icon: <CheckCircle2 className="h-4 w-4" />
      },
      {
        title: "Escalate if pressured",
        subtitle: "Tourist Police",
        value: "Call 1155 if threatened or blocked",
        icon: <PhoneCall className="h-4 w-4" />
      }
    ];
  }

  if (riskLevel === "Caution") {
    return [
      {
        title: "First step",
        subtitle: "Verify calmly",
        value: "Confirm price, identity, and receipt before paying",
        icon: <CheckCircle2 className="h-4 w-4" />,
        highlight: true
      },
      {
        title: "Second opinion",
        subtitle: "Hotel / trusted local",
        value: "Ask staff if the price or terms feel unclear",
        icon: <ShieldCheck className="h-4 w-4" />
      },
      {
        title: "Escalate only if needed",
        subtitle: "Tourist Police",
        value: "Use 1155 only for pressure, threats, or refusal to let you leave",
        icon: <PhoneCall className="h-4 w-4" />
      }
    ];
  }

  return [
    {
      title: "No escalation",
      subtitle: "Continue normally",
      value: "No police or official contact needed",
      icon: <CheckCircle2 className="h-4 w-4" />,
      highlight: true
    },
    {
      title: "Basic check",
      subtitle: "Confirm details",
      value: "Confirm destination, price, menu, or receipt",
      icon: <ShieldCheck className="h-4 w-4" />
    },
    {
      title: "If things change",
      subtitle: "Re-check later",
      value: "Use TrustPass again if pressure or hidden fees appear",
      icon: <AlertTriangle className="h-4 w-4" />
    }
  ];
}

function ContactCard({
  title,
  subtitle,
  value,
  icon,
  highlight
}: {
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
        Eligible Caution-or-higher signals can contribute to regional intelligence
        <span className="ml-2 rounded-xl border border-[#E1E1E1] bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#616161]">
          {source === "azure-openai" ? "Azure OpenAI" : "Local rule engine"}
        </span>
      </p>
    </footer>
  );
}

function situationToRiskResult(response: CompletedSituation): RiskCheckResult {
  return {
    risk_level: response.risk_level,
    category: response.category,
    suspicious_signals: response.signals,
    why_it_matters: response.why_it_matters,
    safe_next_steps: response.next_steps,
    thai_phrase: response.thai_phrase,
    evidence_to_save: response.evidence_to_save,
    contact_recommendation: response.contact_recommendation,
    incident_report_summary: response.report,
    grounding: response.grounding,
    source: response.source
  };
}

function persistCase(result: RiskCheckResult, city: string) {
  if (typeof window === "undefined") return;
  if (!isDashboardEligible(result)) return;

  const now = new Date().toISOString();
  const sessionReport = {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now,
    city,
    category: result.category,
    risk_level: result.risk_level,
    risk_score: riskScoreFor(result),
    signal_count: result.suspicious_signals?.length || 0
  };

  const sessionExisting = JSON.parse(window.sessionStorage.getItem("trustpass-session-cases") || "[]");
  sessionExisting.unshift(sessionReport);
  window.sessionStorage.setItem("trustpass-session-cases", JSON.stringify(sessionExisting.slice(0, 50)));

  const existing = JSON.parse(window.localStorage.getItem("trustpass-cases") || "[]");
  existing.unshift({
    city,
    category: result.category,
    riskLevel: result.risk_level,
    signals: result.suspicious_signals,
    createdAt: now
  });
  window.localStorage.setItem("trustpass-cases", JSON.stringify(existing.slice(0, 20)));
}

function isDashboardEligible(result: RiskCheckResult) {
  if (result.risk_level === "Low") return false;
  if (result.category === "No strong scam pattern detected") return false;
  if (result.category === "Outside TrustPass scope") return false;
  if (result.category === "Evidence mismatch") return false;
  return true;
}

function formatEvidenceTopic(topic: string) {
  const labels: Record<string, string> = {
    transport: "Taxi / transport",
    food_menu: "Food / menu",
    tour_payment: "Tour payment",
    qr_payment: "QR payment",
    rental_document: "Rental document",
    damage_claim: "Damage claim",
    job_lure: "Job / casting risk",
    unknown: "Unknown"
  };
  return labels[topic] || "Unknown";
}
