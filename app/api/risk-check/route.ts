import { NextResponse } from "next/server";
import { analyzeSituation, normalizeAnalyzeRequest, toLegacyRiskResult } from "@/lib/situation-service";
import type { RiskCheckRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<RiskCheckRequest>;
  const payload = normalizeAnalyzeRequest(body);

  if (!payload.message && !payload.extractedText && !payload.evidenceText) {
    return NextResponse.json(
      {
        error: "Please describe the situation or attach evidence before checking risk."
      },
      { status: 400 }
    );
  }

  const result = await analyzeSituation(
    {
      message: payload.message,
      city: payload.city,
      language: payload.language,
      incidentDateIso: payload.incidentDateIso || new Date().toISOString(),
      evidenceText: payload.evidenceText || payload.extractedText,
      userLocation: payload.userLocation,
      attachmentsMetadata: payload.attachmentsMetadata,
      clarificationAnswers: payload.clarificationAnswers
    },
    { allowClarification: false }
  );

  return NextResponse.json(toLegacyRiskResult(result));
}
