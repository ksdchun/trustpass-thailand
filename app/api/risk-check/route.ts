import { NextResponse } from "next/server";
import { isIntelligenceEligible, recordCheck } from "@/lib/intelligence-store";
import { analyzeSituation, normalizeAnalyzeRequest, toLegacyRiskResult } from "@/lib/situation-service";
import type { RiskCheckRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<RiskCheckRequest>;
  const payload = normalizeAnalyzeRequest(body);

  if (!payload.message && !payload.extractedText && !payload.evidenceText) {
    return NextResponse.json(
      { error: "Please describe the situation or attach evidence before checking risk." },
      { status: 400 }
    );
  }

  const response = await analyzeSituation(
    {
      message: payload.message,
      city: payload.city,
      language: payload.language,
      incidentDateIso: payload.incidentDateIso || new Date().toISOString(),
      evidenceText: payload.evidenceText || payload.extractedText,
      evidenceRelevance: payload.evidenceRelevance,
      userLocation: payload.userLocation,
      attachmentsMetadata: payload.attachmentsMetadata,
      clarificationAnswers: payload.clarificationAnswers
    },
    { allowClarification: false }
  );

  const result = toLegacyRiskResult(response);

  if (response.status === "completed" && isIntelligenceEligible(result)) {
    try {
      recordCheck(result, payload.city);
    } catch (error) {
      console.error("Failed to record check in intelligence store", error);
    }
  }

  return NextResponse.json(result);
}
