import { NextRequest, NextResponse } from "next/server";
import { getVault, pauseVault, resumeVault } from "@/lib/vault-store";

/* ════════════════════════════════════════════════════════════════════
   The kill switch.

   POST   /api/vault/:id/pause   → pause the vault (blocks every payment)
   DELETE /api/vault/:id/pause   → resume the vault

   Authorization (MVP):
     The request must include the owner wallet in the body or
     'x-owner-wallet' header, and it must match vault.ownerWallet.
     We swap this for a real signed challenge in Day 4.
   ════════════════════════════════════════════════════════════════════ */

interface PauseBody {
  ownerWallet?: string;
}

function extractOwner(req: NextRequest, body: PauseBody): string | null {
  const header = req.headers.get("x-owner-wallet");
  if (header && header.trim()) return header.trim();
  if (body.ownerWallet && typeof body.ownerWallet === "string")
    return body.ownerWallet.trim();
  return null;
}

async function readBody(req: NextRequest): Promise<PauseBody> {
  try {
    return (await req.json()) as PauseBody;
  } catch {
    return {};
  }
}

async function authorize(
  req: NextRequest,
  vaultId: string,
): Promise<
  | { ok: true; vault: NonNullable<ReturnType<typeof getVault>> }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const vault = getVault(vaultId);
  if (!vault) {
    return {
      ok: false,
      status: 404,
      body: { error: "vault_not_found", message: `no vault ${vaultId}` },
    };
  }
  const body = await readBody(req);
  const owner = extractOwner(req, body);
  if (!owner) {
    return {
      ok: false,
      status: 401,
      body: {
        error: "unauthorized",
        message:
          "provide owner wallet via 'x-owner-wallet' header or body.ownerWallet",
      },
    };
  }
  if (owner !== vault.ownerWallet) {
    return {
      ok: false,
      status: 403,
      body: { error: "forbidden", message: "owner wallet mismatch" },
    };
  }
  return { ok: true, vault };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const auth = await authorize(req, id);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  if (auth.vault.pausedAt) {
    return NextResponse.json(
      {
        vault: auth.vault,
        message: "vault was already paused",
        pausedAt: auth.vault.pausedAt,
      },
      { status: 200 },
    );
  }

  const updated = pauseVault(id);
  return NextResponse.json(
    {
      vault: updated,
      message: "vault paused — all payments will be blocked",
      pausedAt: updated?.pausedAt ?? null,
    },
    { status: 200 },
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const auth = await authorize(req, id);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  if (!auth.vault.pausedAt) {
    return NextResponse.json(
      { vault: auth.vault, message: "vault was not paused" },
      { status: 200 },
    );
  }

  const updated = resumeVault(id);
  return NextResponse.json(
    { vault: updated, message: "vault resumed" },
    { status: 200 },
  );
}
