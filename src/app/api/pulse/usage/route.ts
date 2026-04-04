import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { checkUsageLimit } from "@/lib/tier";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const usage = checkUsageLimit(auth.apiKeyId);

    return NextResponse.json(usage);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
