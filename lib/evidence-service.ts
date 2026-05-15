import { extractEvidenceHints } from "@/lib/evidence-hints";
import { classifyTextRelevance } from "@/lib/relevance";
import type { EvidenceExtractResult } from "@/lib/types";

export async function extractEvidenceFromFile(file: File): Promise<EvidenceExtractResult> {
  if (isDemoMode()) {
    const cached = demoModeExtract(file.name);
    if (cached) return cached;
  }

  const endpoint = getDocumentIntelligenceEndpoint();
  const key = getDocumentIntelligenceKey();
  const timeoutMs = Number(process.env.AZURE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS || 10000);

  if (!endpoint || !key) {
    return fallbackEvidence(file.name, "Azure Document Intelligence is not configured.");
  }

  try {
    const bytes = await file.arrayBuffer();
    const analyzeResponse = await fetchWithTimeout(
      `${endpoint.replace(/\/$/, "")}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30`,
      {
        method: "POST",
        headers: {
          "content-type": file.type || "application/octet-stream",
          "Ocp-Apim-Subscription-Key": key
        },
        body: bytes
      },
      timeoutMs
    );

    const operationLocation = analyzeResponse.headers.get("operation-location");
    if (!analyzeResponse.ok || !operationLocation) {
      return fallbackEvidence(file.name, "Azure OCR request was not accepted.");
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      const resultResponse = await fetchWithTimeout(
        operationLocation,
        {
          headers: { "Ocp-Apim-Subscription-Key": key }
        },
        timeoutMs
      );
      const result = await resultResponse.json();

      if (result.status === "succeeded") {
        const extractedText = result.analyzeResult?.content || "";
        const relevance = classifyTextRelevance(extractedText, "evidence");
        return {
          extractedText,
          detectedFields: {
            source: "azure-document-intelligence",
            pages: result.analyzeResult?.pages?.length || 0,
            hints: extractEvidenceHints(extractedText),
            relevance: relevance.relevance,
            relevance_reason: relevance.reason,
            evidence_topic: relevance.topic,
            usable_as_case_evidence: relevance.usable_as_case_evidence,
            recoverable: extractedText.trim().length === 0,
            note: extractedText.trim() ? undefined : "OCR succeeded but no readable text was detected. Ask the user to paste key text."
          }
        };
      }

      if (result.status === "failed") break;
    }

    return fallbackEvidence(file.name, "Azure OCR timed out before a completed result was returned.");
  } catch {
    return fallbackEvidence(file.name, "Azure OCR failed; ask the user to paste key text if needed.");
  }
}

function getDocumentIntelligenceEndpoint() {
  return (
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT ||
    process.env.AZURE_AI_SERVICES_ENDPOINT ||
    process.env.AZURE_COGNITIVE_SERVICES_ENDPOINT ||
    inferCognitiveServicesEndpoint(process.env.AZURE_OPENAI_ENDPOINT)
  )?.replace(/\/$/, "");
}

function getDocumentIntelligenceKey() {
  return (
    process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY ||
    process.env.AZURE_AI_SERVICES_API_KEY ||
    process.env.AZURE_COGNITIVE_SERVICES_KEY ||
    process.env.AZURE_OPENAI_API_KEY
  );
}

function inferCognitiveServicesEndpoint(endpoint?: string) {
  if (!endpoint) return undefined;

  try {
    const url = new URL(endpoint);
    if (url.hostname.endsWith(".cognitiveservices.azure.com")) {
      return url.origin;
    }

    if (url.hostname.endsWith(".services.ai.azure.com")) {
      const resourceName = url.hostname.replace(".services.ai.azure.com", "");
      return `https://${resourceName}.cognitiveservices.azure.com`;
    }

    if (url.hostname.endsWith(".openai.azure.com")) {
      const resourceName = url.hostname.replace(".openai.azure.com", "");
      return `https://${resourceName}.cognitiveservices.azure.com`;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackEvidence(fileName: string, note: string): EvidenceExtractResult {
  const extractedText = demoExtract(fileName);
  const relevance = classifyTextRelevance(extractedText, "evidence");
  return {
    extractedText,
    detectedFields: {
      source: "fallback",
      pages: 0,
      hints: extractEvidenceHints(extractedText),
      relevance: relevance.relevance,
      relevance_reason: relevance.reason,
      evidence_topic: relevance.topic,
      usable_as_case_evidence: relevance.usable_as_case_evidence,
      recoverable: true,
      note
    }
  };
}

function demoExtract(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.includes("menu") || lower.includes("jay") || lower.includes("fai")) {
    return "Crab omelette 1500 baht. Drunken noodles 800 baht. Menu photo with no restaurant name visible.";
  }
  if (lower.includes("job") || lower.includes("casting") || lower.includes("wechat")) {
    return "Paid casting in Thailand. Free airport pickup. Driver will take you to Mae Sot for final interview. Do not tell hotel or friends.";
  }
  if (lower.includes("tour") || lower.includes("line") || lower.includes("qr")) {
    return "Special island tour. Full payment today by bank transfer to personal account. No license number shown. Limited time offer.";
  }
  if (lower.includes("rental") || lower.includes("passport")) {
    return "Motorbike rental agreement requires original passport deposit until vehicle is returned. Damage policy unclear.";
  }
  return "";
}

/**
 * High-quality canned OCR for DEMO_MODE recordings.
 *
 * Real OCR can stall during a live recording, return partial Thai text, or
 * miss diacritics. For the cinematic record-and-replay flow we short-circuit
 * to hand-tuned, fully-formed transcripts of the hero evidence images. These
 * mirror the message keywords used by `tryLoadDemoModeCached` in
 * `lib/situation-service.ts`, so a DEMO_MODE pass produces consistent
 * end-to-end output (OCR + analysis) for every recorded take.
 */
function demoModeExtract(fileName: string): EvidenceExtractResult | null {
  const lower = fileName.toLowerCase();

  if (lower.includes("wechat") || lower.includes("casting") || lower.includes("job") || lower.includes("wang")) {
    return buildDemoEvidence(
      [
        "WeChat • Casting Director (Bangkok)",
        "10:42 PM • Online",
        "—",
        "Hi! We are casting Chinese tourists for a TV commercial.",
        "Free airport pickup, paid in cash same day (15,000 THB).",
        "Driver Khun A will collect you 6:30 AM at hotel lobby — black Toyota Fortuner.",
        "Final interview is at our studio in Mae Sot near the Myanmar border.",
        "Please do NOT tell your hotel or friends — director wants the audition kept private.",
        "Bring passport, phone (we will hold it during the shoot), and one set of casual clothes.",
        "Reply '同意' to confirm. See you tomorrow ❤️"
      ].join("\n"),
      "job_lure"
    );
  }

  if (lower.includes("taxi") || lower.includes("meter") || lower.includes("siam") || lower.includes("wat-pho") || lower.includes("watpho")) {
    return buildDemoEvidence(
      [
        "Hotel concierge note — Taxi quote",
        "Pickup: Siam BTS exit 4",
        "Destination: Wat Pho",
        "Driver said meter is broken.",
        "Fixed fare: 800 THB cash before getting in.",
        "Vehicle: green-yellow Bangkok taxi, plate ตม 5xxx",
        "Time: 19:14"
      ].join("\n"),
      "transport"
    );
  }

  if (lower.includes("motorbike") || lower.includes("passport") || lower.includes("rental") || lower.includes("scooter")) {
    return buildDemoEvidence(
      [
        "Soi Rat-U-Thit Scooter Rental — Patong, Phuket",
        "—",
        "Rental period: 3 days, 250 THB/day",
        "Deposit: original passport HELD at counter until return.",
        "Helmet: 1 included.",
        "Damage policy: customer pays cash at return time, no insurer, no police report needed.",
        "Signature: __________  Passport No: ___________",
        "Shop hours: 09:00 - 22:00"
      ].join("\n"),
      "rental_document"
    );
  }

  if (lower.includes("line") || lower.includes("tour") || lower.includes("phi-phi") || lower.includes("phi_phi") || lower.includes("qr")) {
    return buildDemoEvidence(
      [
        "LINE • Andaman Explorer Tours (unofficial)",
        "—",
        "Sawadee ka! Special island tour package:",
        "Phi Phi + Maya Bay + Bamboo Island + Lunch + Snorkeling",
        "2,999 THB per person, full payment today to confirm booking.",
        "Transfer to personal Thai bank account:",
        "  Bank: Kasikorn (KBank)",
        "  Account name: Nattapong S.",
        "  Account no: 123-4-56789-0",
        "Limited seats! Price goes up tomorrow.",
        "No TAT license shown. We are a local team, not a company."
      ].join("\n"),
      "tour_payment"
    );
  }

  return null;
}

function buildDemoEvidence(extractedText: string, expectedTopic: string): EvidenceExtractResult {
  const relevance = classifyTextRelevance(extractedText, "evidence");
  return {
    extractedText,
    detectedFields: {
      source: "demo-mode-cache",
      pages: 1,
      hints: extractEvidenceHints(extractedText),
      relevance: relevance.relevance,
      relevance_reason: `DEMO_MODE active — using hand-tuned ${expectedTopic} transcript for cinematic recording continuity.`,
      evidence_topic: relevance.topic,
      usable_as_case_evidence: true,
      recoverable: false,
      note: "DEMO_MODE active — OCR bypassed in favor of curated transcript."
    }
  };
}

function isDemoMode() {
  const value = process.env.DEMO_MODE;
  if (!value) return false;
  return value.toLowerCase() === "true" || value === "1";
}
