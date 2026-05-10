"use client";

/**
 * StepIcon — single icon family for every step + recipe surface.
 *
 * Replaces the emoji-soup that made the composer feel like a stamp
 * collection. One Lucide icon per step type, drawn at consistent
 * stroke weight (1.75) inside a tinted square that's color-keyed to
 * the step's role:
 *
 *   Money  (vault.pay, transfer.usdc) → green
 *   Logic  (llm, http, branch, loop)  → blue / neutral
 *   Output (log, signal)              → purple / pink
 *
 * Same family is used in the recipe gallery so the visual language
 * is consistent between picking a recipe and picking a step inside
 * the composer.
 */

import {
  Brain,
  Globe,
  Coins,
  ArrowRightLeft,
  FileText,
  Inbox,
  GitBranch,
  Repeat2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { StepType } from "@/lib/agents/graph/types";

export type StepCategory = "money" | "logic" | "output";

export const STEP_ICON: Record<StepType, LucideIcon> = {
  llm: Brain,
  http: Globe,
  "vault.pay": Coins,
  "transfer.usdc": ArrowRightLeft,
  log: FileText,
  signal: Inbox,
  branch: GitBranch,
  loop: Repeat2,
};

export const STEP_CATEGORY: Record<StepType, StepCategory> = {
  llm: "logic",
  http: "logic",
  "vault.pay": "money",
  "transfer.usdc": "money",
  log: "output",
  signal: "output",
  branch: "logic",
  loop: "logic",
};

const CATEGORY_PALETTE: Record<
  StepCategory,
  { bg: string; fg: string; ring: string }
> = {
  money: {
    bg: "rgba(34,197,94,0.10)",
    fg: "#15803D",
    ring: "rgba(34,197,94,0.20)",
  },
  logic: {
    bg: "rgba(59,130,246,0.10)",
    fg: "#1E3A8A",
    ring: "rgba(59,130,246,0.20)",
  },
  output: {
    bg: "rgba(168,85,247,0.10)",
    fg: "#7E22CE",
    ring: "rgba(168,85,247,0.18)",
  },
};

interface StepIconProps {
  type: StepType;
  size?: number;
  className?: string;
}

export function StepIcon({ type, size = 32, className }: StepIconProps) {
  const Icon = STEP_ICON[type] ?? Sparkles;
  const palette = CATEGORY_PALETTE[STEP_CATEGORY[type]];
  const inner = Math.round(size * 0.55);
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        background: palette.bg,
        borderRadius: Math.round(size * 0.28),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `inset 0 0 0 1px ${palette.ring}`,
        flexShrink: 0,
      }}
    >
      <Icon size={inner} strokeWidth={1.75} color={palette.fg} />
    </div>
  );
}

/* ─── Recipe icons ─────────────────────────────────────────────
 * Recipes pick one of the step types as their "primary" identity
 * for the gallery card. Maps each recipe id to a step type so the
 * icon renders consistently. Cleaner than per-recipe emoji sprays.
 */

import {
  Newspaper,
  RefreshCw,
  CreditCard,
  Eye,
  TrendingUp,
  HandCoins,
  ScrollText,
  Receipt,
  Satellite,
} from "lucide-react";

const RECIPE_ICON: Record<string, LucideIcon> = {
  "pulse-trigger": TrendingUp,
  "paysh-quote": Satellite,
  "daily-solana-brief": Newspaper,
  "subscription-renewer": RefreshCw,
  "kast-auto-topup": CreditCard,
  "wallet-watcher": Eye,
  "yield-rebalancer": TrendingUp,
  "tip-jar": HandCoins,
  "vault-digest": ScrollText,
  "quote-and-pay": Receipt,
};

/** Recipe gallery cards inherit the same tinted-square treatment.
 *  Tag determines the palette; the icon inside is recipe-specific. */
export function RecipeIcon({
  recipeId,
  tag,
  size = 36,
}: {
  recipeId: string;
  tag: "ai" | "spend" | "watch" | "earn" | "scheduled";
  size?: number;
}) {
  const Icon = RECIPE_ICON[recipeId] ?? Sparkles;
  const palette =
    tag === "spend" || tag === "earn" ? CATEGORY_PALETTE.money
    : tag === "ai" ? CATEGORY_PALETTE.output
    : CATEGORY_PALETTE.logic;
  const inner = Math.round(size * 0.55);
  return (
    <div
      style={{
        width: size,
        height: size,
        background: palette.bg,
        borderRadius: Math.round(size * 0.28),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `inset 0 0 0 1px ${palette.ring}`,
        flexShrink: 0,
      }}
    >
      <Icon size={inner} strokeWidth={1.75} color={palette.fg} />
    </div>
  );
}
