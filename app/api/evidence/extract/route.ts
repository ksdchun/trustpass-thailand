import { NextResponse } from "next/server";
import { extractEvidenceFromFile } from "@/lib/evidence-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  return NextResponse.json(await extractEvidenceFromFile(file));
}
