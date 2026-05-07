"use client";

/**
 * /app/settings — Phase 4 multi-surface redesign.
 *
 * Same architectural rhyme: PageHeader + two-zone grid (Devices left,
 * Account right). No outer card chrome. Pre-alpha disclaimer is inline
 * muted text. Mobile stacks vertically.
 *
 * All existing handlers preserved — wallet copy, sign out, program
 * Explorer links, Atlas status fetch.
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SettingsPageShell } from "@/components/device/settings/settings-page-shell";

interface VaultBrief {
  vault: {
    id: string;
    name: string;
    emoji: string;
    network: string;
    pausedAt: string | null;
  };
}

interface AtlasMini {
  totalCycles: number;
  totalAttacksBlocked: number;
  totalSettled: number;
  uptimeMs: number;
}

function devWallet(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("kyvern:dev-wallet") ?? "";
}

function deriveSerial(vaultId: string): string {
  return `KVN-${vaultId.replace("vlt_", "").slice(0, 8).toUpperCase()}`;
}

export default function AppSettingsPage() {
  const { wallet, signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [myDevices, setMyDevices] = useState<VaultBrief[]>([]);
  const [atlas, setAtlas] = useState<AtlasMini | null>(null);

  useEffect(() => {
    const owner = wallet ?? devWallet();
    if (!owner) return;
    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => setMyDevices((d?.vaults ?? []) as VaultBrief[]))
      .catch(() => {});
    fetch("/api/atlas/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d === "object" && !("error" in d)) {
          setAtlas({
            totalCycles: d.totalCycles ?? 0,
            totalAttacksBlocked: d.totalAttacksBlocked ?? 0,
            totalSettled: d.totalSettled ?? 0,
            uptimeMs: d.uptimeMs ?? 0,
          });
        }
      })
      .catch(() => {});
  }, [wallet]);

  const onSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut?.();
    } catch {
      /* ignore — hook hard-redirects regardless */
    }
  };

  const onCopyWallet = async () => {
    if (!wallet) return;
    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  // Use the primary device's serial + network as the page-header
  // identity. Falls back to "—" / "devnet" before the first device
  // resolves.
  const primary = myDevices[0]?.vault;
  const serial = primary ? deriveSerial(primary.id) : null;
  const network = (primary?.network as "devnet" | "mainnet") ?? "devnet";
  const paused = !!primary?.pausedAt;

  return (
    <SettingsPageShell
      serial={serial}
      network={network}
      paused={paused}
      myDevices={myDevices}
      atlas={atlas}
      wallet={wallet ?? null}
      onCopyWallet={onCopyWallet}
      copied={copied}
      onSignOut={onSignOut}
      signingOut={signingOut}
    />
  );
}
