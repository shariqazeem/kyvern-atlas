import { NextRequest, NextResponse } from "next/server";
import { createAccount, createSession, getAccountByWallet } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { wallet_address } = await req.json();

    if (!wallet_address || typeof wallet_address !== "string") {
      return NextResponse.json({ error: "Missing wallet_address" }, { status: 400 });
    }

    // Create or get account
    const account = createAccount(wallet_address);

    // Create session
    const sessionToken = createSession(wallet_address);

    // Check Pro status
    const db = getDb();
    const sub = db.prepare(
      "SELECT expires_at FROM subscriptions WHERE wallet_address = ? AND status = 'active' AND expires_at > datetime('now') ORDER BY expires_at DESC LIMIT 1"
    ).get(wallet_address.toLowerCase()) as { expires_at: string } | undefined;

    const existingAccount = getAccountByWallet(wallet_address);

    // Build response
    const response = NextResponse.json({
      success: true,
      wallet: wallet_address,
      isNew: account.isNew,
      apiKeyPrefix: account.keyPrefix,
      apiKeyId: account.apiKeyId,
      ...(account.isNew ? { apiKey: account.fullApiKey } : {}),
      plan: sub ? "pro" : "free",
      proExpiresAt: sub?.expires_at || null,
      onboardingCompleted: existingAccount?.onboarding_completed === 1,
    });

    // Set session cookie
    response.cookies.set("pulse-session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
