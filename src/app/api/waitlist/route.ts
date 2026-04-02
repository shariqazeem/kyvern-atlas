import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";

const WaitlistSchema = z.object({
  email: z.string().email(),
  role: z.enum(["x402-provider", "agent-builder", "other"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = WaitlistSchema.parse(body);

    const db = getDb();

    const existing = db.prepare("SELECT id FROM waitlist WHERE email = ?").get(parsed.email);
    if (existing) {
      return NextResponse.json({ success: true, message: "Already on the list" });
    }

    db.prepare("INSERT INTO waitlist (email, role) VALUES (?, ?)").run(
      parsed.email,
      parsed.role || null
    );

    const count = db.prepare("SELECT COUNT(*) as count FROM waitlist").get() as { count: number };

    return NextResponse.json({ success: true, position: count.count });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDb();
    const count = db.prepare("SELECT COUNT(*) as count FROM waitlist").get() as { count: number };
    return NextResponse.json({ count: count.count });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
