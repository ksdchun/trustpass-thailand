import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as { messages?: ChatMessage[] };
  const userMessages = Array.isArray(body.messages)
    ? body.messages
        .filter((message) => ["user", "assistant"].includes(message.role))
        .map((message) => ({
          role: message.role,
          content: String(message.content || "").slice(0, 4000)
        }))
        .filter((message) => message.content.trim())
    : [];

  if (userMessages.length === 0) {
    return NextResponse.json({ error: "Send at least one message." }, { status: 400 });
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";

  if (!endpoint || !apiKey || !deployment) {
    return NextResponse.json(
      {
        error: "Azure OpenAI is not configured. Check .env.local."
      },
      { status: 500 }
    );
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a helpful assistant used only for testing the TrustPass Thailand Azure OpenAI connection. Answer normally and concisely."
    },
    ...userMessages
  ];

  try {
    const normalizedEndpoint = endpoint.replace(/\/$/, "");
    const openAICompatibleBaseUrl = getOpenAICompatibleBaseUrl(normalizedEndpoint);
    const response = await fetch(
      openAICompatibleBaseUrl
        ? `${openAICompatibleBaseUrl}/chat/completions`
        : `${normalizedEndpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "api-key": apiKey,
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: deployment,
          messages,
          temperature: 0.7,
          max_tokens: 700
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Azure OpenAI request failed.",
          detail: data?.error?.message || "Unknown Azure error."
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      role: "assistant",
      content: data?.choices?.[0]?.message?.content || "No response returned.",
      source: "azure-openai",
      deployment
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Azure OpenAI request failed.",
        detail: error instanceof Error ? error.message : "Unknown error."
      },
      { status: 500 }
    );
  }
}

function getOpenAICompatibleBaseUrl(endpoint: string) {
  if (endpoint.endsWith("/openai/v1")) return endpoint;
  if (endpoint.includes(".services.ai.azure.com") && endpoint.includes("/api/projects/")) {
    return `${endpoint}/openai/v1`;
  }
  return null;
}
