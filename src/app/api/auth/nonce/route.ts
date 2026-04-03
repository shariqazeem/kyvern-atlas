import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

export async function GET() {
  const nonce = nanoid(32);
  return NextResponse.json({ nonce });
}
