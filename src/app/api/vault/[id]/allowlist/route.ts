import { NextRequest, NextResponse } from "next/server";
import { getVault, setVaultAllowedMerchants } from "@/lib/vault-store";

/* ════════════════════════════════════════════════════════════════════
   POST /api/vault/[id]/allowlist

   Replace the off-chain allowed-merchants list for a vault. SDK calls
   routed through /api/vault/pay hit this list during the pre-check
   step. The on-chain policy program's allowlist (set at initialize)
   is NOT updated here — that requires a signed update_allowlist
   instruction and is wired in v1.1.

   Auth: x-owner-wallet header must match vault.ownerWallet.

   Body: { merchants: string[] }  hostnames; trimmed, lowercased,
                                    deduped server-side. Empty entries
                                    are dropped.
   ════════════════════════════════════════════════════════════════════ */

interface Body {
  merchants?: unknown;
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
  if (!Array.isArray(body.merchants)) {
    return NextResponse.json(
      { ok: false, error: "invalid_body", message: "merchants must be an array" },
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

  const owner = req.headers.get("x-owner-wallet")?.trim();
  if (!owner || owner !== vault.ownerWallet) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", message: "owner wallet mismatch" },
      { status: 403 },
    );
  }

  const merchants = (body.merchants as unknown[]).filter(
    (m): m is string => typeof m === "string",
  );

  // Cap at 32 entries to keep the JSON compact.
  if (merchants.length > 32) {
    return NextResponse.json(
      { ok: false, error: "too_many", message: "max 32 merchants" },
      { status: 400 },
    );
  }

  // Reject obviously bad hostnames (basic DNS sanity)
  for (const m of merchants) {
    if (m.length > 253 || /[^a-zA-Z0-9.:/_-]/.test(m)) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_merchant",
          message: `"${m}" looks like an invalid hostname`,
        },
        { status: 400 },
      );
    }
  }

  const updated = setVaultAllowedMerchants(params.id, merchants);
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "update_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    allowedMerchants: updated.allowedMerchants,
  });
}
