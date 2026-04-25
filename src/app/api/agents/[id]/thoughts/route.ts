import { NextRequest, NextResponse } from "next/server";
import { listThoughts } from "@/lib/agents/store";

/**
 * GET /api/agents/[id]/thoughts
 * Returns the agent's most recent thoughts (for live feed UI).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") ?? "30", 10),
      200,
    );
    const thoughts = listThoughts(params.id, limit);
    return NextResponse.json({ thoughts });
  } catch (e) {
    console.error("[agents/thoughts]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
