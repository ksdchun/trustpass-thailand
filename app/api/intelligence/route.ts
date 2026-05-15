import { NextRequest, NextResponse } from "next/server";
import {
  getRecentReports,
  getCityStats,
  getKPIs,
  getSimilarIncidentCount,
  getHotelReferralStats,
  recordReferralOnly,
} from "@/lib/intelligence-store";
import { lookupOperator, lookupOperatorFromText } from "@/lib/grounding-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { action?: string; referrer?: string } | null;
    if (body && body.action === "record_referral" && typeof body.referrer === "string") {
      const ok = recordReferralOnly(body.referrer);
      return NextResponse.json({ ok });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to record referral", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const kpis = getKPIs();
    const cityStats = getCityStats();
    const recentReports = getRecentReports(10);
    const hotelReferrals = getHotelReferralStats();

    const searchParams = request.nextUrl.searchParams;

    const similarCategory = searchParams.get("similar_category") || undefined;
    const similarLocation = searchParams.get("similar_location") || undefined;
    const windowDaysRaw = searchParams.get("similar_days");
    const windowDays = windowDaysRaw ? Number(windowDaysRaw) : 7;

    const similar =
      similarCategory || similarLocation
        ? getSimilarIncidentCount({
            category: similarCategory,
            cityOrLocation: similarLocation,
            windowDays: Number.isFinite(windowDays) && windowDays > 0 ? windowDays : 7,
          })
        : null;

    const operatorName = searchParams.get("operator_name");
    const operatorText = searchParams.get("operator_text");
    const operatorCity = searchParams.get("operator_city") || undefined;
    let operator = operatorName ? lookupOperator(operatorName, operatorCity) : null;
    if (!operator && operatorText) {
      operator = lookupOperatorFromText(operatorText, operatorCity);
    }

    return NextResponse.json({
      kpis,
      cityStats,
      recentReports,
      hotelReferrals,
      similar,
      operator,
    });
  } catch (error) {
    console.error("Failed to fetch intelligence data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
