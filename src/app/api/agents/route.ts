import { NextRequest, NextResponse } from "next/server";
import { listPublicAgents, listAgentsByDevice } from "@/lib/agents/store";

/**
 * GET /api/agents
 * Lists agents. Optional ?deviceId=vlt_... filter.
 */
export async function GET(req: NextRequest) {
  try {
    const deviceId = req.nextUrl.searchParams.get("deviceId");
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10),
      200,
    );

    const agents = deviceId
      ? listAgentsByDevice(deviceId)
      : listPublicAgents(limit);

    return NextResponse.json({ agents });
  } catch (e) {
    console.error("[agents]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
