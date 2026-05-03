import { NextResponse } from "next/server";
import { isIntelligenceEligible, recordCheck } from "@/lib/intelligence-store";
import { analyzeSituation, toLegacyRiskResult } from "@/lib/situation-service";
import type { SituationAnalyzeRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<SituationAnalyzeRequest>;
  const payload: SituationAnalyzeRequest = {
    message: body.message?.trim() || "",
    city: body.city || "Bangkok",
    language: body.language || "English",
    incidentDateIso: body.incidentDateIso || new Date().toISOString(),
    evidenceText: body.evidenceText?.trim(),
    evidenceRelevance: body.evidenceRelevance,
    userLocation: body.userLocation,
    attachmentsMetadata: body.attachmentsMetadata || [],
    clarificationAnswers: body.clarificationAnswers
  };

  if (!payload.message && !payload.evidenceText) {
    return NextResponse.json(
      {
        error: "Please describe the situation or provide evidenceText."
      },
      { status: 400 }
    );
  }

  const response = await analyzeSituation(payload, { allowClarification: true });

  if (response.status === "completed") {
    const result = toLegacyRiskResult(response);
    if (!isIntelligenceEligible(result)) return NextResponse.json(response);

    try {
      recordCheck(result, payload.city);
    } catch (error) {
      console.error("Failed to record completed situation analysis in intelligence store", error);
    }
  }

  return NextResponse.json(response);
}
