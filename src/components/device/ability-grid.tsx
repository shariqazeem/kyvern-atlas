"use client";

/**
 * AbilityGrid — iOS-style icon grid for installed abilities.
 */

import { AbilityIcon } from "./ability-icon";
import { getAbility } from "@/lib/abilities/registry";
import type { InstalledAbility } from "@/lib/abilities/types";

interface AbilityGridProps {
  abilities: InstalledAbility[];
}

export function AbilityGrid({ abilities }: AbilityGridProps) {
  return (
    <div className="grid grid-cols-4 gap-4 justify-items-center py-4">
      {abilities.map((inst, i) => {
        const def = getAbility(inst.abilityId);
        if (!def) return null;
        return (
          <AbilityIcon
            key={inst.abilityId}
            abilityId={inst.abilityId}
            emoji={def.emoji}
            name={def.name.split(" ")[0]}
            status={inst.status}
            index={i}
          />
        );
      })}
    </div>
  );
}
