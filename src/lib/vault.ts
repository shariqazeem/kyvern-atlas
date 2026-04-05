import { createPublicClient, http, formatUnits } from "viem";
import { base } from "viem/chains";
import { nanoid } from "nanoid";
import { getDb } from "./db";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

const ERC20_ABI = [{
  name: "balanceOf",
  type: "function" as const,
  inputs: [{ name: "account", type: "address" }],
  outputs: [{ name: "", type: "uint256" }],
  stateMutability: "view" as const,
}] as const;

function getClient() {
  return createPublicClient({ chain: base, transport: http() });
}

interface WalletRow {
  id: string;
  address: string;
  network: string;
}

interface SyncResult {
  wallet_id: string;
  address: string;
  balance_eth: number;
  balance_usdc: number;
  error?: string;
}

export async function syncWalletBalances(apiKeyId: string): Promise<{
  synced: number;
  results: SyncResult[];
  errors: string[];
}> {
  const db = getDb();
  const client = getClient();

  const wallets = db.prepare(
    "SELECT id, address, network FROM wallets WHERE api_key_id = ? AND is_monitored = 1"
  ).all(apiKeyId) as WalletRow[];

  const results: SyncResult[] = [];
  const errors: string[] = [];
  let synced = 0;

  for (const wallet of wallets) {
    try {
      const addr = wallet.address as `0x${string}`;

      // Fetch ETH balance
      const ethRaw = await client.getBalance({ address: addr });
      const balanceEth = parseFloat(formatUnits(ethRaw, 18));

      // Fetch USDC balance
      let balanceUsdc = 0;
      try {
        const usdcRaw = await client.readContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [addr],
        });
        balanceUsdc = parseFloat(formatUnits(usdcRaw, 6));
      } catch {
        // USDC call failed — wallet might not have USDC interactions
      }

      // Store snapshot
      db.prepare(
        "INSERT INTO wallet_snapshots (id, wallet_id, balance_eth, balance_usdc) VALUES (?, ?, ?, ?)"
      ).run(nanoid(), wallet.id, Math.round(balanceEth * 10000) / 10000, Math.round(balanceUsdc * 100) / 100);

      results.push({ wallet_id: wallet.id, address: wallet.address, balance_eth: Math.round(balanceEth * 10000) / 10000, balance_usdc: Math.round(balanceUsdc * 100) / 100 });
      synced++;
    } catch (err) {
      const msg = `${wallet.address}: ${String(err)}`;
      errors.push(msg);
      results.push({ wallet_id: wallet.id, address: wallet.address, balance_eth: 0, balance_usdc: 0, error: msg });
    }
  }

  return { synced, results, errors };
}

export async function fetchSingleBalance(address: string): Promise<{ balance_eth: number; balance_usdc: number }> {
  const client = getClient();
  const addr = address as `0x${string}`;

  const ethRaw = await client.getBalance({ address: addr });
  const balanceEth = parseFloat(formatUnits(ethRaw, 18));

  let balanceUsdc = 0;
  try {
    const usdcRaw = await client.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [addr],
    });
    balanceUsdc = parseFloat(formatUnits(usdcRaw, 6));
  } catch {
    // ok
  }

  return {
    balance_eth: Math.round(balanceEth * 10000) / 10000,
    balance_usdc: Math.round(balanceUsdc * 100) / 100,
  };
}
