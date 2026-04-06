import * as StellarSdk from "@stellar/stellar-sdk";

const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";
const FRIENDBOT_URL = "https://friendbot.stellar.org";

// Create a new Stellar testnet keypair and fund it via Friendbot
export async function createTestnetKeypair(): Promise<{
  publicKey: string;
  secret: string;
}> {
  const pair = StellarSdk.Keypair.random();
  const publicKey = pair.publicKey();
  const secret = pair.secret();

  // Fund via Friendbot (gives 10,000 testnet XLM)
  try {
    await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
  } catch {
    console.warn("Friendbot funding failed — account may already exist");
  }

  return { publicKey, secret };
}

// Submit a real payment on Stellar testnet
export async function submitPayment(
  fromSecret: string,
  toPublic: string,
  amount: string,
  asset: "native" | "USDC" = "native",
  memo?: string
): Promise<{
  tx_hash: string;
  from: string;
  to: string;
  amount: string;
  asset: string;
  ledger: number;
  fee: string;
}> {
  const server = new StellarSdk.Horizon.Server(HORIZON_TESTNET);
  const sourceKeypair = StellarSdk.Keypair.fromSecret(fromSecret);
  const sourcePublic = sourceKeypair.publicKey();

  // Load the source account
  const account = await server.loadAccount(sourcePublic);

  // Build the transaction
  let txBuilder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  });

  // Determine the asset
  let paymentAsset: StellarSdk.Asset;
  if (asset === "USDC") {
    // Stellar testnet USDC issuer
    paymentAsset = new StellarSdk.Asset(
      "USDC",
      "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
    );
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
  return {
    tx_hash: String(resultAny.hash || ""),
    from: sourcePublic,
    to: toPublic,
    amount,
    asset: asset === "native" ? "XLM" : "USDC",
    ledger: Number(resultAny.ledger || 0),
    fee: (Number(resultAny.fee_charged || 0) / 10000000).toFixed(7),
  };
}

// Get transaction details from Horizon (for verification)
export async function getTransactionDetails(txHash: string): Promise<{
  hash: string;
  source_account: string;
  fee_charged: string;
  created_at: string;
  ledger: number;
  operation_count: number;
  memo?: string;
  successful: boolean;
} | null> {
  try {
    const res = await fetch(`${HORIZON_TESTNET}/transactions/${txHash}`);
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
    };
  } catch {
    return null;
  }
}

// Get account balance (XLM + any issued assets)
export async function getAccountBalance(publicKey: string): Promise<{
  xlm: string;
  usdc: string;
  exists: boolean;
}> {
  try {
    const server = new StellarSdk.Horizon.Server(HORIZON_TESTNET);
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

    return { xlm, usdc, exists: true };
  } catch {
    return { xlm: "0", usdc: "0", exists: false };
  }
}

// Fetch recent real transactions for an account from Horizon
export async function getRecentTransactions(publicKey: string, limit = 5): Promise<
  Array<{
    hash: string;
    source_account: string;
    created_at: string;
    fee_charged: string;
    memo?: string;
    successful: boolean;
  }>
> {
  try {
    const res = await fetch(
      `${HORIZON_TESTNET}/accounts/${publicKey}/transactions?limit=${limit}&order=desc`
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
    }));
  } catch {
    return [];
  }
}
