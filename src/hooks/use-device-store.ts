/**
 * Device store — zustand + localStorage for installed ability state.
 *
 * The store auto-hydrates: whenever init(vaultId) is called, it reads
 * localStorage. Components should call init on mount with the user's
 * vault ID. Multiple init calls with the same ID are idempotent but
 * always re-read localStorage (so navigating back after install picks
 * up the new ability).
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

/** Get the first vault ID from the user's vaults API */
async function fetchFirstVaultId(wallet: string): Promise<string | null> {
  try {
    const r = await fetch(
      `/api/vault/list?ownerWallet=${encodeURIComponent(wallet)}`,
    );
    if (!r.ok) return null;
    const d = await r.json();
    const vaults = d?.vaults ?? [];
    return vaults.length > 0 ? vaults[0].vault.id : null;
  } catch {
    return null;
  }
}

interface DeviceStore {
  vaultId: string | null;
  abilities: InstalledAbility[];

  /** Initialize with a vault ID — ALWAYS re-reads localStorage */
  init: (vaultId: string) => void;

  /** Auto-init: fetches user's first vault and inits */
  autoInit: (wallet: string) => Promise<void>;

  install: (abilityId: string, config: Record<string, string | number | boolean>) => void;
  uninstall: (abilityId: string) => void;
  updateConfig: (abilityId: string, config: Record<string, string | number | boolean>) => void;
  toggleStatus: (abilityId: string) => void;
  isInstalled: (abilityId: string) => boolean;
  getInstalled: (abilityId: string) => InstalledAbility | undefined;
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  vaultId: null,
  abilities: [],

  init: (vaultId: string) => {
    // Always re-read from localStorage (fixes navigation-back bug)
    const abilities = loadState(vaultId);
    set({ vaultId, abilities });
  },

  autoInit: async (wallet: string) => {
    const id = await fetchFirstVaultId(wallet);
    if (id) {
      const abilities = loadState(id);
      set({ vaultId: id, abilities });
    }
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
