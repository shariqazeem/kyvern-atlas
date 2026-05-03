#!/usr/bin/env -S npx tsx
/**
 * buyer-bot-init.ts — one-shot keypair generator for the Revenue
 * Terminal demo buyer.
 *
 * Usage on the VM:
 *   npx tsx scripts/buyer-bot-init.ts
 *
 * Outputs:
 *   1. Buyer's public key
 *   2. Buyer's USDC ATA address (paste into Circle faucet)
 *   3. The base58 secret to set as BUYER_BOT_SECRET_B58 on the
 *      buyer-bot pm2 process
 *
 * Does NOT persist anything. Operator copies the secret into pm2 env.
 */

import { Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import bs58 from "bs58";

const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);

const kp = Keypair.generate();
const ata = getAssociatedTokenAddressSync(USDC_MINT_DEVNET, kp.publicKey);

console.log("");
console.log("=== Buyer Bot Init ===");
console.log("");
console.log("Public key:           ", kp.publicKey.toBase58());
console.log("USDC ATA (devnet):    ", ata.toBase58());
console.log("");
console.log("Set this on pm2:");
console.log(
  "  BUYER_BOT_SECRET_B58=" + bs58.encode(Buffer.from(kp.secretKey)),
);
console.log("");
console.log("Then fund the USDC ATA via:");
console.log("  https://faucet.circle.com/  (Solana Devnet · USDC)");
console.log("  Paste this address: " + ata.toBase58());
console.log("");
console.log("Note: Solana faucet → public key for SOL fees.");
console.log("  https://faucet.solana.com/");
console.log("  Paste this address: " + kp.publicKey.toBase58());
console.log("");
