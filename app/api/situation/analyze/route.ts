import { NextResponse } from "next/server";
import { analyzeSituation } from "@/lib/situation-service";
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

  return NextResponse.json(await analyzeSituation(payload, { allowClarification: true }));
}
