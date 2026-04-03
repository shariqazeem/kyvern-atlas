import { NextRequest, NextResponse } from "next/server";
import { validateSession, getAccountByWallet } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("pulse-session")?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const session = validateSession(token);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const account = getAccountByWallet(session.wallet_address);
  if (!account) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Get API key info (masked)
  const db = getDb();
  const key = db.prepare(
    "SELECT id, key_prefix, tier, created_at, last_used_at FROM api_keys WHERE wallet_address = ? LIMIT 1"
  ).get(session.wallet_address) as {
    id: string;
    key_prefix: string;
    tier: string;
    created_at: string;
    last_used_at: string | null;
  } | undefined;

  // Check pro subscription
  const sub = db.prepare(
    "SELECT expires_at FROM subscriptions WHERE wallet_address = ? AND status = 'active' AND expires_at > datetime('now') ORDER BY expires_at DESC LIMIT 1"
  ).get(session.wallet_address) as { expires_at: string } | undefined;

  const plan = sub ? "pro" : (key?.tier || "free");

  return NextResponse.json({
    authenticated: true,
    wallet: session.wallet_address,
    accountId: account.id,
    onboardingCompleted: account.onboarding_completed === 1,
    apiKeyId: key?.id,
    apiKeyPrefix: key?.key_prefix,
    plan,
    proExpiresAt: sub?.expires_at || null,
  });
}
