import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";

const PAYTO = (process.env.X402_PAYTO_ADDRESS || "").toLowerCase();
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Minimum payment: $49 on mainnet, $1 on testnet
const MIN_AMOUNT = process.env.X402_NETWORK === "eip155:8453" ? 49_000_000n : 1_000_000n;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const txHash = body.tx_hash;

    if (!txHash || !txHash.startsWith("0x")) {
      return NextResponse.json({ error: "Invalid transaction hash" }, { status: 400 });
    }

    const db = getDb();

    // Check if already used
    const existing = db.prepare("SELECT id FROM subscriptions WHERE tx_hash = ?").get(txHash);
    if (existing) {
      return NextResponse.json({ error: "This transaction has already been used for an upgrade" }, { status: 400 });
    }

    // Verify the transaction on-chain
    const client = createPublicClient({
      chain: base,
      transport: http(),
    });

    const receipt = await client.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (!receipt || receipt.status !== "success") {
      return NextResponse.json({ error: "Transaction failed or not found" }, { status: 400 });
    }

    // Parse USDC Transfer logs
    let payerAddress = "";
    let transferAmount = 0n;
    let validTransfer = false;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
        try {
          // Check if this is a Transfer to our payTo address
          // topics[0] = Transfer event sig, topics[1] = from, topics[2] = to
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
      return NextResponse.json({
        error: `No valid USDC transfer found to ${PAYTO.slice(0, 10)}... for at least $${Number(MIN_AMOUNT) / 1e6} USDC`
      }, { status: 400 });
    }

    // Create subscription
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const subId = nanoid();

    db.prepare(`
      INSERT INTO subscriptions (id, wallet_address, plan, tx_hash, network, amount_usd, started_at, expires_at, status)
      VALUES (?, ?, 'pro', ?, ?, ?, ?, ?, 'active')
    `).run(
      subId,
      payerAddress,
      txHash,
      "eip155:8453",
      Number(transferAmount) / 1e6,
      now.toISOString(),
      expiresAt.toISOString()
    );

    // Update api_keys tier to 'pro'
    db.prepare("UPDATE api_keys SET tier = 'pro' WHERE wallet_address = ?").run(payerAddress);

    return NextResponse.json({
      success: true,
      subscription_id: subId,
      plan: "pro",
      wallet: payerAddress,
      amount_usd: Number(transferAmount) / 1e6,
      expires_at: expiresAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
