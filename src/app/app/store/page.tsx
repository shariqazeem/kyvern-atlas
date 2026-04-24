"use client";

/**
 * /app/store — Ability Store.
 *
 * Browse and install abilities. 3 first-party abilities.
 * Filter by category. Tap to view detail + install.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ABILITIES } from "@/lib/abilities/registry";
import { useDeviceStore } from "@/hooks/use-device-store";
import { AbilityCard } from "@/components/store/ability-card";
import { CategoryTabs } from "@/components/store/category-tabs";
import type { AbilityCategory } from "@/lib/abilities/types";

type Filter = "all" | AbilityCategory;

export default function AbilityStorePage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { isInstalled } = useDeviceStore();

  const filtered =
    filter === "all"
      ? ABILITIES
      : ABILITIES.filter((a) => a.category === filter);

  return (
    <div className="py-2">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-5"
      >
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-[#111]">
          Ability Store
        </h1>
        <p className="text-[13px] text-[#9CA3AF] mt-1">
          Install abilities on your device. No code needed.
        </p>
      </motion.div>

      {/* Category filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="mb-5"
      >
        <CategoryTabs active={filter} onChange={setFilter} />
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((ability, i) => (
          <AbilityCard
            key={ability.id}
            ability={ability}
            installed={isInstalled(ability.id)}
            index={i}
          />
        ))}
      </div>

      {/* No vault CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mt-8 rounded-[16px] p-4 text-center"
        style={{
          background: "#F9FAFB",
          border: "1px solid rgba(0,0,0,0.04)",
        }}
      >
        <p className="text-[12px] text-[#9CA3AF]">
          Need a device first?
        </p>
        <Link
          href="/vault/new"
          className="inline-flex items-center gap-1 mt-1 text-[12px] font-semibold text-[#111]"
        >
          Create your device <ArrowRight className="w-3 h-3" />
        </Link>
      </motion.div>
    </div>
  );
}
