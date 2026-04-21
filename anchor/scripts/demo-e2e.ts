#!/usr/bin/env -S npx tsx
/* ════════════════════════════════════════════════════════════════════
   demo-e2e.ts — the money shot.

   Produces a matched pair of devnet transactions that anchor our
   hackathon submission:

     1. an ALLOWED execute_payment — real USDC* moves via the full
        Kyvern → Squads CPI stack, visible on Solana Explorer
     2. THREE BLOCKED execute_payment attempts — the program rejects
        each with a specific KyvernError code, also visible as FAILED
        transactions on Solana Explorer with program-log error reasons

   * We mint our own 6-decimal SPL token to represent USDC. Circle's
     devnet USDC is a closed-mint Token-2022 account we can't freely
     fund, so every Squads demo repo does this. The ATA/transfer path
     is identical.

   The Explorer links this script prints are the *single most important
   artifact* in the submission. Paste them into SUBMISSION.md and drop
   screenshots of the "failed" tx into the first frame of the demo video.

   Usage:
     cd anchor
     npx tsx scripts/demo-e2e.ts

   Env:
     ANCHOR_PROVIDER_URL  (default: https://api.devnet.solana.com)
     ANCHOR_WALLET        (default: project signer at ../.kyvern/…)

   What this script does NOT do:
     · airdrop SOL — signer must already be funded (~0.5 SOL enough)
     · deploy the program — we deploy once via `anchor deploy`, not here
   ════════════════════════════════════════════════════════════════════ */

import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import * as multisig from "@sqds/multisig";
import * as bs58 from "bs58";
import { createHash } from "crypto";
import * as path from "path";
import * as fs from "fs";

import type { KyvernPolicy } from "../target/types/kyvern_policy";

const POLICY_SEED = Buffer.from("kyvern-policy-v1");

function sha256Bytes(input: string): Buffer {
  return createHash("sha256").update(input).digest();
}

function policyPda(
  programId: PublicKey,
  multisigPda: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POLICY_SEED, multisigPda.toBuffer()],
    programId,
  );
}

function fmt(pk: PublicKey | string) {
  const s = typeof pk === "string" ? pk : pk.toBase58();
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function tx(sig: string) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

function addr(pk: PublicKey | string) {
  const s = typeof pk === "string" ? pk : pk.toBase58();
  return `https://explorer.solana.com/address/${s}?cluster=devnet`;
}

function heading(s: string) {
  const bar = "─".repeat(Math.max(8, s.length + 6));
  console.log(`\n┌${bar}\n│  ${s}\n└${bar}`);
}

async function main() {
  // ── Provider ──
  // @ts-expect-error AnchorProvider.env() reads ANCHOR_PROVIDER_URL + ANCHOR_WALLET
  const provider = AnchorProvider.env() as AnchorProvider;
  anchor.setProvider(provider);
  const connection = provider.connection;
  const payer = (provider.wallet as anchor.Wallet).payer;

  // Load program from IDL (workspace isn't available outside mocha)
  const idlPath = path.resolve(__dirname, "../target/idl/kyvern_policy.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
  const program = new Program<KyvernPolicy>(idl, provider);

  heading("Kyvern Vault · end-to-end devnet demo");
  console.log("program:          ", program.programId.toBase58());
  console.log("program explorer: ", addr(program.programId));
  console.log("signer (fee payer):", payer.publicKey.toBase58(), "—", fmt(payer.publicKey));
  const balance = await connection.getBalance(payer.publicKey);
  console.log("signer balance:   ", (balance / 1e9).toFixed(4), "SOL");
  if (balance < 0.5 * 1e9) {
    throw new Error("signer needs ≥0.5 SOL for this demo (create mint + multisig + spending limit)");
  }

  // ── 1. Mint a test-USDC (6-decimal SPL, payer is authority) ──
  heading("1/6  minting test-USDC");
  const mint = await createMint(connection, payer, payer.publicKey, null, 6);
  console.log("mint:            ", mint.toBase58());

  // ── 2. Create Squads multisig ──
  heading("2/6  creating Squads v4 multisig");
  const createKey = Keypair.generate();
  const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey });
  const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 });
  const [programConfigPda] = multisig.getProgramConfigPda({});
  const programConfig =
    await multisig.accounts.ProgramConfig.fromAccountAddress(connection, programConfigPda);

  const agent = Keypair.generate(); // The delegated agent member

  const createSig = await multisig.rpc.multisigCreateV2({
    connection,
    createKey,
    creator: payer,
    multisigPda,
    configAuthority: payer.publicKey,
    threshold: 1,
    members: [
      {
        key: payer.publicKey,
        permissions: multisig.types.Permissions.all(),
      },
    ],
    timeLock: 0,
    treasury: programConfig.treasury,
    rentCollector: null,
  });
  await connection.confirmTransaction(createSig, "confirmed");
  console.log("multisig PDA:    ", multisigPda.toBase58());
  console.log("vault PDA:       ", vaultPda.toBase58());
  console.log("create tx:       ", tx(createSig));

  // ── 3. Add spending limit (agent as member, daily $50 USDC) ──
  heading("3/6  delegating Squads spending limit to agent");
  const limitCreateKey = Keypair.generate();
  const [spendingLimitPda] = multisig.getSpendingLimitPda({
    multisigPda,
    createKey: limitCreateKey.publicKey,
  });

  const setLimitSig = await multisig.rpc.multisigAddSpendingLimit({
    connection,
    feePayer: payer,
    rentPayer: payer,
    multisigPda,
    configAuthority: payer.publicKey,
    spendingLimit: spendingLimitPda,
    createKey: limitCreateKey.publicKey,
    vaultIndex: 0,
    mint,
    amount: BigInt(50 * 1_000_000), // $50 daily
    period: multisig.types.Period.Day,
    members: [agent.publicKey],
    destinations: [],
    memo: "kyvern:demo",
  });
  await connection.confirmTransaction(setLimitSig, "confirmed");
  console.log("spending limit:  ", spendingLimitPda.toBase58());
  console.log("agent pubkey:    ", agent.publicKey.toBase58());
  console.log("set-limit tx:    ", tx(setLimitSig));

  // ── 4. Fund the vault's USDC ATA ──
  heading("4/6  funding the vault with 100 test-USDC");
  const vaultAta = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    vaultPda,
    true, // allow owner off-curve (vault PDA is off-curve)
  );
  await mintTo(connection, payer, mint, vaultAta.address, payer, 100 * 1_000_000);
  console.log("vault ATA:       ", vaultAta.address.toBase58());
  console.log("vault balance:   $100.00 test-USDC");

  // Destination wallet + its ATA
  const recipient = Keypair.generate();
  const destAta = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    recipient.publicKey,
  );
  console.log("recipient:       ", recipient.publicKey.toBase58());
  console.log("recipient ATA:   ", destAta.address.toBase58());

  // Fund the agent with a tiny bit of SOL so it can sign execute_payment
  const fundAgent = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: agent.publicKey,
      lamports: 0.02 * 1e9,
    }),
  );
  await provider.sendAndConfirm(fundAgent);

  // ── 5. Initialize our Kyvern policy ──
  heading("5/6  initializing Kyvern policy PDA");
  const [policy] = policyPda(program.programId, multisigPda);
  const allowedMerchant = "merchant.example.com";
  const initSig = await program.methods
    .initializePolicy({
      perTxMaxBaseUnits: new BN(1_000_000), // $1 per-tx cap
      requireMemo: true,
      velocityWindowSeconds: 60,
      velocityMaxCalls: 100,
      merchantAllowlist: [Array.from(sha256Bytes(allowedMerchant))],
    })
    .accounts({
      multisig: multisigPda,
      authority: payer.publicKey,
    })
    .rpc();
  await connection.confirmTransaction(initSig, "confirmed");
  console.log("policy PDA:      ", policy.toBase58());
  console.log("init tx:         ", tx(initSig));

  // Shared accounts block for execute_payment
  const executeAccounts = {
    policy,
    member: agent.publicKey,
    multisig: multisigPda,
    spendingLimit: spendingLimitPda,
    mint,
    vault: vaultPda,
    vaultTokenAccount: vaultAta.address,
    destination: recipient.publicKey,
    destinationTokenAccount: destAta.address,
    squadsProgram: new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf"),
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  };

  // ── 6. execute_payment — the main event ──
  heading("6/6  exercising execute_payment (CPI to Squads)");

  // 6a. ALLOWED: $0.50 to merchant.example.com with memo
  console.log("\n── 6a. ALLOWED call ──");
  // Inspect the instruction Anchor builds before submitting it.
  const inspectIx = await program.methods
    .executePayment({
      amount: new BN(500_000),
      decimals: 6,
      merchantHash: Array.from(sha256Bytes(allowedMerchant)),
      memo: "test forecast",
    })
    .accountsStrict(executeAccounts)
    .signers([agent])
    .instruction();
  console.log("[debug] account keys Anchor is serializing (positional):");
  inspectIx.keys.forEach((k: any, i: number) => {
    console.log(
      `  ${String(i).padStart(2)}. ${k.pubkey.toBase58()}` +
        (k.isWritable ? " (mut)" : "") +
        (k.isSigner ? " (signer)" : ""),
    );
  });
  console.log("[debug] expected system_program at slot 11:", SystemProgram.programId.toBase58());

  try {
    const allowedSig = await program.methods
      .executePayment({
        amount: new BN(500_000), // $0.50
        decimals: 6,
        merchantHash: Array.from(sha256Bytes(allowedMerchant)),
        memo: "test forecast",
      })
      .accountsStrict(executeAccounts)
      .signers([agent])
      .rpc({ skipPreflight: false });
    await connection.confirmTransaction(allowedSig, "confirmed");
    console.log("✓ allowed tx:    ", tx(allowedSig));
    const post = await connection.getTokenAccountBalance(destAta.address);
    console.log("  recipient balance:", post.value.uiAmountString, "USDC");
  } catch (e: any) {
    console.error("✗ allowed call unexpectedly failed:", e.message ?? e);
    throw e;
  }

  // Helper: build the execute_payment instruction and submit a raw
  // transaction so we can capture the signature even when the program
  // rejects the tx on-chain. `.rpc()` throws before returning the sig in
  // failure mode — a manual send + confirm loop lets us grab it.
  async function submitBlockedCase(
    label: string,
    args: {
      amount: BN;
      merchantHash: Buffer;
      memo: string | null;
    },
    expectedError: string,
  ) {
    console.log(`\n── ${label} ──`);
    const ix = await program.methods
      .executePayment({
        amount: args.amount,
        decimals: 6,
        merchantHash: Array.from(args.merchantHash),
        memo: args.memo,
      })
      .accountsStrict(executeAccounts)
      .instruction();

    const latest = await connection.getLatestBlockhash("confirmed");
    const tx2 = new Transaction({
      feePayer: payer.publicKey,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    }).add(ix);
    tx2.sign(payer, agent);

    let sig: string | null = null;
    try {
      sig = await connection.sendRawTransaction(tx2.serialize(), {
        skipPreflight: true,
        preflightCommitment: "confirmed",
      });
    } catch (e: any) {
      // Even sendRawTransaction with skipPreflight can reject at network
      // level for blockhash issues — print the error, not a fake success.
      console.log(`✗ could not even submit: ${e?.message ?? e}`);
      return;
    }

    // Wait for landing. confirmTransaction returns {value:{err}} on
    // on-chain error (doesn't throw) — it only throws for timeout.
    const confirmRes = await connection.confirmTransaction(
      {
        signature: sig,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      },
      "confirmed",
    );
    const detail = await connection.getTransaction(sig, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    const logs = detail?.meta?.logMessages ?? [];
    const errLine = logs.find((l) => l.includes("Error Code:"));

    if (confirmRes.value.err == null && !errLine) {
      console.log(`✗ UNEXPECTED pass — ${expectedError} did not fire`);
      console.log("  tx:            ", tx(sig));
      return;
    }

    const matched = errLine?.includes(expectedError) ?? false;
    console.log(
      matched
        ? `✓ rejected with ${expectedError}`
        : `? rejected (expected ${expectedError})${errLine ? " — got: " + errLine : ""}`,
    );
    console.log("  blocked tx:    ", tx(sig));
    if (errLine) console.log("  log:           ", errLine.trim());
  }

  await submitBlockedCase(
    "6b. BLOCKED: MerchantNotAllowlisted",
    {
      amount: new BN(500_000),
      merchantHash: sha256Bytes("evil.example.com"),
      memo: "drain",
    },
    "MerchantNotAllowlisted",
  );

  await submitBlockedCase(
    "6c. BLOCKED: AmountExceedsPerTxMax",
    {
      amount: new BN(5_000_000),
      merchantHash: sha256Bytes(allowedMerchant),
      memo: "overbudget",
    },
    "AmountExceedsPerTxMax",
  );

  await submitBlockedCase(
    "6d. BLOCKED: MissingMemo",
    {
      amount: new BN(500_000),
      merchantHash: sha256Bytes(allowedMerchant),
      memo: null,
    },
    "MissingMemo",
  );

  // ── Summary / paste-ready links ──
  heading("PROOF · paste these into SUBMISSION.md");
  console.log(`program:         ${addr(program.programId)}`);
  console.log(`multisig PDA:    ${addr(multisigPda)}`);
  console.log(`vault PDA:       ${addr(vaultPda)}`);
  console.log(`spending limit:  ${addr(spendingLimitPda)}`);
  console.log(`policy PDA:      ${addr(policy)}`);
  console.log("");
  console.log(`create multisig: ${tx(createSig)}`);
  console.log(`set limit:       ${tx(setLimitSig)}`);
  console.log(`init policy:     ${tx(initSig)}`);
  console.log("");
  console.log("✓ end-to-end CPI composition works on devnet.");

  // Paste-ready SDK smoke command so we can hit the same vault with the
  // shipped OnChainVault class.
  const agentB58 = (bs58 as any).default?.encode
    ? (bs58 as any).default.encode(agent.secretKey)
    : (bs58 as any).encode(agent.secretKey);

  heading("Next: verify the SHIPPED SDK against this vault");
  console.log("Run:");
  console.log(`
  npx tsx scripts/sdk-smoke.ts \\
    --multisig=${multisigPda.toBase58()} \\
    --spendingLimit=${spendingLimitPda.toBase58()} \\
    --mint=${mint.toBase58()} \\
    --destination=${recipient.publicKey.toBase58()} \\
    --agentKey=${agentB58}
`);
}

async function findFailedSignature(
  _conn: any,
  _err: any,
): Promise<string | null> {
  // Anchor sometimes attaches signature via err.signature (newer),
  // err.tx (older), or embeds it in logs. Fallback helper — returns
  // null if we can't extract; the test still passes because we
  // assert on logs/error text, not signature.
  return null;
}

main().catch((e) => {
  console.error("\n✗ demo-e2e failed:");
  console.error(e?.stack ?? e);
  process.exit(1);
});
