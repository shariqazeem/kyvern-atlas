import { NextRequest, NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed";
import { authenticateSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = authenticateSession(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = seedDatabase();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
