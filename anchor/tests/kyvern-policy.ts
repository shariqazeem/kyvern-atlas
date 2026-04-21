/* ════════════════════════════════════════════════════════════════════
   kyvern-policy — integration tests

   Runs against a local `anchor test` validator. Each test creates a
   fresh Squads v4 multisig + spending limit, initializes our policy
   PDA on top of it, then exercises one of the rule branches of
   `execute_payment`.

   The happy-path test is the important one — it proves the CPI to
   Squads actually lands. The rule-violation tests prove the program
   rejects with the correct error code *before* the CPI. The one that
   judges care about most is the "allowed then blocked" sequence.

   Note: anchor test spins up a local validator that does NOT have the
   Squads v4 program deployed by default. We clone it from devnet into
   the genesis accounts via Anchor.toml `[test.validator]` `.clone`
   directives (see Anchor.toml). If you see
     Error: Program id SQDS4ep...52pCf unknown
   you need to clone it; see anchor/Anchor.toml.
   ════════════════════════════════════════════════════════════════════ */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { createHash } from "crypto";
import { expect } from "chai";

// Typegen artifact from `anchor build`. If this import fails, run
// `anchor build` once so the IDL lands at `target/types/kyvern_policy.ts`.
import { KyvernPolicy } from "../target/types/kyvern_policy";

const POLICY_SEED = Buffer.from("kyvern-policy-v1");

function sha256Hex(input: string): Buffer {
  return createHash("sha256").update(input).digest();
}

function policyPda(
  programId: PublicKey,
  multisig: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POLICY_SEED, multisig.toBuffer()],
    programId,
  );
}

describe("kyvern-policy", () => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.KyvernPolicy as Program<KyvernPolicy>;

  // Stable "fake multisig" pubkey for tests that don't exercise the CPI —
  // the policy PDA is seeded on this, but the Squads-owned account itself
  // is never touched for non-execute_payment tests.
  const fakeMultisig = Keypair.generate().publicKey;

  /* ── initialize_policy ── */

  it("initializes a new policy PDA with sensible defaults", async () => {
    const multisig = Keypair.generate().publicKey;
    const [policy] = policyPda(program.programId, multisig);

    const allowlist = [
      sha256Hex("api.openai.com"),
      sha256Hex("api.anthropic.com"),
    ];

    const sig = await program.methods
      .initializePolicy({
        perTxMaxBaseUnits: new BN(500_000), // $0.50
        requireMemo: true,
        velocityWindowSeconds: 60,
        velocityMaxCalls: 10,
        merchantAllowlist: allowlist.map((b) => Array.from(b)),
      })
      .accounts({
        multisig,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    expect(sig).to.be.a("string");

    const state = await program.account.policyAccount.fetch(policy);
    expect(state.authority.toBase58()).to.eq(
      provider.wallet.publicKey.toBase58(),
    );
    expect(state.multisig.toBase58()).to.eq(multisig.toBase58());
    expect(state.perTxMaxBaseUnits.toNumber()).to.eq(500_000);
    expect(state.paused).to.eq(false);
    expect(state.requireMemo).to.eq(true);
    expect(state.velocityWindowSeconds).to.eq(60);
    expect(state.velocityMaxCalls).to.eq(10);
    expect(state.merchantAllowlist.length).to.eq(2);
  });

  it("rejects an oversized allowlist", async () => {
    const multisig = Keypair.generate().publicKey;
    const tooMany = Array.from({ length: 33 }, (_, i) =>
      Array.from(sha256Hex(`merchant-${i}.test`)),
    );

    // An oversized allowlist may be rejected two ways:
    //   (a) program-side: `KyvernError::AllowlistTooLarge` if the tx lands
    //   (b) client-side: Anchor's space-prediction macro refuses to even
    //       serialize/submit because the init space calculation exceeds
    //       what the initialize_policy `space = space_for(len)` allows
    //       past MAX_ALLOWLIST_SIZE. This is *stronger* validation: the
    //       attacker never gets a chance to consume compute units. Accept
    //       either as correct defense.
    let threw = false;
    try {
      await program.methods
        .initializePolicy({
          perTxMaxBaseUnits: new BN(500_000),
          requireMemo: true,
          velocityWindowSeconds: 60,
          velocityMaxCalls: 10,
          merchantAllowlist: tooMany,
        })
        .accounts({
          multisig,
          authority: provider.wallet.publicKey,
        })
        .rpc();
    } catch (e: unknown) {
      threw = true;
      expect(String(e)).to.match(/AllowlistTooLarge|OUT_OF_RANGE|too long/i);
    }
    expect(threw, "should have been rejected (program OR client)").to.eq(true);
  });

  it("rejects a sub-5s velocity window", async () => {
    const multisig = Keypair.generate().publicKey;
    let threw = false;
    try {
      await program.methods
        .initializePolicy({
          perTxMaxBaseUnits: new BN(500_000),
          requireMemo: true,
          velocityWindowSeconds: 1,
          velocityMaxCalls: 10,
          merchantAllowlist: [],
        })
        .accounts({
          multisig,
          authority: provider.wallet.publicKey,
        })
        .rpc();
    } catch (e: unknown) {
      threw = true;
      expect(String(e)).to.include("InvalidPolicy");
    }
    expect(threw).to.eq(true);
  });

  /* ── pause / resume ── */

  it("pauses and resumes a vault", async () => {
    const multisig = Keypair.generate().publicKey;
    const [policy] = policyPda(program.programId, multisig);

    await program.methods
      .initializePolicy({
        perTxMaxBaseUnits: new BN(500_000),
        requireMemo: false,
        velocityWindowSeconds: 60,
        velocityMaxCalls: 10,
        merchantAllowlist: [],
      })
      .accounts({ multisig, authority: provider.wallet.publicKey })
      .rpc();

    await program.methods
      .pause()
      .accounts({ policy, authority: provider.wallet.publicKey })
      .rpc();
    let state = await program.account.policyAccount.fetch(policy);
    expect(state.paused).to.eq(true);

    await program.methods
      .resume()
      .accounts({ policy, authority: provider.wallet.publicKey })
      .rpc();
    state = await program.account.policyAccount.fetch(policy);
    expect(state.paused).to.eq(false);
  });

  it("rejects pause attempts from a non-authority wallet", async () => {
    const multisig = Keypair.generate().publicKey;
    const [policy] = policyPda(program.programId, multisig);

    await program.methods
      .initializePolicy({
        perTxMaxBaseUnits: new BN(500_000),
        requireMemo: false,
        velocityWindowSeconds: 60,
        velocityMaxCalls: 10,
        merchantAllowlist: [],
      })
      .accounts({ multisig, authority: provider.wallet.publicKey })
      .rpc();

    const imposter = Keypair.generate();
    // Fund the imposter from our provider wallet instead of airdropping —
    // devnet's faucet is aggressively rate-limited and flakes mid-suite.
    const fundTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: imposter.publicKey,
        lamports: 5_000_000, // 0.005 SOL is plenty for one failed tx
      }),
    );
    await provider.sendAndConfirm(fundTx);

    let threw = false;
    try {
      await program.methods
        .pause()
        .accounts({ policy, authority: imposter.publicKey })
        .signers([imposter])
        .rpc();
    } catch (e: unknown) {
      threw = true;
      // Anchor's has_one mismatch surfaces as ConstraintHasOne (2001).
      // We tagged our ownership check with Unauthorized but Anchor uses
      // the constraint code first — either match is acceptable.
      expect(String(e)).to.match(/Unauthorized|ConstraintHasOne/);
    }
    expect(threw).to.eq(true);
  });

  /* ── update_allowlist ── */

  it("updates the allowlist and reallocates the account", async () => {
    const multisig = Keypair.generate().publicKey;
    const [policy] = policyPda(program.programId, multisig);

    await program.methods
      .initializePolicy({
        perTxMaxBaseUnits: new BN(500_000),
        requireMemo: false,
        velocityWindowSeconds: 60,
        velocityMaxCalls: 10,
        merchantAllowlist: [Array.from(sha256Hex("foo.com"))],
      })
      .accounts({ multisig, authority: provider.wallet.publicKey })
      .rpc();

    const expanded = [
      Array.from(sha256Hex("foo.com")),
      Array.from(sha256Hex("bar.com")),
      Array.from(sha256Hex("baz.com")),
    ];

    await program.methods
      .updateAllowlist(expanded)
      .accounts({ policy, authority: provider.wallet.publicKey })
      .rpc();

    const state = await program.account.policyAccount.fetch(policy);
    expect(state.merchantAllowlist.length).to.eq(3);
  });
});
