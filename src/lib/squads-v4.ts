/* ════════════════════════════════════════════════════════════════════
   squads-v4 — server-side adapter for Squads Protocol v4.

   Default is REAL on-chain execution.
   Set KYVERN_SQUADS_MODE=stub to force the deterministic offline path
   (used by unit tests and demos without RPC access).

   Real mode expects one of:
     · a funded server signer loaded via src/lib/solana-keystore.ts
       (env KYVERN_FEE_PAYER_SECRET, or ./.kyvern/server-signer.json, or
        auto-bootstrapped on devnet with an automatic airdrop)
     · KYVERN_SOLANA_RPC_URL (optional) — custom RPC host; defaults to
       api.devnet.solana.com / api.mainnet-beta.solana.com

   The caller (route handlers) owns per-vault state:
     · On createVault    → we return { address, vaultPda, createSignature }.
     · On setSpendingLimit → caller passes the agent's Solana pubkey and
                             we return { spendingLimitPda, createKey,
                             setSignature } for persistence.
     · On coSignPayment  → caller passes the stored spendingLimitPda and
                             the agent's secret key (base58).
   ════════════════════════════════════════════════════════════════════ */

import { createHash, randomBytes } from "crypto";
import {
  loadServerSigner,
  keypairFromB58,
  rpcUrl as keystoreRpcUrl,
} from "./solana-keystore";

const BASE58 =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const USDC_MINT = {
  mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
} as const;

function base58Stub(bytes: Uint8Array): string {
  let num = 0n;
  for (const b of bytes) num = (num << 8n) + BigInt(b);
  let s = "";
  while (num > 0n) {
    const rem = Number(num % 58n);
    s = BASE58[rem] + s;
    num /= 58n;
  }
  for (const b of bytes) {
    if (b === 0) s = "1" + s;
    else break;
  }
  return s;
}

function deterministicBytes(seed: string, length: number): Uint8Array {
  const out = new Uint8Array(length);
  let h = createHash("sha256").update(seed).digest();
  let pos = 0;
  while (pos < length) {
    const take = Math.min(h.length, length - pos);
    out.set(h.subarray(0, take), pos);
    pos += take;
    h = createHash("sha256").update(h).digest();
  }
  return out;
}

function mode(): "real" | "stub" {
  // Explicit opt-out for tests / CI / offline demos
  if (process.env.KYVERN_SQUADS_MODE === "stub") return "stub";
  // Explicit opt-in (for future parity with older env var values)
  if (process.env.KYVERN_SQUADS_MODE === "real") return "real";
  // Default: real. Real mode degrades to "require a signer" which will
  // auto-bootstrap on devnet so a fresh install Just Works.
  return "real";
}

/* ─── Types (mirror @sqds/multisig v4) ─── */

export interface CreateSmartAccountInput {
  /** The owner's Solana wallet — sole full-authority member. */
  ownerPubkey: string;
  /** Seed salt so the PDA is deterministic per vault record (stub) or
   *  is used as the Squads createKey label (real). */
  vaultSeed: string;
  /** Which Solana cluster this vault lives on. */
  network: "devnet" | "mainnet";
}

export interface SmartAccount {
  /** The Squads v4 multisig PDA — the vault's on-chain address. */
  address: string;
  /** The delegated "vault" PDA that receives USDC. */
  vaultPda: string;
  /** Tx signature of the initialization call. */
  createSignature: string;
}

export interface SetSpendingLimitInput {
  smartAccountAddress: string;
  /** Base58 Solana pubkey of the delegate agent. Required in real mode. */
  agentKeyPubkey: string | null;
  dailyLimitUsd: number;
  weeklyLimitUsd: number;
  perTxMaxUsd: number;
  network?: "devnet" | "mainnet";
}

export interface SpendingLimit {
  smartAccountAddress: string;
  spendingLimitPda: string;
  /** Base58 pubkey of the random createKey used to derive the PDA.
   *  Persist this so you can always re-derive/verify the account. */
  spendingLimitCreateKey: string;
  setSignature: string;
}

export interface CoSignPaymentInput {
  smartAccountAddress: string;
  spendingLimitPda: string;
  /** Base58 secret key for the agent delegate that owns the spending limit. */
  agentSecretB58: string;
  merchant: string;
  recipientPubkey: string;
  amountUsd: number;
  memo: string | null;
  network: "devnet" | "mainnet";
}

export interface CoSignResult {
  txSignature: string;
  explorerUrl: string;
}

/* ─── Real-mode helpers (all lazy) ─── */

async function loadSdk() {
  const [sqds, web3, spl] = await Promise.all([
    import("@sqds/multisig"),
    import("@solana/web3.js"),
    import("@solana/spl-token"),
  ]);
  return { sqds, web3, spl };
}

function stubAddressFromSeed(seed: string, salt: string): string {
  const bytes = deterministicBytes(`${seed}::${salt}`, 32);
  return base58Stub(bytes);
}

function stubSignature(): string {
  return base58Stub(randomBytes(64));
}

function explorerUrl(sig: string, network: "devnet" | "mainnet"): string {
  const cluster = network === "mainnet" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/tx/${sig}${cluster}`;
}

function explorerAddressUrl(
  address: string,
  network: "devnet" | "mainnet",
): string {
  const cluster = network === "mainnet" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/address/${address}${cluster}`;
}

/**
 * Wait for a transaction to be confirmed on-chain. Throws with the full
 * on-chain error if the tx failed — crucially, this prevents us from
 * returning a "fake success" signature for a tx that never actually landed.
 */
async function confirmOrThrow(
  connection: import("@solana/web3.js").Connection,
  signature: string,
  latestBlockhash: { blockhash: string; lastValidBlockHeight: number },
  label: string,
): Promise<void> {
  const conf = await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed",
  );
  if (conf.value.err) {
    throw new Error(
      `squads ${label} tx failed on-chain: ${JSON.stringify(conf.value.err)} (sig=${signature})`,
    );
  }
}

/* ─── Public API ─── */

export async function createSmartAccount(
  input: CreateSmartAccountInput,
): Promise<SmartAccount> {
  if (mode() === "stub") {
    const address = stubAddressFromSeed(input.vaultSeed, "multisig");
    const vaultPda = stubAddressFromSeed(input.vaultSeed, "vault");
    return { address, vaultPda, createSignature: stubSignature() };
  }

  const { sqds, web3 } = await loadSdk();
  const signer = await loadServerSigner({ network: input.network });
  const connection = signer.connection;
  const feePayer = signer.keypair;

  // createKey derived from vaultSeed so repeated calls with the same seed
  // produce the same multisig PDA (idempotent).
  const createKeySeed = deterministicBytes(
    `${input.vaultSeed}::squads-create-key`,
    32,
  );
  const createKey = web3.Keypair.fromSeed(createKeySeed);

  const [multisigPda] = sqds.getMultisigPda({
    createKey: createKey.publicKey,
  });
  const [programConfigPda] = sqds.getProgramConfigPda({});

  const programConfig = await sqds.accounts.ProgramConfig.fromAccountAddress(
    connection,
    programConfigPda,
  );

  // Idempotency check — if this multisig already exists on-chain (because
  // the user retried the same vaultSeed), return it instead of throwing.
  const existing = await connection.getAccountInfo(multisigPda, "confirmed");
  if (existing) {
    const [vaultPdaExisting] = sqds.getVaultPda({ multisigPda, index: 0 });
    return {
      address: multisigPda.toBase58(),
      vaultPda: vaultPdaExisting.toBase58(),
      createSignature: "(already-initialized)",
    };
  }

  const latest = await connection.getLatestBlockhash("confirmed");

  const createSignature = await sqds.rpc.multisigCreateV2({
    connection,
    createKey,
    creator: feePayer,
    multisigPda,
    // configAuthority = feePayer means the server signer can directly
    // mutate config (e.g. add spending limits) without a proposal flow.
    // For a single-member, server-managed vault this is the correct shape;
    // null would force every config change through configTransactionCreate
    // → proposalApprove → configTransactionExecute.
    configAuthority: feePayer.publicKey,
    threshold: 1,
    members: [
      {
        key: new web3.PublicKey(input.ownerPubkey),
        permissions: sqds.types.Permissions.all(),
      },
    ],
    timeLock: 0,
    treasury: programConfig.treasury,
    rentCollector: null,
  });

  await confirmOrThrow(connection, createSignature, latest, "multisigCreateV2");

  // Hard guarantee: the multisig PDA must exist on-chain after this call.
  // If getAccountInfo returns null we never want to persist a vault row.
  const verify = await connection.getAccountInfo(multisigPda, "confirmed");
  if (!verify) {
    throw new Error(
      `multisig PDA not found after create (sig=${createSignature}, pda=${multisigPda.toBase58()})`,
    );
  }

  const [vaultPda] = sqds.getVaultPda({ multisigPda, index: 0 });

  return {
    address: multisigPda.toBase58(),
    vaultPda: vaultPda.toBase58(),
    createSignature,
  };
}

export async function setSpendingLimit(
  input: SetSpendingLimitInput,
): Promise<SpendingLimit> {
  if (mode() === "stub") {
    const spendingLimitPda = stubAddressFromSeed(
      input.smartAccountAddress,
      "spending_limit",
    );
    return {
      smartAccountAddress: input.smartAccountAddress,
      spendingLimitPda,
      spendingLimitCreateKey: stubAddressFromSeed(
        input.smartAccountAddress,
        "spending_limit_create_key",
      ),
      setSignature: stubSignature(),
    };
  }

  if (!input.agentKeyPubkey) {
    throw new Error(
      "squads-v4 real mode: agentKeyPubkey is required to set a spending limit",
    );
  }

  const { sqds, web3 } = await loadSdk();
  const network = input.network ?? "devnet";
  const signer = await loadServerSigner({ network });
  const connection = signer.connection;
  const feePayer = signer.keypair;

  const multisigPda = new web3.PublicKey(input.smartAccountAddress);
  const agentPubkey = new web3.PublicKey(input.agentKeyPubkey);

  // Random createKey per spending limit — we store its pubkey in the DB so
  // we can always re-derive the PDA later.
  const createKey = web3.Keypair.generate();
  const [spendingLimitPda] = sqds.getSpendingLimitPda({
    multisigPda,
    createKey: createKey.publicKey,
  });

  // USDC has 6 decimals — scale USD → base units.
  const dailyAmount = BigInt(Math.round(input.dailyLimitUsd * 1_000_000));

  const latest = await connection.getLatestBlockhash("confirmed");

  const setSignature = await sqds.rpc.multisigAddSpendingLimit({
    connection,
    feePayer,
    rentPayer: feePayer,
    multisigPda,
    // configAuthority must equal the value the multisig was created with.
    // We now create multisigs with configAuthority = feePayer.publicKey
    // (see createSmartAccount), so the feePayer can directly mutate config
    // — no proposal flow needed.
    configAuthority: feePayer.publicKey,
    spendingLimit: spendingLimitPda,
    createKey: createKey.publicKey,
    vaultIndex: 0,
    mint: new web3.PublicKey(USDC_MINT[network]),
    amount: dailyAmount,
    period: sqds.types.Period.Day,
    members: [agentPubkey],
    destinations: [],
    memo: `kyvern:vault:${input.smartAccountAddress.slice(0, 8)}`,
  });

  await confirmOrThrow(
    connection,
    setSignature,
    latest,
    "multisigAddSpendingLimit",
  );

  // Verify the spending-limit PDA actually exists post-confirm.
  const verify = await connection.getAccountInfo(spendingLimitPda, "confirmed");
  if (!verify) {
    throw new Error(
      `spending limit PDA not found after add (sig=${setSignature}, pda=${spendingLimitPda.toBase58()})`,
    );
  }

  return {
    smartAccountAddress: input.smartAccountAddress,
    spendingLimitPda: spendingLimitPda.toBase58(),
    spendingLimitCreateKey: createKey.publicKey.toBase58(),
    setSignature,
  };
}

export async function coSignPayment(
  input: CoSignPaymentInput,
): Promise<CoSignResult> {
  if (mode() === "stub") {
    const sig = stubSignature();
    return { txSignature: sig, explorerUrl: explorerUrl(sig, input.network) };
  }

  const { sqds, web3, spl } = await loadSdk();
  const signer = await loadServerSigner({ network: input.network });
  const connection = signer.connection;
  const feePayer = signer.keypair;
  const agent = await keypairFromB58(input.agentSecretB58);

  const multisigPda = new web3.PublicKey(input.smartAccountAddress);
  const mint = new web3.PublicKey(USDC_MINT[input.network]);
  const spendingLimitPda = new web3.PublicKey(input.spendingLimitPda);

  // SDK wants amount as a plain number (base units). USDC caps well
  // below Number.MAX_SAFE_INTEGER so this is safe.
  const amount = Math.round(input.amountUsd * 1_000_000);
  const destination = new web3.PublicKey(input.recipientPubkey);

  const latest = await connection.getLatestBlockhash("confirmed");

  let txSignature: string;
  try {
    txSignature = await sqds.rpc.spendingLimitUse({
      connection,
      feePayer,
      member: agent,
      multisigPda,
      spendingLimit: spendingLimitPda,
      amount,
      decimals: 6,
      mint,
      vaultIndex: 0,
      destination,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
      memo: input.memo ?? undefined,
    });
  } catch (err) {
    // The raw `.message` from `sqds.rpc.spendingLimitUse` is often
    // unhelpful — it maps the on-chain custom program error code through
    // a generic SystemProgram error table, which means e.g. SPL Token's
    // `InsufficientFunds (0x1)` surfaces as "Account is already
    // initialized" (which is SystemProgram's 0x1). We scan the program
    // logs on the transaction error for the actual SPL token / Kyvern
    // program log line and throw a far more useful message.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    const logs: string[] = Array.isArray(e?.logs) ? e.logs : [];

    // Identify the real failure from program logs.
    let humanMessage: string | null = null;
    const joined = logs.join("\n");
    if (/InsufficientFunds|insufficient funds/i.test(joined)) {
      humanMessage =
        "vault has insufficient USDC — top up at the Circle faucet and try again";
    } else if (/MerchantNotAllowlisted/i.test(joined)) {
      humanMessage = "merchant is not on this vault's on-chain allowlist";
    } else if (/PerTxCapExceeded/i.test(joined)) {
      humanMessage = "amount exceeds per-transaction cap enforced on-chain";
    } else if (/DailyCapExceeded|WeeklyCapExceeded/i.test(joined)) {
      humanMessage = "payment would exceed the daily/weekly cap enforced on-chain";
    } else if (/VaultPaused/i.test(joined)) {
      humanMessage = "vault is paused — resume it to let the agent pay";
    } else if (/MemoRequired/i.test(joined)) {
      humanMessage = "this vault requires a memo but none was provided";
    }

    // Verbose server-side logging so future issues are easy to diagnose.
    console.error(
      "[coSignPayment] sqds.rpc.spendingLimitUse threw:",
      e?.message,
      logs.length > 0 ? "\n--- program logs ---\n" + joined + "\n--- end logs ---" : "",
      "\ninputs:",
      {
        multisig: input.smartAccountAddress,
        spendingLimit: input.spendingLimitPda,
        destination: input.recipientPubkey,
        amountUsd: input.amountUsd,
        network: input.network,
      },
    );

    // Re-throw with the improved message if we were able to decode one.
    if (humanMessage) {
      const friendly = new Error(humanMessage);
      // Preserve the original stack + logs for future debugging.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (friendly as any).originalError = e;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (friendly as any).logs = logs;
      throw friendly;
    }
    throw err;
  }

  await confirmOrThrow(connection, txSignature, latest, "spendingLimitUse");

  return {
    txSignature,
    explorerUrl: explorerUrl(txSignature, input.network),
  };
}

export { explorerAddressUrl };

export interface VaultAtaInfo {
  vaultPda: string;
  vaultAta: string;
  usdcMint: string;
  created: boolean;
  createSignature: string | null;
}

/**
 * Make a freshly-created vault payment-ready by ensuring its USDC ATA
 * exists on-chain. Called immediately after `setSpendingLimit` in the
 * create flow so the first call to `/api/vault/pay` doesn't fail with
 * "The program expected this account to be already initialized".
 *
 * Idempotent: if the ATA already exists, returns { created: false } and
 * skips the tx. Safe to re-run during retries.
 *
 * In stub mode, returns synthetic addresses so the client still gets a
 * meaningful "fund your vault" display without needing RPC.
 */
export async function ensureVaultUsdcAta(input: {
  smartAccountAddress: string;
  network: "devnet" | "mainnet";
}): Promise<VaultAtaInfo> {
  const usdcMint = USDC_MINT[input.network];

  if (mode() === "stub") {
    // Deterministic stubs so the UI can render. Payments won't actually
    // settle but the "Fund your vault" widget shows a plausible ATA.
    return {
      vaultPda: stubAddressFromSeed(input.smartAccountAddress, "vault"),
      vaultAta: stubAddressFromSeed(input.smartAccountAddress, "ata"),
      usdcMint,
      created: false,
      createSignature: null,
    };
  }

  const { sqds, web3, spl } = await loadSdk();
  const signer = await loadServerSigner({ network: input.network });
  const connection = signer.connection;

  const multisigPda = new web3.PublicKey(input.smartAccountAddress);
  const [vaultPda] = sqds.getVaultPda({ multisigPda, index: 0 });
  const mint = new web3.PublicKey(usdcMint);

  // Vault PDA is off-curve (program-derived), so allowOwnerOffCurve: true.
  const vaultAta = spl.getAssociatedTokenAddressSync(mint, vaultPda, true);

  // Fast path: ATA already exists, nothing to do. Use "confirmed"
  // commitment so we don't get a stale null right after a
  // near-simultaneous create elsewhere.
  const existing = await connection.getAccountInfo(vaultAta, "confirmed");
  if (existing) {
    return {
      vaultPda: vaultPda.toBase58(),
      vaultAta: vaultAta.toBase58(),
      usdcMint,
      created: false,
      createSignature: null,
    };
  }

  // Create it — one tx, paid by server signer.
  const ix = spl.createAssociatedTokenAccountInstruction(
    signer.keypair.publicKey, // payer
    vaultAta,
    vaultPda,
    mint,
    spl.TOKEN_PROGRAM_ID,
    spl.ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const tx = new web3.Transaction().add(ix);
  tx.feePayer = signer.keypair.publicKey;
  const latest = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = latest.blockhash;
  tx.sign(signer.keypair);

  try {
    const sig = await connection.sendRawTransaction(tx.serialize());
    await confirmOrThrow(connection, sig, latest, "createAssociatedTokenAccount");
    return {
      vaultPda: vaultPda.toBase58(),
      vaultAta: vaultAta.toBase58(),
      usdcMint,
      created: true,
      createSignature: sig,
    };
  } catch (e) {
    // Same race as ensureRecipientUsdcAta — if the ATA was created by
    // a parallel request between our check and create, Solana yells
    // "Account is already initialized". That's a success for us.
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("already in use") ||
      msg.includes("already initialized") ||
      msg.includes("AccountAlreadyInUse") ||
      msg.toLowerCase().includes("allocate: account address")
    ) {
      return {
        vaultPda: vaultPda.toBase58(),
        vaultAta: vaultAta.toBase58(),
        usdcMint,
        created: false,
        createSignature: null,
      };
    }
    throw e;
  }
}

/**
 * Ensure a recipient's USDC ATA exists. Called from /api/vault/pay right
 * before coSignPayment so the transfer has a valid destination token
 * account. If the recipient already has one (common for real wallets),
 * this is a free no-op.
 */
export async function ensureRecipientUsdcAta(input: {
  recipientPubkey: string;
  network: "devnet" | "mainnet";
}): Promise<{ ata: string; created: boolean; signature: string | null }> {
  if (mode() === "stub") {
    return {
      ata: stubAddressFromSeed(input.recipientPubkey, "recip-ata"),
      created: false,
      signature: null,
    };
  }
  const { web3, spl } = await loadSdk();
  const signer = await loadServerSigner({ network: input.network });
  const connection = signer.connection;
  const mint = new web3.PublicKey(USDC_MINT[input.network]);
  const owner = new web3.PublicKey(input.recipientPubkey);
  // allowOwnerOffCurve: true covers both regular wallets and PDAs.
  const ata = spl.getAssociatedTokenAddressSync(mint, owner, true);

  // Explicit "confirmed" commitment so we don't get a stale null from
  // the "processed" view right after a previous create in the same
  // session. This was the root cause of payments intermittently
  // failing with "Account is already initialized" — we'd re-try the
  // create because getAccountInfo lied, Solana would reject because
  // the ATA actually existed.
  const existing = await connection.getAccountInfo(ata, "confirmed");
  if (existing) {
    return { ata: ata.toBase58(), created: false, signature: null };
  }

  const tx = new web3.Transaction().add(
    spl.createAssociatedTokenAccountInstruction(
      signer.keypair.publicKey,
      ata,
      owner,
      mint,
      spl.TOKEN_PROGRAM_ID,
      spl.ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
  );
  tx.feePayer = signer.keypair.publicKey;
  const latest = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = latest.blockhash;
  tx.sign(signer.keypair);

  // Belt-and-suspenders: if we lost the race (two concurrent pays to
  // a never-seen-before recipient would both try to create the ATA),
  // Solana rejects the second with "Account is already initialized".
  // Treat that as success — the account exists, which is what we wanted.
  try {
    const sig = await connection.sendRawTransaction(tx.serialize());
    await confirmOrThrow(connection, sig, latest, "createRecipientAta");
    return { ata: ata.toBase58(), created: true, signature: sig };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("already in use") ||
      msg.includes("already initialized") ||
      msg.includes("AccountAlreadyInUse") ||
      msg.toLowerCase().includes("allocate: account address")
    ) {
      return { ata: ata.toBase58(), created: false, signature: null };
    }
    throw e;
  }
}

export function isSquadsReal(): boolean {
  return mode() === "real";
}

export function squadsConfigSummary(): {
  mode: "real" | "stub";
  rpcConfigured: boolean;
  feePayerEnvConfigured: boolean;
  rpcUrlDevnet: string;
  rpcUrlMainnet: string;
} {
  return {
    mode: mode(),
    rpcConfigured: !!process.env.KYVERN_SOLANA_RPC_URL,
    feePayerEnvConfigured: !!process.env.KYVERN_FEE_PAYER_SECRET,
    rpcUrlDevnet: keystoreRpcUrl("devnet"),
    rpcUrlMainnet: keystoreRpcUrl("mainnet"),
  };
}
