import { NextRequest, NextResponse } from "next/server";
import { tickAgent } from "@/lib/agents/runner";

/**
 * POST /api/agents/[id]/tick
 *
 * Manually trigger one tick on an agent. Returns the resulting
 * thought and signature (if a money tool was used). Useful for
 * testing the full Phase 3 path before the agent-pool worker
 * is running.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const result = await tickAgent(params.id);
    return NextResponse.json(result, {
      status: result.success ? 200 : 422,
    });
  } catch (e) {
    console.error("[agents/tick]", e);
    return NextResponse.json(
      { success: false, reason: e instanceof Error ? e.message : "internal error" },
      { status: 500 },
    );
  }
}
