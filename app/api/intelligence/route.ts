import { NextResponse } from "next/server";
import { getRecentReports, getCityStats, getKPIs } from "@/lib/intelligence-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const kpis = getKPIs();
    const cityStats = getCityStats();
    const recentReports = getRecentReports(10);

    return NextResponse.json({
      kpis,
      cityStats,
      recentReports
    });
  } catch (error) {
    console.error("Failed to fetch intelligence data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
