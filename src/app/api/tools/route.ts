import { NextResponse } from "next/server";
import { listTools } from "@/lib/agents/tools";

/**
 * GET /api/tools
 * Returns metadata for all available agent tools.
 * (Tool implementations stay server-side; clients only need the descriptions.)
 */
export async function GET() {
  try {
    const tools = listTools().map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      costsMoney: t.costsMoney,
    }));
    return NextResponse.json({ tools });
  } catch (e) {
    console.error("[tools]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
