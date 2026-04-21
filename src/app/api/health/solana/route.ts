import { NextRequest, NextResponse } from "next/server";
import { describeKeystore } from "@/lib/solana-keystore";
import { squadsConfigSummary } from "@/lib/squads-v4";

/* ════════════════════════════════════════════════════════════════════
   GET /api/health/solana?network=devnet|mainnet

   Diagnostics for the on-chain side of the stack:
     · mode (real | stub) the adapter is running in
     · RPC URLs and whether a custom one is configured
     · whether the server signer resolved (env / file / not bootstrapped)
     · the server signer's pubkey and SOL balance (if RPC reachable)

   Intentionally read-only — does NOT bootstrap a keypair or airdrop.
   For a bootstrap run the `scripts/bootstrap-solana-signer.ts` script
   instead, which is explicit about writing state.
   ════════════════════════════════════════════════════════════════════ */

type Network = "devnet" | "mainnet";

function parseNetwork(value: string | null): Network {
  return value === "mainnet" ? "mainnet" : "devnet";
}

export async function GET(req: NextRequest) {
  const network = parseNetwork(req.nextUrl.searchParams.get("network"));
  const squads = squadsConfigSummary();
  const keystore = await describeKeystore(network);

  const ok =
    squads.mode === "stub" ||
    (keystore.configured &&
      keystore.solBalance !== null &&
      keystore.solBalance > 0);

  return NextResponse.json(
    {
      ok,
      network,
      squads,
      keystore,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
