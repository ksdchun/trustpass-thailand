import { NextResponse } from "next/server";
import { buildPrompt, classifyWithLocalRules, normalizeRiskResult } from "@/lib/risk-engine";
import type { RiskCheckRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<RiskCheckRequest>;
  const payload: RiskCheckRequest = {
    message: body.message?.trim() || "",
    city: body.city || "Bangkok",
    language: body.language || "English",
    extractedText: body.extractedText?.trim(),
    attachmentsMetadata: body.attachmentsMetadata || []
  };

  if (!payload.message && !payload.extractedText) {
    return NextResponse.json(
      {
        error: "Please describe the situation or attach evidence before checking risk."
      },
      { status: 400 }
    );
  }

  const fallback = classifyWithLocalRules(payload);
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";

  if (!endpoint || !apiKey || !deployment) {
    return NextResponse.json(fallback);
  }

  try {
    const messages = buildPrompt(payload, fallback);
    const response = await fetch(
      `${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "api-key": apiKey
        },
        body: JSON.stringify({
          messages,
          temperature: 0.2,
          max_tokens: 900,
          response_format: { type: "json_object" }
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json(fallback);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;
    return NextResponse.json(normalizeRiskResult(parsed, fallback, "azure-openai"));
  } catch {
    return NextResponse.json(fallback);
  }
}
