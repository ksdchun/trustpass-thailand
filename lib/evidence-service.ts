import { extractEvidenceHints } from "@/lib/evidence-hints";
import type { EvidenceExtractResult } from "@/lib/types";

export async function extractEvidenceFromFile(file: File): Promise<EvidenceExtractResult> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
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
        return {
          extractedText,
          detectedFields: {
            source: "azure-document-intelligence",
            pages: result.analyzeResult?.pages?.length || 0,
            hints: extractEvidenceHints(extractedText),
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
  return {
    extractedText,
    detectedFields: {
      source: "fallback",
      pages: 0,
      hints: extractEvidenceHints(extractedText),
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
  return "Uploaded evidence could not be read. Paste key text into the chat or use evidence related to menu, tour, rental, passport, casting, job, LINE, QR, or WeChat.";
}
