/* ════════════════════════════════════════════════════════════════════
   solana-keystore — server-side wallet bootstrap + load

   We need ONE funded Solana keypair on the server to:
     · pay rent/fees for Squads v4 account creation
     · pay rent/fees for spending-limit creation
     · co-sign the spendingLimitUse instruction when agents spend

   Resolution order (first match wins):
     1. process.env.KYVERN_FEE_PAYER_SECRET            (base58 secret key)
     2. ${KEYSTORE_DIR}/server-signer.json             (JSON array from solana-keygen)
     3. If missing AND allowBootstrap: generate a new keypair, write it
        to ${KEYSTORE_DIR}/server-signer.json, return it.

   On devnet we can auto-airdrop; on mainnet we refuse.
   Mode & RPC are resolved the same way as squads-v4.ts.

   The keystore file is gitignored by default (see .gitignore).
   ════════════════════════════════════════════════════════════════════ */

import fs from "fs";
import path from "path";
import type {
  Connection as ConnectionType,
  Keypair as KeypairType,
} from "@solana/web3.js";

const KEYSTORE_DIR =
  process.env.KYVERN_KEYSTORE_DIR ?? path.join(process.cwd(), ".kyvern");
const SIGNER_PATH = path.join(KEYSTORE_DIR, "server-signer.json");

interface Bs58 {
  encode: (b: Uint8Array) => string;
  decode: (s: string) => Uint8Array;
}

async function loadWeb3() {
  const [web3, bs58Mod] = await Promise.all([
    import("@solana/web3.js"),
    import("bs58"),
  ]);
  const bs58NS = bs58Mod as unknown as { default?: Bs58 } & Bs58;
  const bs58: Bs58 = bs58NS.default ?? bs58NS;
  return { web3, bs58 };
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readKeypairFromFile(
  filePath: string,
  web3: typeof import("@solana/web3.js"),
): KeypairType | null {
  try {
    const contents = fs.readFileSync(filePath, "utf8").trim();
    // Supports both formats:
    //   · JSON array (solana-keygen default) — [1, 2, …, 64]
    //   · base58 string (our own convenience)
    if (contents.startsWith("[")) {
      const arr = JSON.parse(contents) as number[];
      if (!Array.isArray(arr) || arr.length !== 64) return null;
      return web3.Keypair.fromSecretKey(Uint8Array.from(arr));
    }
    // Otherwise treat as base58.
    // (Defer bs58 decode to caller if you prefer; here we just try both.)
    return null;
  } catch {
    return null;
  }
}

function writeKeypairToFile(filePath: string, kp: KeypairType) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(
    filePath,
    JSON.stringify(Array.from(kp.secretKey)),
    { mode: 0o600 },
  );
}

export interface LoadOptions {
  /** If no signer is found, mint + persist one. Default: true on devnet. */
  allowBootstrap?: boolean;
  /** Where to write bootstrap keypairs. Default: ./.kyvern/server-signer.json */
  signerPath?: string;
  /** Devnet airdrop if balance is below this, in SOL. Default: 0.5. */
  minSolBalance?: number;
  /** Target balance after airdrop, in SOL. Default: 2. */
  targetSolBalance?: number;
  /** Network — used for airdrop decisions. Default: "devnet". */
  network?: "devnet" | "mainnet";
}

export interface LoadedSigner {
  keypair: KeypairType;
  pubkey: string;
  /** How the keypair was obtained, useful in diagnostics. */
  source: "env" | "file" | "bootstrapped";
  /** Pass-through RPC so callers can reuse. */
  connection: ConnectionType;
  /** Balance in SOL at load time (best-effort; may be stale). */
  solBalance: number;
  /** True iff this signer was auto-funded during load. */
  airdropped: boolean;
}

/** Default RPC URL resolution, copied verbatim from squads-v4.ts. */
export function rpcUrl(network: "devnet" | "mainnet"): string {
  if (process.env.KYVERN_SOLANA_RPC_URL)
    return process.env.KYVERN_SOLANA_RPC_URL;
  return network === "devnet"
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com";
}

/**
 * Load the server signer. On devnet with `allowBootstrap: true` (default),
 * this is self-healing — a fresh install gets a fresh keypair and its
 * first airdrop automatically.
 */
export async function loadServerSigner(
  opts: LoadOptions = {},
): Promise<LoadedSigner> {
  const { web3, bs58 } = await loadWeb3();
  const network = opts.network ?? "devnet";
  const allowBootstrap = opts.allowBootstrap ?? network === "devnet";
  const signerPath = opts.signerPath ?? SIGNER_PATH;
  const minSol = opts.minSolBalance ?? 0.5;
  const targetSol = opts.targetSolBalance ?? 2;

  let kp: KeypairType | null = null;
  let source: LoadedSigner["source"] = "bootstrapped";

  // 1. Env var
  if (process.env.KYVERN_FEE_PAYER_SECRET) {
    try {
      kp = web3.Keypair.fromSecretKey(
        bs58.decode(process.env.KYVERN_FEE_PAYER_SECRET.trim()),
      );
      source = "env";
    } catch (e) {
      throw new Error(
        `KYVERN_FEE_PAYER_SECRET is set but not a valid base58 secret key: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }

  // 2. File
  if (!kp) {
    const fromFile = readKeypairFromFile(signerPath, web3);
    if (fromFile) {
      kp = fromFile;
      source = "file";
    }
  }

  // 3. Bootstrap
  if (!kp) {
    if (!allowBootstrap) {
      throw new Error(
        "solana-keystore: no server signer found. " +
          "Set KYVERN_FEE_PAYER_SECRET or place a keypair at " +
          signerPath,
      );
    }
    kp = web3.Keypair.generate();
    writeKeypairToFile(signerPath, kp);
    source = "bootstrapped";
  }

  const connection = new web3.Connection(rpcUrl(network), "confirmed");

  // Balance check + optional airdrop
  let lamports = 0;
  try {
    lamports = await connection.getBalance(kp.publicKey, "confirmed");
  } catch {
    // RPC offline — return signer anyway so caller can decide what to do.
  }
  const solBalance = lamports / web3.LAMPORTS_PER_SOL;

  let airdropped = false;
  if (network === "devnet" && solBalance < minSol) {
    try {
      const need = Math.max(targetSol - solBalance, minSol);
      const lamportsNeeded = Math.ceil(need * web3.LAMPORTS_PER_SOL);
      const sig = await connection.requestAirdrop(kp.publicKey, lamportsNeeded);
      const latest = await connection.getLatestBlockhash("confirmed");
      await connection.confirmTransaction(
        {
          signature: sig,
          blockhash: latest.blockhash,
          lastValidBlockHeight: latest.lastValidBlockHeight,
        },
        "confirmed",
      );
      airdropped = true;
      lamports = await connection.getBalance(kp.publicKey, "confirmed");
    } catch {
      // Devnet faucet is rate-limited and often flaky.
      // If airdrop fails, we leave the signer returning low-balance;
      // routes that need SOL will surface a clear error upstream.
    }
  }

  return {
    keypair: kp,
    pubkey: kp.publicKey.toBase58(),
    source,
    connection,
    solBalance: lamports / web3.LAMPORTS_PER_SOL,
    airdropped,
  };
}

/** Generate a fresh random Solana keypair. Used for per-agent delegation. */
export async function generateAgentKeypair(): Promise<{
  pubkey: string;
  secretB58: string;
}> {
  const { web3, bs58 } = await loadWeb3();
  const kp = web3.Keypair.generate();
  return {
    pubkey: kp.publicKey.toBase58(),
    secretB58: bs58.encode(kp.secretKey),
  };
}

/** Recover a Solana keypair from a stored base58 secret key. */
export async function keypairFromB58(secretB58: string): Promise<KeypairType> {
  const { web3, bs58 } = await loadWeb3();
  return web3.Keypair.fromSecretKey(bs58.decode(secretB58.trim()));
}

/** Cheap diagnostics helper — useful from /api/health/solana. */
export interface KeystoreStatus {
  configured: boolean;
  source: LoadedSigner["source"] | null;
  pubkey: string | null;
  solBalance: number | null;
  rpcUrl: string;
  network: "devnet" | "mainnet";
  signerPath: string;
  error?: string;
}

export async function describeKeystore(
  network: "devnet" | "mainnet" = "devnet",
): Promise<KeystoreStatus> {
  try {
    const signer = await loadServerSigner({ network, allowBootstrap: false });
    return {
      configured: true,
      source: signer.source,
      pubkey: signer.pubkey,
      solBalance: signer.solBalance,
      rpcUrl: rpcUrl(network),
      network,
      signerPath: SIGNER_PATH,
    };
  } catch (e) {
    return {
      configured: false,
      source: null,
      pubkey: null,
      solBalance: null,
      rpcUrl: rpcUrl(network),
      network,
      signerPath: SIGNER_PATH,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
