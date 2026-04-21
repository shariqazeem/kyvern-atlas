/* ════════════════════════════════════════════════════════════════════
   VaultConfig — shared type for the /vault/new onboarding flow.
   ════════════════════════════════════════════════════════════════════ */

export type AgentPurpose =
  | "research"
  | "trading"
  | "devtools"
  | "data"
  | "content"
  | "other";

export type VelocityWindow = "1h" | "1d" | "1w";

export interface VaultConfig {
  // Step 1 — Identity
  name: string;
  purpose: AgentPurpose;
  emoji: string;

  // Step 2 — Budgets (USD, USDC denominated)
  dailyLimit: number;
  weeklyLimit: number;
  perTxMax: number;

  // Step 3 — Policies
  allowedMerchants: string[];
  maxCallsPerWindow: number;
  velocityWindow: VelocityWindow;
  requireMemo: boolean;

  // Step 4 — Deploy
  network: "mainnet" | "devnet";
}

export const DEFAULT_CONFIG: VaultConfig = {
  name: "",
  purpose: "research",
  emoji: "🧭",
  dailyLimit: 50,
  weeklyLimit: 250,
  perTxMax: 5,
  allowedMerchants: [],
  maxCallsPerWindow: 60,
  velocityWindow: "1h",
  requireMemo: true,
  network: "devnet",
};

/**
 * ATLAS_TEMPLATE — the "Clone Atlas" one-click config.
 *
 * Pre-fills the wizard with Atlas's exact policy template so the user
 * can deploy a clone of our reference autonomous agent in 60 seconds.
 * Same budget shape, same merchant allowlist, same velocity limits.
 *
 * The user still owns the new deployment — their own Squads multisig,
 * their own agent keypair — it's only the POLICY that's copied.
 *
 * This is the unlock: when a judge (or real user) sees Atlas running
 * and thinks "I want one," this turns that intent into a 3-second
 * deploy. One flow. One outcome. One wallet to fund.
 */
export const ATLAS_TEMPLATE: VaultConfig = {
  name: "My Forecaster",
  purpose: "research",
  emoji: "🧭",
  dailyLimit: 20,
  weeklyLimit: 100,
  perTxMax: 0.5,
  allowedMerchants: [
    "api.openai.com",
    "api.anthropic.com",
    "api.perplexity.ai",
    "api.brave.com",
    "api.arweave.net",
  ],
  maxCallsPerWindow: 60,
  velocityWindow: "1h",
  requireMemo: false,
  network: "devnet",
};

export const PURPOSE_PRESETS: Record<
  AgentPurpose,
  { label: string; emoji: string; description: string }
> = {
  research: {
    label: "Research",
    emoji: "🧭",
    description:
      "Agents buying data, papers, API calls. Many small reads.",
  },
  trading: {
    label: "Trading",
    emoji: "📈",
    description:
      "Agents executing market data purchases and orderflow feeds.",
  },
  devtools: {
    label: "Dev Tools",
    emoji: "⚙️",
    description:
      "Agents using CI, compute, inference, or code-search services.",
  },
  data: {
    label: "Data Pipelines",
    emoji: "🔗",
    description:
      "Agents enriching records, geocoding, or checking identity APIs.",
  },
  content: {
    label: "Content",
    emoji: "✍️",
    description:
      "Agents generating images, translations, or audio via paid models.",
  },
  other: {
    label: "Custom",
    emoji: "✨",
    description: "Something else. Set your own budget and policies.",
  },
};
