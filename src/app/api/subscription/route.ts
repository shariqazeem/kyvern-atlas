import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet");
    if (!wallet) {
      return NextResponse.json({ plan: "free" });
    }

    const db = getDb();
    const sub = db.prepare(`
      SELECT * FROM subscriptions
      WHERE wallet_address = ? AND status = 'active' AND expires_at > datetime('now')
      ORDER BY expires_at DESC LIMIT 1
    `).get(wallet) as {
      id: string;
      plan: string;
      expires_at: string;
      wallet_address: string;
    } | undefined;

    if (!sub) {
      return NextResponse.json({ plan: "free" });
    }

    return NextResponse.json({
      plan: sub.plan,
      expires_at: sub.expires_at,
      wallet: sub.wallet_address,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
