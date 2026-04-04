import { NextResponse } from "next/server";

const startTime = Date.now();

export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "0.2.0",
    timestamp: new Date().toISOString(),
    uptime_ms: Date.now() - startTime,
  });
}
