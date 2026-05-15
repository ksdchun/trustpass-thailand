import { NextResponse } from "next/server";
import { isIntelligenceEligible, recordCheck } from "@/lib/intelligence-store";
import { analyzeSituation, toLegacyRiskResult } from "@/lib/situation-service";
import type { SituationAnalyzeRequest } from "@/lib/types";

export const runtime = "nodejs";

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif"
]);

const MAX_IMAGE_DATA_URL_LENGTH = 8 * 1024 * 1024; // ~8 MB after base64 encoding

export async function POST(request: Request) {
  let body: Partial<SituationAnalyzeRequest>;
  try {
    body = (await request.json()) as Partial<SituationAnalyzeRequest>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const evidenceImage = sanitizeEvidenceImage(body.evidenceImage);

  const payload: SituationAnalyzeRequest = {
    message: body.message?.trim() || "",
    city: body.city || "Bangkok",
    language: body.language || "English",
    incidentDateIso: body.incidentDateIso || new Date().toISOString(),
    evidenceText: body.evidenceText?.trim(),
    evidenceRelevance: body.evidenceRelevance,
    userLocation: body.userLocation,
    attachmentsMetadata: body.attachmentsMetadata || [],
    clarificationAnswers: body.clarificationAnswers,
    evidenceImage: evidenceImage ?? undefined
  };

  if (!payload.message && !payload.evidenceText && !payload.evidenceImage) {
    return NextResponse.json(
      {
        error: "Please describe the situation, paste evidence text, or attach an image."
      },
      { status: 400 }
    );
  }

  const response = await analyzeSituation(payload, { allowClarification: true });

  if (response.status === "completed") {
    const result = toLegacyRiskResult(response);
    if (isIntelligenceEligible(result)) {
      try {
        recordCheck(result, payload.city);
      } catch (error) {
        console.error("Failed to record completed situation analysis in intelligence store", error);
      }
    }
  } else if (response.status === "degraded") {
    const fallback = response.fallback_result;
    const legacy = toLegacyRiskResult({ ...fallback, status: "completed" });
    if (isIntelligenceEligible(legacy)) {
      try {
        recordCheck(legacy, payload.city);
      } catch (error) {
        console.error("Failed to record degraded situation analysis in intelligence store", error);
      }
    }
  }

  return NextResponse.json(response);
}

function sanitizeEvidenceImage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (raw.length === 0) return null;
  if (raw.length > MAX_IMAGE_DATA_URL_LENGTH) return null;

  const match = /^data:([a-z]+\/[a-z0-9.+-]+)(?:;[a-z0-9-]+=[a-z0-9.+/=-]+)*;base64,/i.exec(raw);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  if (!SUPPORTED_IMAGE_MIME_TYPES.has(mime)) return null;
  return raw;
}
