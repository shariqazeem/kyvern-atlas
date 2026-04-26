import { NextRequest, NextResponse } from "next/server";
import { transferUsdcFromTreasury, TOPUP_AMOUNT_USD } from "@/lib/atlas/auto-drip";

/**
 * POST /api/atlas/funded-by-me
 *
 * Hidden admin fail-safe — Section 3B layer 2. Bookmarked on the
 * founder's phone. One tap during a live demo if anything goes wrong.
 *
 * Auth: a single bearer header with the `KYVERNLABS_AGENT_KEY`. This
 * is the same long-lived secret the runner already uses on the VM, so
 * there's nothing new to provision — just hit the URL.
 *
 *   curl -X POST -H "Authorization: Bearer $KYVERNLABS_AGENT_KEY" \
 *     https://app.kyvernlabs.com/api/atlas/funded-by-me
 *
 * Returns: { ok: true, signature, amountUsd } or 4xx/5xx with an error.
 */

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const expected = process.env.KYVERNLABS_AGENT_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "server misconfigured (KYVERNLABS_AGENT_KEY missing)" },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Allow override via ?amount=10 if the founder ever needs a bigger drip.
  const url = new URL(req.url);
  const amountParam = url.searchParams.get("amount");
  const amountUsd = amountParam ? Math.max(0.5, Math.min(50, Number(amountParam) || TOPUP_AMOUNT_USD)) : TOPUP_AMOUNT_USD;

  const result = await transferUsdcFromTreasury(amountUsd);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    signature: result.signature,
    amountUsd: result.amountUsd,
    explorer: `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`,
  });
}
