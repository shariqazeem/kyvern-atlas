import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  type TransactionSignature,
} from "@solana/web3.js";

// --- Network Configuration ---

export type SolanaNetwork = "mainnet" | "devnet";

interface NetworkConfig {
  rpcUrl: string;
  usdcMint: string;
  explorerBase: string;
  airdropAvailable: boolean;
  chainId: string; // CAIP-2 format (matches what's stored in events.network)
  label: string;
}

const NETWORKS: Record<SolanaNetwork, NetworkConfig> = {
  mainnet: {
    rpcUrl: process.env.SOLANA_MAINNET_RPC || "https://api.mainnet-beta.solana.com",
    // Circle's official USDC on Solana mainnet
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    explorerBase: "https://solscan.io",
    airdropAvailable: false, // mainnet has no airdrop — fund with real SOL
    // Genesis hash for Solana mainnet (CAIP-2 format used by x402)
    chainId: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    label: "Solana Mainnet",
  },
  devnet: {
    rpcUrl: process.env.SOLANA_DEVNET_RPC || "https://api.devnet.solana.com",
    usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    explorerBase: "https://solscan.io",
    airdropAvailable: true,
    chainId: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    label: "Solana Devnet",
  },
};

export function getNetworkConfig(network: SolanaNetwork): NetworkConfig {
  return NETWORKS[network];
}

export const DEFAULT_NETWORK: SolanaNetwork = "mainnet";

// Resolve preferred network from env. If SOLANA_MAINNET_SECRET set, prefer mainnet.
export function resolveDefaultNetwork(): SolanaNetwork {
  if (process.env.SOLANA_MAINNET_SECRET) return "mainnet";
  return "devnet";
}

// --- Connection Helper ---

export function getConnection(network: SolanaNetwork = "devnet"): Connection {
  return new Connection(NETWORKS[network].rpcUrl, "confirmed");
}

// --- Account Creation ---

// Create a fresh Solana keypair. On devnet it can request an airdrop.
// On mainnet you must fund the returned keypair manually with real SOL.
export async function createKeypair(network: SolanaNetwork = "devnet"): Promise<{
  publicKey: string;
  secret: string;
  funded: boolean;
  network: SolanaNetwork;
}> {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  // Encode secret as base64 of the full secret key bytes (64 bytes)
  const secret = Buffer.from(keypair.secretKey).toString("base64");

  const config = NETWORKS[network];
  let funded = false;

  if (config.airdropAvailable) {
    try {
      const conn = getConnection(network);
      const sig = await conn.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL);
      await conn.confirmTransaction(sig, "confirmed");
      funded = true;
    } catch (err) {
      console.warn("Solana airdrop failed:", err);
    }
  }

  return { publicKey, secret, funded, network };
}

// Reconstruct a Keypair from a base64-encoded secret
export function keypairFromSecret(secretBase64: string): Keypair {
  const bytes = Buffer.from(secretBase64, "base64");
  return Keypair.fromSecretKey(new Uint8Array(bytes));
}

// --- Submit Payment (native SOL transfer) ---

export async function submitPayment(
  fromSecretBase64: string,
  toPublicKey: string,
  amountSol: number,
  memo?: string,
  network: SolanaNetwork = "devnet"
): Promise<{
  tx_signature: string;
  from: string;
  to: string;
  amount: string;
  asset: string;
  slot: number;
  fee: string;
  network: SolanaNetwork;
  chain_id: string;
  explorer_url: string;
}> {
  const config = NETWORKS[network];
  const conn = getConnection(network);
  const fromKeypair = keypairFromSecret(fromSecretBase64);
  const toPubkey = new PublicKey(toPublicKey);

  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey,
      lamports,
    })
  );

  // Memo is supported via the memo program but we'll keep this simple
  // and rely on the tx signature itself for x402 reconciliation
  void memo; // reserved for future memo program integration

  const signature: TransactionSignature = await sendAndConfirmTransaction(
    conn,
    tx,
    [fromKeypair],
    { commitment: "confirmed" }
  );

  // Fetch the confirmed tx to get slot + fee
  const txInfo = await conn.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  return {
    tx_signature: signature,
    from: fromKeypair.publicKey.toBase58(),
    to: toPubkey.toBase58(),
    amount: amountSol.toFixed(9),
    asset: "SOL",
    slot: txInfo?.slot || 0,
    fee: ((txInfo?.meta?.fee || 0) / LAMPORTS_PER_SOL).toFixed(9),
    network,
    chain_id: config.chainId,
    explorer_url: getExplorerUrl(signature, network),
  };
}

// --- Get Transaction Details ---

export async function getTransactionDetails(
  signature: string,
  network: SolanaNetwork = "devnet"
): Promise<{
  signature: string;
  slot: number;
  fee: string;
  block_time: number | null;
  successful: boolean;
  network: SolanaNetwork;
  explorer_url: string;
} | null> {
  try {
    const conn = getConnection(network);
    const txInfo = await conn.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!txInfo) return null;

    return {
      signature,
      slot: txInfo.slot,
      fee: ((txInfo.meta?.fee || 0) / LAMPORTS_PER_SOL).toFixed(9),
      block_time: txInfo.blockTime ?? null,
      successful: txInfo.meta?.err === null,
      network,
      explorer_url: getExplorerUrl(signature, network),
    };
  } catch {
    return null;
  }
}

// --- Get Account Balance ---

export async function getAccountBalance(
  publicKey: string,
  network: SolanaNetwork = "devnet"
): Promise<{
  sol: string;
  exists: boolean;
  network: SolanaNetwork;
  explorer_url: string;
}> {
  try {
    const conn = getConnection(network);
    const pubkey = new PublicKey(publicKey);
    const lamports = await conn.getBalance(pubkey);
    return {
      sol: (lamports / LAMPORTS_PER_SOL).toFixed(9),
      exists: lamports > 0,
      network,
      explorer_url: getAccountExplorerUrl(publicKey, network),
    };
  } catch {
    return {
      sol: "0",
      exists: false,
      network,
      explorer_url: getAccountExplorerUrl(publicKey, network),
    };
  }
}

// --- Get Recent Transactions ---

export async function getRecentTransactions(
  publicKey: string,
  limit = 5,
  network: SolanaNetwork = "devnet"
): Promise<
  Array<{
    signature: string;
    slot: number;
    block_time: number | null;
    successful: boolean;
    explorer_url: string;
  }>
> {
  try {
    const conn = getConnection(network);
    const pubkey = new PublicKey(publicKey);
    const signatures = await conn.getSignaturesForAddress(pubkey, { limit });

    return signatures.map((sig) => ({
      signature: sig.signature,
      slot: sig.slot,
      block_time: sig.blockTime ?? null,
      successful: sig.err === null,
      explorer_url: getExplorerUrl(sig.signature, network),
    }));
  } catch {
    return [];
  }
}

// --- Read a Recent Network Transaction (for fallback / demo) ---
// Reads recent activity from a well-known active Solana account so we always
// have a real on-chain tx to capture even when no keypair is configured.
//
// We use the Circle USDC mint account on each network — it's heavily active
// and guaranteed to have recent transactions any time of day.
const ACTIVE_REFERENCE_ADDRESS: Record<SolanaNetwork, string> = {
  // Circle's USDC mint on mainnet — millions of txs per day
  mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  // Devnet USDC mint — frequent test activity
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
};

export async function getLatestNetworkTransaction(
  network: SolanaNetwork = "devnet"
): Promise<{
  signature: string;
  slot: number;
  successful: boolean;
  explorer_url: string;
} | null> {
  try {
    const conn = getConnection(network);
    const reference = new PublicKey(ACTIVE_REFERENCE_ADDRESS[network]);
    const sigs = await conn.getSignaturesForAddress(reference, { limit: 1 });

    if (!sigs || sigs.length === 0) {
      return null;
    }

    const sig = sigs[0];
    return {
      signature: sig.signature,
      slot: sig.slot,
      successful: sig.err === null,
      explorer_url: getExplorerUrl(sig.signature, network),
    };
  } catch {
    return null;
  }
}

// --- Explorer URL Helpers ---

export function getExplorerUrl(signature: string, network: SolanaNetwork = "devnet"): string {
  const config = NETWORKS[network];
  const cluster = network === "devnet" ? "?cluster=devnet" : "";
  return `${config.explorerBase}/tx/${signature}${cluster}`;
}

export function getAccountExplorerUrl(
  publicKey: string,
  network: SolanaNetwork = "devnet"
): string {
  const config = NETWORKS[network];
  const cluster = network === "devnet" ? "?cluster=devnet" : "";
  return `${config.explorerBase}/account/${publicKey}${cluster}`;
}

// --- Network Detection ---

export function networkFromChainId(chainId: string): SolanaNetwork | null {
  if (chainId === NETWORKS.mainnet.chainId) return "mainnet";
  if (chainId === NETWORKS.devnet.chainId) return "devnet";
  return null;
}
