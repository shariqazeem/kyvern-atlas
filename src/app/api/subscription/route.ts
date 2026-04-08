import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Returns the authenticated user's current subscription status.
// Requires a valid session cookie — never returns another wallet's plan info.
export async function GET(request: NextRequest) {
  try {
    const session = authenticateSession(request);
    if ("error" in session) {
      // Unauthenticated callers see "free" — never expose another wallet's plan
      return NextResponse.json({ plan: "free", authenticated: false });
    }

    const wallet = session.wallet.toLowerCase();
    const db = getDb();

    const sub = db
      .prepare(
        `
      SELECT id, plan, expires_at, wallet_address, started_at, amount_usd, tx_hash
      FROM subscriptions
      WHERE wallet_address = ? AND status = 'active' AND expires_at > datetime('now')
      ORDER BY expires_at DESC LIMIT 1
    `
      )
      .get(wallet) as
      | {
          id: string;
          plan: string;
          expires_at: string;
          wallet_address: string;
          started_at: string;
          amount_usd: number;
          tx_hash: string;
        }
      | undefined;

    if (!sub) {
      return NextResponse.json({
        plan: "free",
        authenticated: true,
        wallet,
      });
    }

    return NextResponse.json({
      plan: sub.plan,
      authenticated: true,
      wallet,
      expires_at: sub.expires_at,
      started_at: sub.started_at,
      amount_usd: sub.amount_usd,
      tx_hash: sub.tx_hash,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
