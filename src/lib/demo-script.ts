/* ════════════════════════════════════════════════════════════════════
   demo-script.ts — the Parallax scenario
   ────────────────────────────────────────────────────────────────────
   This is the "live" experience we ship on /demo. It is a scripted
   sequence, but every `call` step fires a REAL payment through the
   policy engine + Squads v4 adapter on devnet.

   Why scripted? A demo that depends on an LLM's mood is a demo that
   hangs mid-pitch. Judges don't wait. The script guarantees the same
   story every time: the agent works, the agent gets walled, the agent
   recovers. The *transactions* are real; the narrative is deterministic.

   Phases
   ──────
   narrative  — top-banner message; tells the audience what's happening
   think      — the agent's inner monologue (e.g. "I need to fetch…")
   call       — actual pay attempt; hits the policy engine + Squads
   pause      — deliberate silence so the UI can breathe
   summary    — closing callouts (counts, "$X saved")
   ════════════════════════════════════════════════════════════════════ */

export type DemoPhase =
  | "narrative"
  | "think"
  | "call"
  | "pause"
  | "summary";

export interface DemoStep {
  phase: DemoPhase;
  delayMs: number; // ms to wait BEFORE this step emits
  // narrative / think / summary
  message?: string;
  // call
  merchant?: string;
  amountUsd?: number;
  memo?: string | null;
  recipientPubkey?: string;
  // the expected outcome — lets the UI pre-render intent
  // ("this one is about to be blocked"). The *actual* outcome is still
  // decided by the live policy engine; we surface both.
  expected?: "allow" | "block";
}

export interface DemoScript {
  id: string;
  agent: {
    name: string;
    tagline: string;
  };
  // The "horror-story" counterfactual shown before the agent runs.
  // This is what happens WITHOUT the vault.
  counterfactual: {
    headline: string;
    body: string;
    drainedUsd: number;
    drainedSeconds: number;
  };
  steps: DemoStep[];
}

/* ─── The one canonical scenario ─── */

// A devnet throwaway address — we'll send real USDC here so the
// signature resolves on Solana Explorer. It is NOT a real merchant.
const DEVNET_SINK_ADDRESS = "8ZVR3mF6v9ZK3Y9DqxLTmZxSJMa4j8TFhB8zNGJCuYMH";

export const PARALLAX_SCRIPT: DemoScript = {
  id: "parallax-research-v1",
  agent: {
    name: "Parallax",
    tagline: "AI research agent · runs on OpenAI, Anthropic, Perplexity, weather + forecast APIs",
  },
  counterfactual: {
    headline: "Without a vault, here's what a compromised agent key looks like.",
    body:
      "One leaked private key. One malicious model turn. Three minutes. Agent drains the wallet before anyone notices. This has already happened — to teams you know.",
    drainedUsd: 12_400,
    drainedSeconds: 184,
  },
  steps: [
    {
      phase: "narrative",
      delayMs: 300,
      message:
        "Meet Parallax. AI research agent. Needs to pay for API calls. Bound to a KyvernVault with daily caps, per-tx caps, and a merchant allowlist.",
    },
    {
      phase: "pause",
      delayMs: 1_400,
    },
    {
      phase: "think",
      delayMs: 200,
      message:
        "Task: summarize the last 24h of ETH/SOL order flow. Step 1 — fetch raw volume from api.coinbase.com.",
    },
    {
      phase: "call",
      delayMs: 900,
      merchant: "https://api.coinbase.com/v2/exchange-rates",
      amountUsd: 0.08,
      memo: "volume pull — eth/sol 24h",
      recipientPubkey: DEVNET_SINK_ADDRESS,
      expected: "allow",
    },
    {
      phase: "think",
      delayMs: 1_400,
      message:
        "Volume looks thin. Cross-reference against api.coinmarketcap.com for a second signal.",
    },
    {
      phase: "call",
      delayMs: 700,
      merchant: "https://api.coinmarketcap.com/v1/quotes/latest",
      amountUsd: 0.12,
      memo: "cross-check price feed",
      recipientPubkey: DEVNET_SINK_ADDRESS,
      expected: "allow",
    },
    {
      phase: "think",
      delayMs: 1_200,
      message:
        "Good signal. Next — run the summary through an LLM. api.openai.com, 4k tokens, small model.",
    },
    {
      phase: "call",
      delayMs: 700,
      merchant: "https://api.openai.com/v1/chat/completions",
      amountUsd: 0.18,
      memo: "summarize order flow",
      recipientPubkey: DEVNET_SINK_ADDRESS,
      expected: "allow",
    },
    {
      phase: "narrative",
      delayMs: 1_600,
      message:
        "Three clean calls. Budget holding. Now watch what happens when the agent gets instructed to overspend.",
    },
    {
      phase: "think",
      delayMs: 900,
      message:
        "New tool available: premium.research-feed.xyz offers a 'deep-research' endpoint for $2.40. Let me try it.",
    },
    {
      phase: "call",
      delayMs: 700,
      merchant: "https://premium.research-feed.xyz/deep-research",
      amountUsd: 2.4,
      memo: "deep-research run",
      recipientPubkey: DEVNET_SINK_ADDRESS,
      expected: "block",
    },
    {
      phase: "narrative",
      delayMs: 1_300,
      message:
        "The vault just saved you. Two policies blocked this — merchant not on the allowlist, and $2.40 blows the per-tx cap. On-chain. No server could have been bribed to let it through.",
    },
    {
      phase: "think",
      delayMs: 1_200,
      message:
        "Fair. Back to approved merchants. Query api.anthropic.com instead for the same summary — smaller, cheaper.",
    },
    {
      phase: "call",
      delayMs: 700,
      merchant: "https://api.anthropic.com/v1/messages",
      amountUsd: 0.22,
      memo: "summary v2 — claude haiku",
      recipientPubkey: DEVNET_SINK_ADDRESS,
      expected: "allow",
    },
    {
      phase: "think",
      delayMs: 1_100,
      message:
        "Last step — enrich with weather signal. api.weather.gov, small call.",
    },
    {
      phase: "call",
      delayMs: 700,
      merchant: "https://api.weather.gov/points",
      amountUsd: 0.05,
      memo: "regional weather enrich",
      recipientPubkey: DEVNET_SINK_ADDRESS,
      expected: "allow",
    },
    {
      phase: "summary",
      delayMs: 1_400,
      message:
        "Task complete. Five settled, one blocked. Every settled call is a real Solana transaction you can click. Total spend: within budget. Blast radius if the key leaks: still capped by the vault.",
    },
  ],
};

/* The allowlist baked into the demo vault — mirrors the script so the
 * "allow" calls pass and the counterfactual "block" call fails.
 */
export const PARALLAX_DEMO_ALLOWLIST = [
  "api.coinbase.com",
  "api.coinmarketcap.com",
  "api.openai.com",
  "api.anthropic.com",
  "api.weather.gov",
];

export const PARALLAX_DEMO_CAPS = {
  dailyLimitUsd: 5.0,
  weeklyLimitUsd: 25.0,
  perTxMaxUsd: 0.5, // hard cap — $2.40 deep-research call blows this
  maxCallsPerWindow: 20,
  velocityWindow: "1h" as const,
  requireMemo: true,
};
