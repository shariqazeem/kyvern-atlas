/**
 * Phase 0 — Pyth devnet feed health check.
 *
 * Run with: npx tsx scripts/verify-pyth-feeds.ts
 *
 * Reads each candidate Pyth devnet price feed account directly via
 * RPC + the classic Pyth price layout. We avoid the heavier
 * `@pythnetwork/client` SDK so devs don't need to install extra
 * deps just to run a verification spike.
 *
 * VERIFIED 2026-05-07: Pyth's classic devnet feeds are no longer
 * maintained. Pyth migrated to the **Pyth Pull Oracle** (Hermes-based,
 * receiver program `rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ`).
 * This means the Phase 1 `swap_via_oracle` Rust source needs the
 * `pyth-solana-receiver-sdk` crate (not `pyth-sdk-solana`) and the
 * runtime needs to:
 *   1. Fetch a signed price update from Hermes
 *      (`https://hermes.pyth.network/api/latest_price_feeds?ids[]=…`)
 *   2. Submit `update_price_feeds` to the receiver program first
 *   3. Then call `swap_via_oracle` reading the receiver-owned PDA
 *
 * Hackathon-pragmatic alternative: keep the Phase 1 architecture but
 * have the swap instruction accept a `(price, signature)` pair from
 * a trusted oracle keypair (the platform itself), validated against
 * a hardcoded oracle pubkey in the program. Lighter but still
 * "chain decides" — the on-chain check is signature + slippage +
 * caps + allowlist.
 *
 * This script keeps probing the legacy feed pubkeys so anyone running
 * it sees the "NOT FOUND" verdict and knows to switch SDK paths.
 */

import { Connection, PublicKey } from "@solana/web3.js";

const FEEDS: Array<{ name: string; pubkey: string }> = [
  { name: "SOL/USD", pubkey: "J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVFvZ" },
  { name: "USDC/USD", pubkey: "5SSkXsEKQepHHAewytPVwdej4epN1nxgLVM84L4KXgy7" },
  { name: "BTC/USD", pubkey: "HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J" },
  { name: "ETH/USD", pubkey: "EdVCmQ9FSPcVRAvxcUuoLHt1J2NkB1hLsSHmqVFmSmH1" },
];

const STALE_AFTER_SECONDS = 60;

interface PythPrice {
  price: bigint;
  expo: number;
  publishTime: bigint;
  conf: bigint;
}

/** Decode the classic Pyth `priceData` struct from a devnet feed.
 *  Layout: 240-byte header followed by `aggregatePrice` block at
 *  offset 208. The aggregate is what `load_price_feed_from_account_info`
 *  on the Rust side reads. */
function decodePythPrice(buf: Buffer): PythPrice | null {
  if (buf.length < 240) return null;
  // Magic check
  const magic = buf.readUInt32LE(0);
  if (magic !== 0xa1b2c3d4) return null;
  // Aggregate price layout: priceType(1) + status(1) + corpAct(1) + pubSlot(8) + price(8) + conf(8) + expo(4) + numPub(4) + ...
  const expo = buf.readInt32LE(20);
  // The "agg" block starts at offset 208 (after price header + numComponents + lastSlot + validSlot)
  const aggStatus = buf.readUInt32LE(212);
  if (aggStatus !== 1) return null; // 1 = trading
  const aggPrice = buf.readBigInt64LE(216);
  const aggConf = buf.readBigUInt64LE(224);
  const aggPubSlot = buf.readBigUInt64LE(232);
  // PubSlot → approximate publish time: not available without slot→time
  // mapping; for the spike purposes we treat slot age as a proxy for staleness
  // by reading current slot and comparing.
  void aggPubSlot;
  return {
    price: aggPrice,
    expo,
    publishTime: 0n, // calculated by caller using slot delta
    conf: aggConf,
  };
}

async function main() {
  const conn = new Connection("https://api.devnet.solana.com", "confirmed");
  const currentSlot = await conn.getSlot("confirmed");

  console.log("\nPyth devnet feed health check");
  console.log("─".repeat(72));
  console.log(`current slot: ${currentSlot}\n`);

  for (const f of FEEDS) {
    try {
      const account = await conn.getAccountInfo(new PublicKey(f.pubkey));
      if (!account) {
        console.log(`✗ ${f.name.padEnd(10)} ${f.pubkey} → NOT FOUND`);
        continue;
      }
      const decoded = decodePythPrice(account.data);
      if (!decoded) {
        console.log(`✗ ${f.name.padEnd(10)} ${f.pubkey} → NOT TRADING / bad layout`);
        continue;
      }
      const price = Number(decoded.price) * Math.pow(10, decoded.expo);
      // Slot age — devnet ~400ms slots
      const pubSlot = Number(account.data.readBigUInt64LE(232));
      const slotAge = currentSlot - pubSlot;
      const ageSeconds = slotAge * 0.4;
      const fresh = ageSeconds < STALE_AFTER_SECONDS;
      const status = fresh ? "✓ fresh" : `⚠ stale (${ageSeconds.toFixed(0)}s)`;
      console.log(
        `${fresh ? "✓" : "⚠"} ${f.name.padEnd(10)} $${price.toFixed(2).padStart(12)} · ${status}`,
      );
    } catch (e) {
      console.log(
        `✗ ${f.name.padEnd(10)} ${f.pubkey} → ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
  console.log();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
