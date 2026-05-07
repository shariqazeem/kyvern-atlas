/**
 * /roadmap — Genesis device public roadmap.
 *
 * Three columns: Shipping at Frontier · Next · Far.
 * Linked from the GENESIS DEVICE strip on /app.
 *
 * Static page. No data, no client logic.
 */

import Link from "next/link";
import { ArrowLeft, Check, Circle, Zap } from "lucide-react";

export const metadata = {
  title: "Kyvern · Roadmap",
  description:
    "Genesis device · v0.1. What ships at Frontier, what's next, what's far.",
};

export default function RoadmapPage() {
  return (
    <main
      className="min-h-screen px-5 py-10 pb-24"
      style={{
        background:
          "linear-gradient(180deg, #FFFFFF 0%, #F8F8FA 100%)",
      }}
    >
      <div className="max-w-3xl mx-auto">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 mb-8 font-mono uppercase tracking-[0.16em] hover:opacity-70 transition"
          style={{ fontSize: 10, color: "rgba(15,23,42,0.55)" }}
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={2} />
          Back to device
        </Link>

        <header className="mb-10">
          <p
            className="font-mono uppercase tracking-[0.20em] mb-2"
            style={{ fontSize: 10, color: "rgba(15,23,42,0.45)" }}
          >
            Genesis device · v0.1
          </p>
          <h1
            className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.015em] mb-3"
            style={{ color: "#0A0A0A" }}
          >
            What we ship next.
          </h1>
          <p
            className="text-[14px] leading-[1.6] max-w-[60ch]"
            style={{ color: "#6B7280" }}
          >
            Kyvern is the device where AI workers do real jobs and the
            chain enforces every spend. This page is the public commitment
            for what comes after Frontier — and what&apos;s already live.
          </p>
        </header>

        <Section
          eyebrow="Shipping at Frontier"
          icon={<Check className="w-3 h-3" strokeWidth={2.6} />}
          tone="green"
          items={[
            {
              title: "Sentinel · Bounty Scout",
              body: "Finds paid Solana bounties matching your skills, drafts the application via Pay.sh / Gemini, queues for one-tap submit.",
            },
            {
              title: "Wren · Position Watchtower",
              body: "Watches your wallet watchlist; pings on material moves with a Pay.sh / Gemini materiality check.",
            },
            {
              title: "Pulse · Conditional Trigger",
              body: "Set a price condition; on breach, the conditional spend fires through the policy program with a Pay.sh validation in parallel.",
            },
            {
              title: "Pay.sh / Gemini integration",
              body: "Solana × Google Cloud's agent commerce rail. Atlas rotates Pay.sh actions every cycle; Pulse + Sentinel + Wren route validation through Pay.sh / Gemini-flash.",
            },
            {
              title: "Squads-cosigned device",
              body: "Every worker runs inside a Squads v4 multisig. Owner key + agent key co-sign every spend; revoke any time.",
            },
            {
              title: "Kyvern Anchor program",
              body: "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc on Solana devnet. 4 instructions, 12 error codes, on-chain enforcement of per-tx + daily + weekly + merchant + memo + pause.",
            },
          ]}
        />

        <Section
          eyebrow="Next"
          icon={<Zap className="w-3 h-3" strokeWidth={2.6} />}
          tone="amber"
          items={[
            {
              title: "More bays",
              body: "Higher-tier devices unlock more worker slots. Ten then twenty.",
            },
            {
              title: "More worker presets",
              body: "Curated templates for Solana DeFi, NFT, infra, governance — install in one click.",
            },
            {
              title: "Jupiter swap integration",
              body: "Trigger-fired conditional spends route through Jupiter for best-execution swaps.",
            },
            {
              title: "Drift trading",
              body: "Conditional spend → place a perp position with size + leverage caps the chain enforces.",
            },
            {
              title: "Marinade staking",
              body: "Earn-mode triggers stake idle vault USDC to mSOL with auto-unstake on threshold.",
            },
            {
              title: "MagicEden listings",
              body: "Sentinel monitors NFT collection floor; conditional spend fires a buy or list.",
            },
          ]}
        />

        <Section
          eyebrow="Far"
          icon={<Circle className="w-3 h-3" strokeWidth={2} />}
          tone="gray"
          items={[
            {
              title: "Mainnet",
              body: "Devnet → mainnet. Same Anchor program, same SDK, same chain enforcement.",
            },
            {
              title: "Cross-device leaderboards",
              body: "Compare your device's discoveries, alerts, conditional spends across the network. Privacy-preserving.",
            },
            {
              title: "Agent reputation",
              body: "Workers earn trust over cycles. High-reputation Sentinels surface higher-quality drafts to other devices.",
            },
            {
              title: "Stake payouts",
              body: "Today every stake is one-way. Next: prediction-market resolution so accurate Pulse triggers earn back.",
            },
            {
              title: "Real reader-payments",
              body: "Atlas's paid feed actually charges external buyers via x402. The simulated-earnings gap closes.",
            },
          ]}
        />

        <footer
          className="mt-16 pt-6 text-center"
          style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}
        >
          <p
            className="font-mono uppercase tracking-[0.18em] mb-1"
            style={{ fontSize: 10, color: "rgba(15,23,42,0.45)" }}
          >
            v0.1 · genesis device
          </p>
          <p
            className="text-[12.5px]"
            style={{ color: "rgba(15,23,42,0.55)" }}
          >
            This is the start, not the end.
          </p>
        </footer>
      </div>
    </main>
  );
}

function Section({
  eyebrow,
  icon,
  tone,
  items,
}: {
  eyebrow: string;
  icon: React.ReactNode;
  tone: "green" | "amber" | "gray";
  items: Array<{ title: string; body: string }>;
}) {
  const accent =
    tone === "green"
      ? { bg: "rgba(34,197,94,0.10)", fg: "#15803D", border: "rgba(34,197,94,0.30)" }
      : tone === "amber"
        ? { bg: "rgba(245,158,11,0.10)", fg: "#B45309", border: "rgba(245,158,11,0.30)" }
        : { bg: "rgba(15,23,42,0.04)", fg: "rgba(15,23,42,0.55)", border: "rgba(15,23,42,0.10)" };
  return (
    <section className="mb-10">
      <div className="flex items-center gap-1.5 mb-4">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
          style={{
            background: accent.bg,
            border: `1px solid ${accent.border}`,
            color: accent.fg,
          }}
        >
          {icon}
          <span
            className="font-mono uppercase tracking-[0.16em]"
            style={{ fontSize: 9.5, fontWeight: 600 }}
          >
            {eyebrow}
          </span>
        </span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((it, i) => (
          <li
            key={i}
            className="rounded-[12px] p-4"
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(15,23,42,0.06)",
              boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
            }}
          >
            <h3
              className="text-[14px] font-semibold tracking-[-0.005em] mb-1"
              style={{ color: "#0A0A0A" }}
            >
              {it.title}
            </h3>
            <p
              className="text-[12.5px] leading-[1.55]"
              style={{ color: "#6B7280" }}
            >
              {it.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
