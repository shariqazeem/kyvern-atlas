import { NextRequest, NextResponse } from "next/server";
import { ensureDemoVault } from "@/lib/demo-vault";
import { createSession } from "@/lib/demo-session";
import { runDemo } from "@/lib/demo-runner";
import { PARALLAX_SCRIPT } from "@/lib/demo-script";

/* ════════════════════════════════════════════════════════════════════
   POST /api/demo/start

   Boots (or reuses) the singleton demo vault, creates a new demo
   session, fires the runner in the background, and returns the
   sessionId. The caller immediately opens /api/demo/stream?session=…
   to receive live events.

   Response:
   {
     sessionId: "ds_…",
     vaultId:   "vlt_…",
     scriptId:  "parallax-research-v1",
     bootstrapped: boolean,   // true iff we had to mint the vault just now
     squadsAddress, network
   }
   ════════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // we need Node APIs (fs + better-sqlite3)

interface StartBody {
  network?: "devnet" | "mainnet";
}

export async function POST(req: NextRequest) {
  let body: StartBody = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as StartBody;
  } catch {
    // Empty body is fine — defaults to devnet.
  }

  const network = body.network === "mainnet" ? "mainnet" : "devnet";

  // 1) Ensure the demo vault exists on-chain.
  let handle;
  try {
    handle = await ensureDemoVault({ network });
  } catch (e) {
    return NextResponse.json(
      {
        error: "demo_vault_bootstrap_failed",
        message:
          e instanceof Error
            ? e.message
            : "failed to bootstrap the demo vault on-chain",
      },
      { status: 502 },
    );
  }

  // 2) Create the session bus.
  const session = createSession({
    vaultId: handle.vault.id,
    agentKeyRaw: handle.agentKeyRaw,
    script: PARALLAX_SCRIPT.id,
  });

  // 3) Kick off the runner. Do NOT await — we return immediately and
  //    the SSE stream feeds the events as they fire.
  void runDemo({
    sessionId: session.id,
    vaultId: handle.vault.id,
    agentKeyRaw: handle.agentKeyRaw,
    script: PARALLAX_SCRIPT,
  });

  return NextResponse.json(
    {
      sessionId: session.id,
      vaultId: handle.vault.id,
      scriptId: PARALLAX_SCRIPT.id,
      bootstrapped: handle.created,
      squadsAddress: handle.vault.squadsAddress,
      network: handle.vault.network,
    },
    { status: 200 },
  );
}
