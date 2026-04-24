/**
 * Ability Registry — the 3 first-party abilities shipped at launch.
 *
 * All abilities are real. All produce on-chain artifacts.
 * No "coming soon" stubs in the main store.
 */

import type { AbilityDef } from "./types";

export const ABILITIES: AbilityDef[] = [
  {
    id: "paywall-url",
    name: "Paywall Any URL",
    emoji: "💰",
    shortDescription: "Monetize any API. Earn USDC per request.",
    fullDescription:
      "Paste any API URL. Kyvern creates an x402 proxy — every request pays USDC directly to your vault. No code changes to your API. Atlas (Device #0000) automatically sends a welcome payment within 30 seconds so you see your first earning immediately.",
    category: "earn",
    publisher: "Kyvern Labs",
    configSchema: [
      {
        key: "targetUrl",
        label: "Your API URL",
        type: "text",
        default: "",
        hint: "https://myapi.com/data",
      },
      {
        key: "priceUsd",
        label: "Price per request (USDC)",
        type: "slider",
        default: 0.001,
        min: 0.001,
        max: 1.0,
        step: 0.001,
      },
    ],
    onChainProof:
      "x402 payment signatures from Atlas → your vault. Balance increase verifiable on Solana Explorer.",
  },
  {
    id: "drain-bounty",
    name: "Public Drain Bounty",
    emoji: "🛡️",
    shortDescription: "Challenge the world to drain your device.",
    fullDescription:
      "Enable the bounty and your device's policy is published publicly. Anyone can attempt to drain it — every attack is a real Solana transaction that the Kyvern policy program rejects with an AnchorError. A welcome attack fires within 5 seconds of enabling so you see proof immediately. The counter tracks every failed attempt live.",
    category: "protect",
    publisher: "Kyvern Labs",
    configSchema: [
      {
        key: "public",
        label: "Make bounty public",
        type: "toggle",
        default: true,
        hint: "When enabled, your device key is visible and attackable",
      },
    ],
    onChainProof:
      "Failed transaction signatures with AnchorError visible on Solana Explorer. Real reverting on-chain txs.",
  },
  {
    id: "atlas-intelligence",
    name: "Atlas Intelligence",
    emoji: "🧠",
    shortDescription: "Subscribe to Atlas's live data feed.",
    fullDescription:
      "Your device pays Atlas $0.001 per update to receive its live decision feed — what it bought, what it published, what it blocked. Every payment is a real vault.pay() through the policy engine, producing a real Solana transaction. Proves the spending side of the economy works alongside Paywall's earning side.",
    category: "earn",
    publisher: "Kyvern Labs",
    configSchema: [
      {
        key: "autoRefresh",
        label: "Auto-refresh every 5 minutes",
        type: "toggle",
        default: true,
      },
    ],
    onChainProof:
      "Payment signatures from your vault → Atlas. Verifiable on Solana Explorer.",
  },
];

export function getAbility(id: string): AbilityDef | undefined {
  return ABILITIES.find((a) => a.id === id);
}
