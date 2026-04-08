import * as StellarSdk from "@stellar/stellar-sdk";

// --- Network Configuration ---

export type StellarNetwork = "mainnet" | "testnet";

interface NetworkConfig {
  horizonUrl: string;
  networkPassphrase: string;
  usdcIssuer: string;
  explorerBase: string;
  friendbotUrl: string | null; // testnet only
  chainId: string; // canonical chain id used in events.network
  label: string;
}

const NETWORKS: Record<StellarNetwork, NetworkConfig> = {
  mainnet: {
    horizonUrl: "https://horizon.stellar.org",
    networkPassphrase: StellarSdk.Networks.PUBLIC,
    // Circle's official USDC issuer on Stellar mainnet
    usdcIssuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    explorerBase: "https://stellar.expert/explorer/public",
    friendbotUrl: null, // mainnet has no friendbot — accounts must be funded with real XLM
    chainId: "stellar:pubnet",
    label: "Stellar Mainnet",
  },
  testnet: {
    horizonUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: StellarSdk.Networks.TESTNET,
    // Same issuer used for Hacks demos on testnet
    usdcIssuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    explorerBase: "https://stellar.expert/explorer/testnet",
    friendbotUrl: "https://friendbot.stellar.org",
    chainId: "stellar:testnet",
    label: "Stellar Testnet",
  },
};

export function getNetworkConfig(network: StellarNetwork): NetworkConfig {
  return NETWORKS[network];
}

// Default network — mainnet for production usage, override per-call as needed
export const DEFAULT_NETWORK: StellarNetwork = "mainnet";

// --- Account Creation ---

// Create a new Stellar keypair. On testnet it auto-funds via Friendbot.
// On mainnet you must fund the returned keypair manually with real XLM.
export async function createKeypair(network: StellarNetwork = "testnet"): Promise<{
  publicKey: string;
  secret: string;
  funded: boolean;
  network: StellarNetwork;
}> {
  const pair = StellarSdk.Keypair.random();
  const publicKey = pair.publicKey();
  const secret = pair.secret();
  const config = NETWORKS[network];

  let funded = false;
  if (config.friendbotUrl) {
    try {
      const res = await fetch(`${config.friendbotUrl}?addr=${publicKey}`);
      funded = res.ok;
    } catch {
      console.warn("Friendbot funding failed — account may already exist");
    }
  }

  return { publicKey, secret, funded, network };
}

// Backward-compat alias used by existing routes
export async function createTestnetKeypair(): Promise<{
  publicKey: string;
  secret: string;
}> {
  const result = await createKeypair("testnet");
  return { publicKey: result.publicKey, secret: result.secret };
}

// --- Submit Payment ---

export async function submitPayment(
  fromSecret: string,
  toPublic: string,
  amount: string,
  asset: "native" | "USDC" = "native",
  memo?: string,
  network: StellarNetwork = "testnet"
): Promise<{
  tx_hash: string;
  from: string;
  to: string;
  amount: string;
  asset: string;
  ledger: number;
  fee: string;
  network: StellarNetwork;
  chain_id: string;
  explorer_url: string;
}> {
  const config = NETWORKS[network];
  const server = new StellarSdk.Horizon.Server(config.horizonUrl);
  const sourceKeypair = StellarSdk.Keypair.fromSecret(fromSecret);
  const sourcePublic = sourceKeypair.publicKey();

  // Load the source account
  const account = await server.loadAccount(sourcePublic);

  // Build the transaction
  let txBuilder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  });

  // Determine the asset
  let paymentAsset: StellarSdk.Asset;
  if (asset === "USDC") {
    paymentAsset = new StellarSdk.Asset("USDC", config.usdcIssuer);
  } else {
    paymentAsset = StellarSdk.Asset.native();
  }

  txBuilder = txBuilder.addOperation(
    StellarSdk.Operation.payment({
      destination: toPublic,
      asset: paymentAsset,
      amount: amount,
    })
  );

  // Add memo for x402 reconciliation
  if (memo) {
    txBuilder = txBuilder.addMemo(StellarSdk.Memo.text(memo.slice(0, 28)));
  }

  txBuilder = txBuilder.setTimeout(30);
  const tx = txBuilder.build();

  // Sign and submit
  tx.sign(sourceKeypair);
  const result = await server.submitTransaction(tx);

  const resultAny = result as unknown as Record<string, unknown>;
  const txHash = String(resultAny.hash || "");
  return {
    tx_hash: txHash,
    from: sourcePublic,
    to: toPublic,
    amount,
    asset: asset === "native" ? "XLM" : "USDC",
    ledger: Number(resultAny.ledger || 0),
    fee: (Number(resultAny.fee_charged || 0) / 10000000).toFixed(7),
    network,
    chain_id: config.chainId,
    explorer_url: getExplorerUrl(txHash, network),
  };
}

// --- Get Transaction Details ---

export async function getTransactionDetails(
  txHash: string,
  network: StellarNetwork = "testnet"
): Promise<{
  hash: string;
  source_account: string;
  fee_charged: string;
  created_at: string;
  ledger: number;
  operation_count: number;
  memo?: string;
  successful: boolean;
  network: StellarNetwork;
  explorer_url: string;
} | null> {
  const config = NETWORKS[network];
  try {
    const res = await fetch(`${config.horizonUrl}/transactions/${txHash}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      hash: data.hash,
      source_account: data.source_account,
      fee_charged: data.fee_charged,
      created_at: data.created_at,
      ledger: data.ledger,
      operation_count: data.operation_count,
      memo: data.memo,
      successful: data.successful,
      network,
      explorer_url: getExplorerUrl(data.hash, network),
    };
  } catch {
    return null;
  }
}

// --- Get Account Balance ---

export async function getAccountBalance(
  publicKey: string,
  network: StellarNetwork = "testnet"
): Promise<{
  xlm: string;
  usdc: string;
  exists: boolean;
  network: StellarNetwork;
  explorer_url: string;
}> {
  const config = NETWORKS[network];
  try {
    const server = new StellarSdk.Horizon.Server(config.horizonUrl);
    const account = await server.loadAccount(publicKey);

    let xlm = "0";
    let usdc = "0";

    for (const balance of account.balances) {
      if (balance.asset_type === "native") {
        xlm = balance.balance;
      } else if (
        "asset_code" in balance &&
        balance.asset_code === "USDC"
      ) {
        usdc = balance.balance;
      }
    }

    return {
      xlm,
      usdc,
      exists: true,
      network,
      explorer_url: getAccountExplorerUrl(publicKey, network),
    };
  } catch {
    return {
      xlm: "0",
      usdc: "0",
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
  network: StellarNetwork = "testnet"
): Promise<
  Array<{
    hash: string;
    source_account: string;
    created_at: string;
    fee_charged: string;
    memo?: string;
    successful: boolean;
    explorer_url: string;
  }>
> {
  const config = NETWORKS[network];
  try {
    const res = await fetch(
      `${config.horizonUrl}/accounts/${publicKey}/transactions?limit=${limit}&order=desc`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data._embedded?.records || []).map((tx: Record<string, unknown>) => ({
      hash: tx.hash as string,
      source_account: tx.source_account as string,
      created_at: tx.created_at as string,
      fee_charged: tx.fee_charged as string,
      memo: tx.memo as string | undefined,
      successful: tx.successful as boolean,
      explorer_url: getExplorerUrl(tx.hash as string, network),
    }));
  } catch {
    return [];
  }
}

// --- Explorer URL Helpers ---

export function getExplorerUrl(txHash: string, network: StellarNetwork = "testnet"): string {
  const config = NETWORKS[network];
  return `${config.explorerBase}/tx/${txHash}`;
}

export function getAccountExplorerUrl(publicKey: string, network: StellarNetwork = "testnet"): string {
  const config = NETWORKS[network];
  return `${config.explorerBase}/account/${publicKey}`;
}

// --- Network Detection from Chain ID ---

export function networkFromChainId(chainId: string): StellarNetwork | null {
  if (chainId === "stellar:pubnet" || chainId === "stellar:mainnet") return "mainnet";
  if (chainId === "stellar:testnet") return "testnet";
  return null;
}

// --- Resolve preferred network from env ---
// If STELLAR_MAINNET_SECRET is set, prefer mainnet. Otherwise fall back to testnet.
export function resolveDefaultNetwork(): StellarNetwork {
  if (process.env.STELLAR_MAINNET_SECRET && process.env.STELLAR_MAINNET_PUBLIC) {
    return "mainnet";
  }
  return "testnet";
}
