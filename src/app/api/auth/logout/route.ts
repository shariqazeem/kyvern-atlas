import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("pulse-session")?.value;
  if (token) {
    deleteSession(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("pulse-session");
  return response;
}
