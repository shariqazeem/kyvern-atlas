import { NextResponse } from "next/server";
import { listActiveEndpoints } from "@/lib/vault-store";

/**
 * GET /api/endpoints/list
 * List all active x402 proxy endpoints (Atlas greeter reads this).
 */
export async function GET() {
  try {
    const endpoints = listActiveEndpoints();
    return NextResponse.json({ endpoints });
  } catch (e) {
    console.error("[endpoints/list]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
