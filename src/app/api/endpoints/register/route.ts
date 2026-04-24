import { NextRequest, NextResponse } from "next/server";
import { registerEndpoint, getVault } from "@/lib/vault-store";

/**
 * POST /api/endpoints/register
 * Register a new x402 proxy endpoint for a vault (Paywall ability).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vaultId, targetUrl, priceUsd } = body;

    if (!vaultId || typeof vaultId !== "string") {
      return NextResponse.json({ error: "vaultId required" }, { status: 400 });
    }
    if (!targetUrl || typeof targetUrl !== "string") {
      return NextResponse.json({ error: "targetUrl required" }, { status: 400 });
    }
    if (typeof priceUsd !== "number" || priceUsd <= 0) {
      return NextResponse.json(
        { error: "priceUsd must be a positive number" },
        { status: 400 },
      );
    }

    // Verify vault exists
    const vault = getVault(vaultId);
    if (!vault) {
      return NextResponse.json({ error: "vault not found" }, { status: 404 });
    }

    const endpoint = registerEndpoint(vaultId, targetUrl, priceUsd);

    return NextResponse.json({ endpoint }, { status: 201 });
  } catch (e) {
    console.error("[endpoints/register]", e);
    return NextResponse.json(
      { error: "internal error" },
      { status: 500 },
    );
  }
}
