import { NextResponse } from "next/server";
import { loadSiteSettings } from "@/lib/site-settings-server";

export async function GET() {
  const settings = await loadSiteSettings();
  return NextResponse.json(
    { success: true, settings },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
