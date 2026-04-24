/**
 * Ability type definitions.
 *
 * An Ability is a self-contained capability that runs on a Kyvern Device.
 * Users install abilities from the Ability Store with zero code.
 */

export type AbilityCategory = "earn" | "protect" | "monitor";

export interface AbilityConfigField {
  key: string;
  label: string;
  type: "slider" | "toggle" | "text" | "select";
  default: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string }[];
  hint?: string;
}

export interface AbilityDef {
  id: string;
  name: string;
  emoji: string;
  shortDescription: string;
  fullDescription: string;
  category: AbilityCategory;
  publisher: string;
  configSchema: AbilityConfigField[];
  /** What on-chain proof this ability produces (for judging credibility) */
  onChainProof: string;
}

export interface InstalledAbility {
  abilityId: string;
  installedAt: string;
  status: "active" | "paused";
  config: Record<string, string | number | boolean>;
}

export interface DeviceState {
  vaultId: string;
  installedAbilities: InstalledAbility[];
}
