import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth";
import { syncWalletBalances } from "@/lib/vault";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = authenticateSession(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  try {
    const result = await syncWalletBalances(auth.apiKeyId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
