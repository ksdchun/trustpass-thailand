import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/telemetry";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    logEvent("trustpass.feedback", {
      request_id: typeof body?.request_id === "string" ? body.request_id : null,
      rating: typeof body?.rating === "string" ? body.rating : null,
      reason: typeof body?.reason === "string" ? body.reason : null
    });
  } catch {
    // Swallow errors silently so UI never breaks.
  }

  return NextResponse.json({ ok: true });
}
