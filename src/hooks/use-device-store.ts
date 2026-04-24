/**
 * Device store — zustand + localStorage for installed ability state.
 *
 * Ability install state is UI-only (localStorage). Server-side
 * registrations (x402 endpoints, bounty targets) happen via API calls
 * at install time — this store only tracks what's shown on the device.
 */

import { create } from "zustand";
import type { InstalledAbility, DeviceState } from "@/lib/abilities/types";

function storageKey(vaultId: string): string {
  return `kyvern:device:${vaultId}`;
}

function loadState(vaultId: string): InstalledAbility[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(vaultId));
    if (!raw) return [];
    const state = JSON.parse(raw) as DeviceState;
    return state.installedAbilities ?? [];
  } catch {
    return [];
  }
}

function saveState(vaultId: string, abilities: InstalledAbility[]): void {
  if (typeof window === "undefined") return;
  const state: DeviceState = { vaultId, installedAbilities: abilities };
  window.localStorage.setItem(storageKey(vaultId), JSON.stringify(state));
}

interface DeviceStore {
  vaultId: string | null;
  abilities: InstalledAbility[];

  /** Initialize with a vault ID — loads from localStorage */
  init: (vaultId: string) => void;

  /** Install a new ability with config */
  install: (abilityId: string, config: Record<string, string | number | boolean>) => void;

  /** Uninstall an ability */
  uninstall: (abilityId: string) => void;

  /** Update ability config */
  updateConfig: (abilityId: string, config: Record<string, string | number | boolean>) => void;

  /** Toggle ability status */
  toggleStatus: (abilityId: string) => void;

  /** Check if an ability is installed */
  isInstalled: (abilityId: string) => boolean;

  /** Get a specific installed ability */
  getInstalled: (abilityId: string) => InstalledAbility | undefined;
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  vaultId: null,
  abilities: [],

  init: (vaultId: string) => {
    const abilities = loadState(vaultId);
    set({ vaultId, abilities });
  },

  install: (abilityId, config) => {
    const { vaultId, abilities } = get();
    if (!vaultId) return;
    if (abilities.some((a) => a.abilityId === abilityId)) return;

    const updated = [
      ...abilities,
      {
        abilityId,
        installedAt: new Date().toISOString(),
        status: "active" as const,
        config,
      },
    ];
    saveState(vaultId, updated);
    set({ abilities: updated });
  },

  uninstall: (abilityId) => {
    const { vaultId, abilities } = get();
    if (!vaultId) return;
    const updated = abilities.filter((a) => a.abilityId !== abilityId);
    saveState(vaultId, updated);
    set({ abilities: updated });
  },

  updateConfig: (abilityId, config) => {
    const { vaultId, abilities } = get();
    if (!vaultId) return;
    const updated = abilities.map((a) =>
      a.abilityId === abilityId ? { ...a, config } : a,
    );
    saveState(vaultId, updated);
    set({ abilities: updated });
  },

  toggleStatus: (abilityId) => {
    const { vaultId, abilities } = get();
    if (!vaultId) return;
    const updated = abilities.map((a) =>
      a.abilityId === abilityId
        ? { ...a, status: (a.status === "active" ? "paused" : "active") as "active" | "paused" }
        : a,
    );
    saveState(vaultId, updated);
    set({ abilities: updated });
  },

  isInstalled: (abilityId) => {
    return get().abilities.some((a) => a.abilityId === abilityId);
  },

  getInstalled: (abilityId) => {
    return get().abilities.find((a) => a.abilityId === abilityId);
  },
}));
