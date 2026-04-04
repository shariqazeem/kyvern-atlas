import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";
import { fetchSingleBalance } from "@/lib/vault";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = authenticateSession(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const db = getDb();

  const wallets = db.prepare(`
    SELECT w.*,
      (SELECT balance_eth FROM wallet_snapshots WHERE wallet_id = w.id ORDER BY fetched_at DESC LIMIT 1) as balance_eth,
      (SELECT balance_usdc FROM wallet_snapshots WHERE wallet_id = w.id ORDER BY fetched_at DESC LIMIT 1) as balance_usdc,
      (SELECT fetched_at FROM wallet_snapshots WHERE wallet_id = w.id ORDER BY fetched_at DESC LIMIT 1) as last_synced
    FROM wallets w WHERE w.api_key_id = ? ORDER BY w.created_at DESC
  `).all(auth.apiKeyId) as Array<Record<string, unknown>>;

  const totalUsdc = wallets.reduce((s, w) => s + (Number(w.balance_usdc) || 0), 0);
  const totalEth = wallets.reduce((s, w) => s + (Number(w.balance_eth) || 0), 0);

  return NextResponse.json({
    wallets,
    total_balance_usdc: Math.round(totalUsdc * 100) / 100,
    total_balance_eth: Math.round(totalEth * 10000) / 10000,
  });
}

const CreateSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address"),
  label: z.string().min(1).max(50),
  network: z.string().default("eip155:84532"),
  purpose: z.enum(["receivable", "gas", "operational"]).default("receivable"),
  endpoint: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = authenticateSession(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = CreateSchema.parse(body);

    const db = getDb();
    const id = nanoid();

    db.prepare(
      "INSERT INTO wallets (id, api_key_id, address, label, network, purpose, endpoint) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, auth.apiKeyId, parsed.address, parsed.label, parsed.network, parsed.purpose, parsed.endpoint || null);

    // Fetch initial balance
    let balance = { balance_eth: 0, balance_usdc: 0 };
    try {
      balance = await fetchSingleBalance(parsed.address);
      db.prepare(
        "INSERT INTO wallet_snapshots (id, wallet_id, balance_eth, balance_usdc) VALUES (?, ?, ?, ?)"
      ).run(nanoid(), id, balance.balance_eth, balance.balance_usdc);
    } catch {
      // Balance fetch failed — wallet added without initial snapshot
    }

    return NextResponse.json({ wallet: { id, address: parsed.address, label: parsed.label, ...balance } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = authenticateSession(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing wallet id" }, { status: 400 });

  const db = getDb();
  const wallet = db.prepare("SELECT api_key_id FROM wallets WHERE id = ?").get(id) as { api_key_id: string } | undefined;
  if (!wallet || wallet.api_key_id !== auth.apiKeyId) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM wallet_snapshots WHERE wallet_id = ?").run(id);
  db.prepare("DELETE FROM wallets WHERE id = ?").run(id);

  return NextResponse.json({ success: true });
}
