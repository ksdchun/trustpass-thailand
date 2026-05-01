import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !key) {
    return NextResponse.json({
      extractedText: demoExtract(file.name),
      detectedFields: {
        source: "demo-fallback",
        note: "Evidence extraction used the sample text pathway."
      }
    });
  }

  try {
    const bytes = await file.arrayBuffer();
    const analyzeResponse = await fetch(
      `${endpoint.replace(/\/$/, "")}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30`,
      {
        method: "POST",
        headers: {
          "content-type": file.type || "application/octet-stream",
          "Ocp-Apim-Subscription-Key": key
        },
        body: bytes
      }
    );

    const operationLocation = analyzeResponse.headers.get("operation-location");
    if (!analyzeResponse.ok || !operationLocation) {
      return NextResponse.json({ extractedText: demoExtract(file.name), detectedFields: { source: "demo-fallback" } });
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      const resultResponse = await fetch(operationLocation, {
        headers: { "Ocp-Apim-Subscription-Key": key }
      });
      const result = await resultResponse.json();
      if (result.status === "succeeded") {
        return NextResponse.json({
          extractedText: result.analyzeResult?.content || "",
          detectedFields: {
            source: "azure-document-intelligence",
            pages: result.analyzeResult?.pages?.length || 0
          }
        });
      }
      if (result.status === "failed") break;
    }
  } catch {
    // Fall through to deterministic sample extraction for resilient presentation.
  }

  return NextResponse.json({ extractedText: demoExtract(file.name), detectedFields: { source: "demo-fallback" } });
}

function demoExtract(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.includes("job") || lower.includes("casting") || lower.includes("wechat")) {
    return "Paid casting in Thailand. Free airport pickup. Driver will take you to Mae Sot for final interview. Do not tell hotel or friends.";
  }
  if (lower.includes("tour") || lower.includes("line") || lower.includes("qr")) {
    return "Special island tour. Full payment today by bank transfer to personal account. No license number shown. Limited time offer.";
  }
  if (lower.includes("rental") || lower.includes("passport")) {
    return "Motorbike rental agreement requires original passport deposit until vehicle is returned. Damage policy unclear.";
  }
  return "Uploaded evidence could not be read. Paste key text into the chat or use evidence related to tour, rental, passport, casting, job, line, QR, or WeChat.";
}
