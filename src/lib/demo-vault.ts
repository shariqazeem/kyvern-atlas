/* ════════════════════════════════════════════════════════════════════
   demo-vault.ts — lazily bootstraps the singleton "demo" vault
   ────────────────────────────────────────────────────────────────────
   The /demo page needs a vault to fire real payments through. We
   allocate one on first use and cache its ID + agent-key raw in a
   local JSON file under KYVERN_KEYSTORE_DIR (same dir that holds the
   server signer). Subsequent runs reuse the same vault, so the ledger
   accumulates into a real-looking history and the spending-limit PDA
   survives restarts.

   Cache file: <KYVERN_KEYSTORE_DIR>/demo-vault.json

   Cache shape:
     { vaultId: "vlt_…", agentKeyRaw: "kv_live_…", network: "devnet" }

   On startup we verify the cached vaultId still exists in the DB; if
   someone nuked the SQLite file, we re-bootstrap.

   This is deliberately NOT exposed through /api/vault/* — the demo
   vault is infrastructure. Owners should never see it in their list.
   We tag it with ownerWallet = DEMO_OWNER_WALLET so it's isolated.
   ════════════════════════════════════════════════════════════════════ */

import fs from "fs";
import path from "path";
import { Keypair } from "@solana/web3.js";
import {
  getVault,
  createVault,
  issueAgentKey,
  setVaultSquadsState,
  type VaultRecord,
} from "./vault-store";
import {
  createSmartAccount,
  setSpendingLimit,
  isSquadsReal,
} from "./squads-v4";
import { generateAgentKeypair, loadServerSigner } from "./solana-keystore";
import {
  PARALLAX_DEMO_ALLOWLIST,
  PARALLAX_DEMO_CAPS,
} from "./demo-script";

const KEYSTORE_DIR =
  process.env.KYVERN_KEYSTORE_DIR ?? path.join(process.cwd(), ".kyvern");
const CACHE_PATH = path.join(KEYSTORE_DIR, "demo-vault.json");

interface CacheShape {
  vaultId: string;
  ownerWallet: string; // throwaway pubkey generated at bootstrap
  agentKeyRaw: string;
  network: "devnet" | "mainnet";
  createdAt: string;
}

function readCache(): CacheShape | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const raw = fs.readFileSync(CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<CacheShape>;
    if (
      !parsed.vaultId ||
      !parsed.agentKeyRaw ||
      !parsed.ownerWallet ||
      (parsed.network !== "devnet" && parsed.network !== "mainnet")
    )
      return null;
    return parsed as CacheShape;
  } catch {
    return null;
  }
}

function writeCache(c: CacheShape): void {
  fs.mkdirSync(KEYSTORE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(c, null, 2), { mode: 0o600 });
}

/* ─── Public API ─── */

export interface DemoVaultHandle {
  vault: VaultRecord;
  agentKeyRaw: string;
  created: boolean; // true if this call minted a new one
}

/**
 * Load or bootstrap the demo vault. Safe to call on every /api/demo/start.
 *
 * Steps:
 *   1. If cache file exists and the DB vault still resolves, return it.
 *   2. Otherwise, ensure the server signer is loaded (devnet airdrop if empty).
 *   3. Create a fresh Squads smart account + spending limit, tagged with
 *      the demo owner. Persist to cache.
 */
export async function ensureDemoVault(params: {
  network?: "devnet" | "mainnet";
} = {}): Promise<DemoVaultHandle> {
  const network = params.network ?? "devnet";

  const cached = readCache();
  if (cached && cached.network === network) {
    const v = getVault(cached.vaultId);
    if (v) {
      return { vault: v, agentKeyRaw: cached.agentKeyRaw, created: false };
    }
  }

  // In real mode we need the server signer funded before we can create
  // the on-chain multisig. In stub mode we skip this — createSmartAccount
  // returns a deterministic fake address without ever touching the RPC.
  if (isSquadsReal()) {
    await loadServerSigner({ network, allowBootstrap: true });
  }

  // The demo vault's "owner wallet" is a throwaway pubkey we generate
  // once and cache. It never signs anything — the Squads owner role is
  // held by our server signer, which is the multisig's sole member.
  // The owner pubkey only exists to satisfy vault_store's bookkeeping
  // (one vault per owner wallet, nicely namespaced away from real users).
  const demoOwner = Keypair.generate();
  const ownerWallet = demoOwner.publicKey.toBase58();

  // 1) Create on-chain smart account
  const smart = await createSmartAccount({
    ownerPubkey: ownerWallet,
    vaultSeed: `demo-vault::${network}::${Date.now()}`,
    network,
  });

  // 2) Persist vault row
  const vault = createVault({
    ownerWallet,
    name: "Parallax (demo)",
    emoji: "🧭",
    purpose: "research",
    dailyLimitUsd: PARALLAX_DEMO_CAPS.dailyLimitUsd,
    weeklyLimitUsd: PARALLAX_DEMO_CAPS.weeklyLimitUsd,
    perTxMaxUsd: PARALLAX_DEMO_CAPS.perTxMaxUsd,
    maxCallsPerWindow: PARALLAX_DEMO_CAPS.maxCallsPerWindow,
    velocityWindow: PARALLAX_DEMO_CAPS.velocityWindow,
    allowedMerchants: PARALLAX_DEMO_ALLOWLIST.map((m) => m.toLowerCase()),
    requireMemo: PARALLAX_DEMO_CAPS.requireMemo,
    squadsAddress: smart.address,
    network,
  });

  // 3) Generate agent Solana keypair, delegate the spending limit
  const agentSolana = await generateAgentKeypair();
  const limit = await setSpendingLimit({
    smartAccountAddress: smart.address,
    agentKeyPubkey: agentSolana.pubkey,
    dailyLimitUsd: PARALLAX_DEMO_CAPS.dailyLimitUsd,
    weeklyLimitUsd: PARALLAX_DEMO_CAPS.weeklyLimitUsd,
    perTxMaxUsd: PARALLAX_DEMO_CAPS.perTxMaxUsd,
    network,
  });

  // 4) Persist on-chain state + issue bearer key
  const persisted =
    setVaultSquadsState(vault.id, {
      vaultPda: smart.vaultPda,
      createSignature: smart.createSignature,
      spendingLimitPda: limit.spendingLimitPda,
      spendingLimitCreateKey: limit.spendingLimitCreateKey,
      setSpendingLimitSignature: limit.setSignature,
    }) ?? vault;

  const { raw: agentKeyRaw } = issueAgentKey(vault.id, "demo", {
    pubkey: agentSolana.pubkey,
    secretB58: agentSolana.secretB58,
  });

  writeCache({
    vaultId: vault.id,
    ownerWallet,
    agentKeyRaw,
    network,
    createdAt: new Date().toISOString(),
  });

  return { vault: persisted, agentKeyRaw, created: true };
}

export function describeDemoVault(): {
  cached: boolean;
  path: string;
  network: "devnet" | "mainnet" | null;
  vaultId: string | null;
  squadsReal: boolean;
} {
  const c = readCache();
  return {
    cached: !!c,
    path: CACHE_PATH,
    network: c?.network ?? null,
    vaultId: c?.vaultId ?? null,
    squadsReal: isSquadsReal(),
  };
}
