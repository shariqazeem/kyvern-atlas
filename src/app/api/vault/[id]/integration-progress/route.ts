import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getVault } from "@/lib/vault-store";

/**
 * /api/vault/[id]/integration-progress
 *
 * Per TRANSFORM_24H §T2 — persists which steps of the integration
 * wizard a user has completed on their vault. Each step gets a
 * timestamp on completion; missing keys mean "locked" (the wizard
 * unlocks each step in order, and a step is "active" if it's the
 * first locked step in the chain).
 *
 *   GET                          → { ok, progress: ProgressMap }
 *   POST { step: WizardStepKey } → marks step complete + returns
 *                                  the updated ProgressMap
 *
 * Auth: x-owner-wallet header matching vault.ownerWallet (same MVP
 * pattern as the rest of /api/vault/[id]/*).
 */

export type WizardStepKey =
  | "mint_key"
  | "install"
  | "first_call"
  | "try_violation"
  | "kast_payout";

const VALID_STEPS: WizardStepKey[] = [
  "mint_key",
  "install",
  "first_call",
  "try_violation",
  "kast_payout",
];

export type ProgressMap = Partial<Record<WizardStepKey, { completedAt: string }>>;

function parseProgress(raw: string | null): ProgressMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as ProgressMap;
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
}

function readProgress(vaultId: string): ProgressMap {
  const row = getDb()
    .prepare(`SELECT integration_state FROM vaults WHERE id = ?`)
    .get(vaultId) as { integration_state: string | null } | undefined;
  return parseProgress(row?.integration_state ?? null);
}

function writeProgress(vaultId: string, progress: ProgressMap): void {
  getDb()
    .prepare(
      `UPDATE vaults SET integration_state = ?, updated_at = datetime('now') WHERE id = ?`,
    )
    .run(JSON.stringify(progress), vaultId);
}

function authorize(req: NextRequest, vaultOwner: string):
  | { ok: true }
  | { ok: false; status: number; body: Record<string, unknown> } {
  const owner = req.headers.get("x-owner-wallet")?.trim();
  if (!owner || owner !== vaultOwner) {
    return {
      ok: false,
      status: 401,
      body: {
        ok: false,
        error: "unauthorized",
        message: "x-owner-wallet must match vault.ownerWallet",
      },
    };
  }
  return { ok: true };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const vault = getVault(params.id);
  if (!vault) {
    return NextResponse.json(
      { ok: false, error: "vault_not_found" },
      { status: 404 },
    );
  }
  const auth = authorize(req, vault.ownerWallet);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  return NextResponse.json(
    { ok: true, progress: readProgress(params.id) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

interface PostBody {
  step?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const vault = getVault(params.id);
  if (!vault) {
    return NextResponse.json(
      { ok: false, error: "vault_not_found" },
      { status: 404 },
    );
  }
  const auth = authorize(req, vault.ownerWallet);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }
  const step = body.step;
  if (!step || !VALID_STEPS.includes(step as WizardStepKey)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_step",
        message: `step must be one of: ${VALID_STEPS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const progress = readProgress(params.id);
  // Idempotent — if already completed, return current state without
  // overwriting the original timestamp.
  if (!progress[step as WizardStepKey]) {
    progress[step as WizardStepKey] = { completedAt: new Date().toISOString() };
    writeProgress(params.id, progress);
  }

  return NextResponse.json({ ok: true, progress, marked: step });
}
