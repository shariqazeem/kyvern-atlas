"use client";

/**
 * ActionFeed — live chronological log of every economic event on the
 * device (Phase 5 headline below EarningsHero).
 *
 * Renders the live-status `actionFeed` array. Each row is a one-liner:
 *
 *   🎯 Sentinel posted research task — $0.15 escrowed ✓ ↗
 *   🐋 Wren claimed research task                    · 12s ago
 *   🐋 Wren completed task — earned $0.15 ✓ ↗        · 22s ago
 *   📈 Pulse staked $0.02 on SOL band ✓ ↗            · 45s ago
 *   ✗ Pulse stake blocked — exceeds cap              · 1m ago
 *
 * Color rules:
 *   · signature_status=success → green check + Explorer link
 *   · signature_status=failed  → red x + reason text
 *   · null status (e.g. claim with no signature) → neutral
 *
 * The component does not poll on its own — the parent page polls
 * /api/devices/[id]/live-status every 5s and passes the feed in.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Activity, Check, X, ExternalLink, Link2 } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export interface ActionFeedItem {
  id: string;
  timestamp: number;
  tool: string;
  worker: { id: string; name: string; emoji: string };
  amountUsd: number | null;
  signature: string | null;
  signatureStatus: "success" | "failed" | null;
  counterparty: string | null;
  message: string | null;
}

interface ActionFeedProps {
  items: ActionFeedItem[];
  network: "devnet" | "mainnet";
}

function fmtAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function explorerUrl(sig: string, network: "devnet" | "mainnet"): string {
  const cluster = network === "mainnet" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/tx/${sig}${cluster}`;
}

/** Render a tool action as a one-line verb + amount summary. */
function actionText(item: ActionFeedItem): {
  verb: string;
  highlight?: { text: string; tone: "green" | "red" | "amber" };
} {
  const amount = item.amountUsd ?? 0;
  const failed = item.signatureStatus === "failed";

  switch (item.tool) {
    case "post_task":
      if (failed) {
        return {
          verb: "tried to post task — escrow blocked",
          highlight: { text: `$${amount.toFixed(3)}`, tone: "red" },
        };
      }
      return {
        verb: "posted research task — escrowed",
        highlight: { text: `$${amount.toFixed(3)}`, tone: "amber" },
      };
    case "claim_task":
      return { verb: "claimed a task" };
    case "complete_task":
      if (failed) {
        return {
          verb: "tried to complete task — payout blocked",
          highlight: { text: `$${amount.toFixed(3)}`, tone: "red" },
        };
      }
      return {
        verb: `completed task — earned`,
        highlight: { text: `+$${amount.toFixed(3)}`, tone: "green" },
      };
    case "stake_on_finding":
      if (failed) {
        return {
          verb: "tried to stake — blocked",
          highlight: { text: `$${amount.toFixed(3)}`, tone: "red" },
        };
      }
      return {
        verb: "staked on finding",
        highlight: { text: `$${amount.toFixed(3)}`, tone: "amber" },
      };
    case "subscribe_to_agent":
      if (failed) {
        return {
          verb: "tried to subscribe — blocked",
          highlight: { text: `$${amount.toFixed(3)}`, tone: "red" },
        };
      }
      return {
        verb: `subscribed to ${item.counterparty ?? "an agent"}`,
        highlight: { text: `$${amount.toFixed(3)}`, tone: "amber" },
      };
    default:
      return { verb: item.tool.replace(/_/g, " ") };
  }
}

export function ActionFeed({ items, network }: ActionFeedProps) {
  return (
    <div
      className="relative w-full rounded-[16px] overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      {/* header */}
      <div
        className="flex items-center justify-between px-4 pt-3 pb-2"
        style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}
      >
        <div className="flex items-center gap-1.5">
          <Activity
            className="w-3 h-3"
            strokeWidth={2.2}
            style={{ color: "#15803D" }}
          />
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{ color: "#15803D", fontSize: 9.5, fontWeight: 600 }}
          >
            Live action feed
          </span>
          <motion.span
            aria-hidden
            className="rounded-full ml-0.5"
            style={{
              width: 5,
              height: 5,
              background: "#22C55E",
              boxShadow: "0 0 0 2.5px rgba(34,197,94,0.14)",
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <span
          className="font-mono"
          style={{ color: "#9CA3AF", fontSize: 10 }}
        >
          {items.length} {items.length === 1 ? "event" : "events"}
        </span>
      </div>

      {/* feed */}
      {items.length === 0 ? (
        <div
          className="px-4 py-6 text-center"
          style={{ color: "#9CA3AF", fontSize: 12.5 }}
        >
          No on-chain activity yet — your workers will appear here the moment they post, claim, complete, or stake.
        </div>
      ) : (
        <ul
          className="divide-y"
          style={{ borderColor: "rgba(15,23,42,0.04)" }}
        >
          <AnimatePresence initial={false}>
            {items.map((it) => (
              <FeedRow key={it.id} item={it} network={network} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function FeedRow({
  item,
  network,
}: {
  item: ActionFeedItem;
  network: "devnet" | "mainnet";
}) {
  const txt = actionText(item);
  const failed = item.signatureStatus === "failed";
  const success = item.signatureStatus === "success";

  const highlightColor =
    txt.highlight?.tone === "green"
      ? "#15803D"
      : txt.highlight?.tone === "red"
        ? "#B91C1C"
        : txt.highlight?.tone === "amber"
          ? "#B45309"
          : "#0A0A0A";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="px-4 py-2.5 flex items-center gap-2 flex-nowrap min-w-0"
    >
      {/* worker chip */}
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-[12px] flex-none"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #F2F3F5 100%)",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: "inset 0 1px 1px rgba(15,23,42,0.04)",
        }}
      >
        {item.worker.emoji}
      </span>
      <span
        className="text-[12.5px] font-medium flex-none"
        style={{ color: "#0A0A0A" }}
      >
        {item.worker.name}
      </span>

      {/* verb + highlight — truncates on narrow viewports so the
          Explorer pill + timestamp stay on one line. The full text
          is preserved in the title attribute for hover. */}
      <span
        className="text-[12.5px] min-w-0 flex-1 truncate"
        style={{ color: "#374151", lineHeight: 1.4 }}
        title={
          txt.highlight
            ? `${txt.verb} ${txt.highlight.text}`
            : txt.verb
        }
      >
        {txt.verb}
        {txt.highlight && (
          <>
            {" "}
            <span
              className="font-mono font-semibold"
              style={{
                color: highlightColor,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {txt.highlight.text}
            </span>
          </>
        )}
      </span>

      {/* status badge */}
      {success && (
        <span
          className="inline-flex items-center flex-none"
          style={{ color: "#15803D" }}
          aria-label="settled"
        >
          <Check className="w-3 h-3" strokeWidth={2.6} />
        </span>
      )}
      {failed && (
        <span
          className="inline-flex items-center flex-none"
          style={{ color: "#B91C1C" }}
          aria-label="blocked"
        >
          <X className="w-3 h-3" strokeWidth={2.6} />
        </span>
      )}

      {/* explorer link */}
      {item.signature && (
        <a
          href={explorerUrl(item.signature, network)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono flex-none"
          style={{
            background: success
              ? "rgba(34,197,94,0.10)"
              : "rgba(15,23,42,0.04)",
            color: success ? "#15803D" : "#374151",
            fontSize: 10.5,
          }}
          title="Open on Solana Explorer"
        >
          <Link2 className="w-2.5 h-2.5" strokeWidth={2.4} />
          <span className="hidden sm:inline">
            {item.signature.slice(0, 4)}…{item.signature.slice(-4)}
          </span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}

      {/* time */}
      <span
        className="font-mono flex-none"
        style={{ color: "#9CA3AF", fontSize: 10.5 }}
      >
        {fmtAgo(item.timestamp)}
      </span>
    </motion.li>
  );
}
