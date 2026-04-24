import { NextRequest, NextResponse } from "next/server";
import { registerEndpoint, getVault, writeDeviceLog } from "@/lib/vault-store";

/**
 * POST /api/endpoints/register
 * Register a new x402 proxy endpoint for a vault (Paywall ability).
 * Returns the slug and full paywall URL.
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

    const vault = getVault(vaultId);
    if (!vault) {
      return NextResponse.json({ error: "vault not found" }, { status: 404 });
    }

    const endpoint = registerEndpoint(vaultId, targetUrl, priceUsd);

    // Log to device log
    writeDeviceLog({
      deviceId: vaultId,
      eventType: "earning_received",
      abilityId: "paywall-url",
      description: `Paywall endpoint registered: ${targetUrl}`,
      metadata: { slug: endpoint.slug, priceUsd, targetUrl },
    });

    const baseUrl = process.env.KYVERN_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "https://app.kyvernlabs.com";

    // Trigger the greeter immediately so Atlas pays within seconds
    fetch(`${baseUrl}/api/greeter`, { method: "POST" }).catch(() => {});

    return NextResponse.json({
      endpoint,
      paywallUrl: `${baseUrl}/api/paywall/${endpoint.slug}`,
    }, { status: 201 });
  } catch (e) {
    console.error("[endpoints/register]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
