import type { AgentTool } from "../types";

/**
 * read_onchain — read Solana on-chain state via the public devnet RPC.
 *
 * Free (no on-chain cost beyond the RPC call). Returns balances,
 * recent transactions, or token holdings depending on the query type.
 *
 * Uses the public Solana devnet RPC by default. For production traffic,
 * set SOLANA_DEVNET_RPC env var to a Helius endpoint.
 */
export const readOnchainTool: AgentTool = {
  id: "read_onchain",
  name: "Read on-chain data",
  description:
    "Query Solana on-chain state. Use queryType='balance' to get a wallet's SOL balance, or 'recent_signatures' to get its last few transactions.",
  category: "read",
  costsMoney: false,
  schema: {
    type: "object",
    properties: {
      queryType: {
        type: "string",
        description: "What to query.",
        enum: ["balance", "recent_signatures"],
      },
      address: {
        type: "string",
        description: "The Solana address to query (base58).",
      },
      limit: {
        type: "number",
        description:
          "For recent_signatures: how many to return (default 5, max 20).",
      },
    },
    required: ["queryType", "address"],
  },
  execute: async (_ctx, input) => {
    const queryType = String(input.queryType ?? "balance");
    const address = String(input.address ?? "").trim();
    if (!address) return { ok: false, message: "address required" };

    const rpcUrl =
      process.env.SOLANA_DEVNET_RPC ?? "https://api.devnet.solana.com";

    try {
      if (queryType === "balance") {
        const res = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getBalance",
            params: [address],
          }),
        });
        const json = await res.json();
        const lamports = json?.result?.value ?? 0;
        const sol = lamports / 1e9;
        return {
          ok: true,
          message: `${address.slice(0, 8)}... balance: ${sol.toFixed(4)} SOL`,
          data: { lamports, sol },
        };
      }

      if (queryType === "recent_signatures") {
        const limit = Math.min(Number(input.limit ?? 5), 20);
        const res = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getSignaturesForAddress",
            params: [address, { limit }],
          }),
        });
        const json = await res.json();
        const sigs = (json?.result ?? []) as Array<{
          signature: string;
          slot: number;
          err: unknown;
          blockTime: number | null;
        }>;
        return {
          ok: true,
          message: `Found ${sigs.length} recent signatures for ${address.slice(0, 8)}...`,
          data: {
            signatures: sigs.map((s) => ({
              signature: s.signature,
              slot: s.slot,
              ok: s.err === null,
              blockTime: s.blockTime,
            })),
          },
        };
      }

      return { ok: false, message: `unknown queryType: ${queryType}` };
    } catch (e) {
      return {
        ok: false,
        message: `RPC error: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  },
};
