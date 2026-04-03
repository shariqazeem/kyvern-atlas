import { NextRequest, NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { createAccount, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { message, signature } = await req.json();

    if (!message || !signature) {
      return NextResponse.json({ error: "Missing message or signature" }, { status: 400 });
    }

    // Verify the SIWE message
    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });

    if (!result.success) {
      return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
    }

    const walletAddress = result.data.address;

    // Create account if new, or get existing
    const account = createAccount(walletAddress);

    // Create session
    const sessionToken = createSession(walletAddress);

    // Build response
    const response = NextResponse.json({
      success: true,
      wallet: walletAddress,
      isNew: account.isNew,
      apiKeyPrefix: account.keyPrefix,
      // Only include full API key for new accounts (shown once)
      ...(account.isNew ? { apiKey: account.fullApiKey } : {}),
    });

    // Set httpOnly session cookie
    response.cookies.set("pulse-session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
