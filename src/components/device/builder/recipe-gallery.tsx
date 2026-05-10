"use client";

/**
 * RecipeGallery — pick a starting recipe or go blank.
 *
 * 8 recipe cards arranged in a responsive grid + a "Start blank"
 * tile at the end. Each card shows emoji, name, tag pill, and a
 * 1-line description. Click loads the recipe's graph into the
 * composer.
 */

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { RecipeDef } from "@/lib/agents/graph/recipes";

interface Props {
  recipes: RecipeDef[];
  onPick: (recipe: RecipeDef) => void;
  onStartBlank: () => void;
}

export function RecipeGallery({ recipes, onPick, onStartBlank }: Props) {
  return (
    <div className="p-5">
      <p
        className="text-[13px] mb-4 text-center"
        style={{ color: "rgba(15,23,42,0.65)" }}
      >
        Start from a recipe or compose from scratch. Every spend goes
        through the on-chain Kyvern policy program.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {recipes.map((r) => (
          <RecipeCard key={r.id} recipe={r} onClick={() => onPick(r)} />
        ))}
        <BlankCard onClick={onStartBlank} />
      </div>
    </div>
  );
}

function RecipeCard({ recipe, onClick }: { recipe: RecipeDef; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="rounded-[12px] flex flex-col items-stretch gap-2 p-4 text-left transition"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.10)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[20px] leading-none">{recipe.emoji}</span>
        <TagPill tag={recipe.tag} />
      </div>
      <div
        className="text-[13.5px] font-semibold tracking-[-0.005em]"
        style={{ color: "#0A0A0A" }}
      >
        {recipe.name}
      </div>
      <div
        className="text-[11.5px] leading-relaxed"
        style={{ color: "rgba(15,23,42,0.55)" }}
      >
        {recipe.description}
      </div>
      <div
        className="font-mono uppercase tracking-[0.12em] mt-1"
        style={{ fontSize: 8.5, color: "#9CA3AF" }}
      >
        {recipe.graph.steps.length} step{recipe.graph.steps.length === 1 ? "" : "s"} · {triggerSummary(recipe.graph.trigger)}
      </div>
    </motion.button>
  );
}

function BlankCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="rounded-[12px] flex flex-col items-center justify-center gap-2 p-4 text-center transition"
      style={{
        background: "rgba(15,23,42,0.02)",
        border: "1px dashed rgba(15,23,42,0.15)",
      }}
    >
      <Sparkles className="w-5 h-5" style={{ color: "#6B7280" }} />
      <div
        className="text-[13.5px] font-semibold tracking-[-0.005em]"
        style={{ color: "#0A0A0A" }}
      >
        Start blank
      </div>
      <div
        className="text-[11.5px]"
        style={{ color: "rgba(15,23,42,0.55)" }}
      >
        Compose from scratch.
      </div>
    </motion.button>
  );
}

function TagPill({ tag }: { tag: RecipeDef["tag"] }) {
  const map: Record<RecipeDef["tag"], { label: string; color: string; bg: string }> = {
    ai: { label: "AI", color: "#7C2D12", bg: "rgba(245,158,11,0.12)" },
    spend: { label: "Spend", color: "#15803D", bg: "rgba(34,197,94,0.12)" },
    watch: { label: "Watch", color: "#1E3A8A", bg: "rgba(59,130,246,0.12)" },
    earn: { label: "Earn", color: "#581C87", bg: "rgba(168,85,247,0.12)" },
    scheduled: { label: "Cron", color: "#7C2D12", bg: "rgba(245,158,11,0.12)" },
  };
  const t = map[tag];
  return (
    <span
      className="font-mono uppercase tracking-[0.12em] rounded px-1.5 py-0.5"
      style={{ fontSize: 8.5, color: t.color, background: t.bg }}
    >
      {t.label}
    </span>
  );
}

function triggerSummary(trigger: RecipeDef["graph"]["trigger"]): string {
  switch (trigger.kind) {
    case "manual": return "manual";
    case "interval":
      if (trigger.ms < 3_600_000) return `every ${Math.round(trigger.ms / 60_000)}m`;
      if (trigger.ms < 86_400_000) return `every ${Math.round(trigger.ms / 3_600_000)}h`;
      return `every ${Math.round(trigger.ms / 86_400_000)}d`;
    case "cron":
      return `cron`;
    case "webhook":
      return "webhook";
  }
}
