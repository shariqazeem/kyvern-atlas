"use client";

/**
 * CategoryTabs — filter pills for the Ability Store.
 */

import type { AbilityCategory } from "@/lib/abilities/types";

type Filter = "all" | AbilityCategory;

interface CategoryTabsProps {
  active: Filter;
  onChange: (filter: Filter) => void;
}

const TABS: { value: Filter; label: string; color: string }[] = [
  { value: "all", label: "All", color: "#111" },
  { value: "earn", label: "Earn", color: "#22C55E" },
  { value: "protect", label: "Protect", color: "#EF4444" },
  { value: "monitor", label: "Monitor", color: "#3B82F6" },
];

export function CategoryTabs({ active, onChange }: CategoryTabsProps) {
  return (
    <div className="flex items-center gap-2">
      {TABS.map((tab) => {
        const isActive = active === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className="relative h-8 px-3.5 rounded-full text-[12px] font-medium transition-colors"
            style={{
              background: isActive ? tab.color : "transparent",
              color: isActive ? "#fff" : "#9CA3AF",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
