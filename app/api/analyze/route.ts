import { NextRequest, NextResponse } from "next/server";
import { analyzeWebsiteTheme } from "@/lib/analyzer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = String(body?.url || "").trim();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const result = await analyzeWebsiteTheme(normalized);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
