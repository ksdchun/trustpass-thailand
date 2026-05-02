import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildPrompt, classifyWithLocalRules, normalizeRiskResult } from "@/lib/risk-engine";
import type { RiskCheckRequest } from "@/lib/types";

export const runtime = "nodejs";

const REQUEST_TIMEOUT_MS = 5000;

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
      { error: "Please describe the situation or attach evidence before checking risk." },
      { status: 400 }
    );
  }

  const fallback = classifyWithLocalRules(payload);
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

  if (!endpoint || !apiKey || !deployment) {
    return NextResponse.json(fallback);
  }

  const baseURL = endpoint.replace(/\/$/, "");

  try {
    const client = new OpenAI({
      baseURL,
      apiKey,
      timeout: REQUEST_TIMEOUT_MS
    });

    const completion = await client.chat.completions.create({
      model: deployment,
      messages: buildPrompt(payload, fallback),
      temperature: 0.2,
      max_tokens: 900,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;
    return NextResponse.json(normalizeRiskResult(parsed, fallback, "azure-openai"));
  } catch (error) {
    console.error(
      `[risk-check] Azure call failed (baseURL=${baseURL}, deployment=${deployment}), using fallback:`,
      error
    );
    return NextResponse.json(fallback);
  }
}
