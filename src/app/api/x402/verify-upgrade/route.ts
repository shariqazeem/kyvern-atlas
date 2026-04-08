import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PAYTO = (process.env.X402_PAYTO_ADDRESS || "").toLowerCase();
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Minimum payment: $49 on mainnet, $1 on testnet (for demo flexibility)
const MIN_AMOUNT = process.env.X402_NETWORK === "eip155:8453" ? 49_000_000n : 1_000_000n;

// Verify a USDC payment on Base and activate the SESSION wallet's Pulse Pro tier.
//
// Two supported flows:
// 1. One-click via Privy embedded wallet — frontend submits the tx, then sends the
//    hash to this route immediately.
// 2. External wallet — user pays from any wallet (MetaMask, Coinbase Wallet, Phantom,
//    etc.), then pastes the tx hash here for verification.
//
// Both flows require an authenticated session. The activated account is always the
// SESSION wallet (the one the user signed in with), regardless of which wallet
// actually sent the on-chain payment. This decouples sign-in from payment.
export async function POST(req: NextRequest) {
  try {
    // Require an authenticated session — this is who gets activated
    const session = authenticateSession(req);
    if ("error" in session) {
      return NextResponse.json(
        { error: "Not authenticated. Sign in first, then try again." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const txHash = body.tx_hash;

    if (!txHash || !txHash.startsWith("0x") || txHash.length !== 66) {
      return NextResponse.json(
        { error: "Invalid transaction hash. Must start with 0x and be 66 characters long." },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if this tx has already been used for an upgrade (prevent double-use)
    const existing = db
      .prepare("SELECT id, wallet_address FROM subscriptions WHERE tx_hash = ?")
      .get(txHash) as { id: string; wallet_address: string } | undefined;

    if (existing) {
      return NextResponse.json(
        {
          error:
            existing.wallet_address === session.wallet
              ? "You've already used this transaction to upgrade. Your Pro plan is active."
              : "This transaction has already been claimed for an upgrade.",
        },
        { status: 400 }
      );
    }

    // Verify the transaction on-chain
    const client = createPublicClient({
      chain: base,
      transport: http(),
    });

    let receipt;
    try {
      receipt = await client.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });
    } catch {
      return NextResponse.json(
        {
          error:
            "Transaction not found on Base. It may still be confirming — wait 30 seconds and try again.",
        },
        { status: 400 }
      );
    }

    if (!receipt || receipt.status !== "success") {
      return NextResponse.json(
        { error: "Transaction failed or reverted on-chain." },
        { status: 400 }
      );
    }

    // Parse USDC Transfer logs — find a transfer of >= MIN_AMOUNT to PAYTO
    let payerAddress = "";
    let transferAmount = 0n;
    let validTransfer = false;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
        try {
          // topics[0] = Transfer event signature
          // topics[1] = from (padded to 32 bytes)
          // topics[2] = to (padded to 32 bytes)
          if (log.topics.length >= 3) {
            const toAddress = "0x" + (log.topics[2] || "").slice(26);
            if (toAddress.toLowerCase() === PAYTO) {
              const fromAddress = "0x" + (log.topics[1] || "").slice(26);
              const value = log.data ? BigInt(log.data) : 0n;

              if (value >= MIN_AMOUNT) {
                payerAddress = fromAddress;
                transferAmount = value;
                validTransfer = true;
                break;
              }
            }
          }
        } catch {
          continue;
        }
      }
    }

    if (!validTransfer) {
      return NextResponse.json(
        {
          error: `No valid USDC transfer found in this transaction. Make sure you sent at least $${
            Number(MIN_AMOUNT) / 1e6
          } USDC on Base mainnet to ${PAYTO.slice(0, 10)}...`,
        },
        { status: 400 }
      );
    }

    // Create subscription — attributed to the SESSION wallet (not the payer wallet)
    // This is the key change: users can pay from any wallet but get their authenticated
    // account upgraded.
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const subId = nanoid();
    const sessionWallet = session.wallet.toLowerCase();

    db.prepare(
      `
      INSERT INTO subscriptions (id, wallet_address, plan, tx_hash, network, amount_usd, started_at, expires_at, status)
      VALUES (?, ?, 'pro', ?, ?, ?, ?, ?, 'active')
    `
    ).run(
      subId,
      sessionWallet,
      txHash,
      "eip155:8453",
      Number(transferAmount) / 1e6,
      now.toISOString(),
      expiresAt.toISOString()
    );

    // Update the api_keys.tier for ALL keys owned by this session wallet
    db.prepare("UPDATE api_keys SET tier = 'pro' WHERE wallet_address = ?").run(sessionWallet);

    return NextResponse.json({
      success: true,
      subscription_id: subId,
      plan: "pro",
      activated_for: sessionWallet,
      paid_from: payerAddress,
      same_wallet: payerAddress.toLowerCase() === sessionWallet,
      tx_hash: txHash,
      amount_usd: Number(transferAmount) / 1e6,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      message: "Pulse Pro activated for 30 days",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
