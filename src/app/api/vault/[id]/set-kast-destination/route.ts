import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getVault, setVaultKastDestination } from "@/lib/vault-store";

/**
 * POST /api/vault/[id]/set-kast-destination
 *
 * SPEC_TO_WIN §5, §7.3 — store the user's KAST USDC deposit address
 * for this vault. Adds "kast.xyz" to the off-chain allowlist so
 * subsequent vault.pay() calls with merchant="kast.xyz" pass.
 *
 * Body: { address: string, ownerWallet?: string }
 * Returns: { ok, vault: { id, kastDestinationAddress, kastDestinationLabel } }
 *
 * Auth: same pattern as /pause and other owner-only routes — owner
 * wallet supplied via header `x-owner-wallet` or body `ownerWallet`,
 * must match vault.ownerWallet. (We replace this with signed-challenge
 * auth post-Frontier.)
 *
 * Honesty boundary: we don't verify the address belongs to a real
 * KAST account — KAST doesn't publish a B2B API. The user owns the
 * address either way, and the "compatibility" is that depositing
 * USDC to a KAST user's Solana deposit address tops up their card.
 */

interface Body {
  address?: string;
  ownerWallet?: string;
}

function extractOwner(req: NextRequest, body: Body): string | null {
  const header = req.headers.get("x-owner-wallet");
  if (header && header.trim()) return header.trim();
  if (body.ownerWallet && typeof body.ownerWallet === "string")
    return body.ownerWallet.trim();
  return null;
}

function isValidSolanaAddress(s: string): boolean {
  try {
    new PublicKey(s);
    return true;
  } catch {
    return false;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const vault = getVault(params.id);
  if (!vault) {
    return NextResponse.json(
      { ok: false, error: "vault_not_found" },
      { status: 404 },
    );
  }

  const owner = extractOwner(req, body);
  if (!owner) {
    return NextResponse.json(
      {
        ok: false,
        error: "unauthorized",
        message:
          "provide owner wallet via 'x-owner-wallet' header or body.ownerWallet",
      },
      { status: 401 },
    );
  }
  if (owner !== vault.ownerWallet) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", message: "owner wallet mismatch" },
      { status: 403 },
    );
  }

  const address = (body.address ?? "").trim();
  if (!address) {
    return NextResponse.json(
      { ok: false, error: "missing_address", message: "address is required" },
      { status: 400 },
    );
  }
  if (!isValidSolanaAddress(address)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_address",
        message: "address must be a valid Solana public key",
      },
      { status: 400 },
    );
  }

  const updated = setVaultKastDestination(params.id, address);
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "update_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    vault: {
      id: updated.id,
      kastDestinationAddress: address,
      kastDestinationLabel: "MY_KAST",
      allowedMerchants: updated.allowedMerchants,
    },
  });
}

/**
 * GET /api/vault/[id]/set-kast-destination — read current value.
 * Same auth as POST.
 */
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
  const owner = extractOwner(req, {});
  if (owner !== vault.ownerWallet) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  // Pull from DB direct since VaultRecord doesn't surface kast cols.
  const { getDb } = await import("@/lib/db");
  const row = getDb()
    .prepare(
      `SELECT kast_destination_address AS address,
              kast_destination_label   AS label,
              kast_set_at              AS setAt
         FROM vaults WHERE id = ?`,
    )
    .get(params.id) as
    | { address: string | null; label: string | null; setAt: string | null }
    | undefined;

  return NextResponse.json({
    ok: true,
    address: row?.address ?? null,
    label: row?.label ?? "MY_KAST",
    setAt: row?.setAt ?? null,
  });
}
