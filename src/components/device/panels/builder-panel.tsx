"use client";

/**
 * BuilderPanel — the </> Builder instrument drawer.
 *
 * Three stacked cards for builders who want to wrap their own agents:
 *   1. Policy Playground — merchant + amount + memo form, real verdict.
 *   2. SDK / Pay.sh — code snippet with the user's actual agent key,
 *      toggle between SDK and Pay.sh examples.
 *   3. Agent key — kv_live_… prefix + Mint-a-fresh-key button.
 *
 * Phase 2 — extracted from the advanced section of pay-enforce-tab.tsx.
 * Logic preserved verbatim; the wrapping <DevicePanel> shell + footer
 * hint replace the old "For builders · test + integrate" disclosure.
 */

import { useEffect, useState } from "react";
import { DevicePanel } from "./device-panel";
import { PolicyPlayground } from "../home/policy-playground";
import { IntegrateCard } from "../home/integrate-card";

interface PolicySummary {
  dailyLimitUsd: number;
  dailySpentUsd: number;
  callsToday: number;
  blockedToday: number;
  lastSettledTxSignature: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  deviceId: string | null;
  network: "devnet" | "mainnet";
  isGuest?: boolean;
  onSignIn?: () => void;
  policySummary?: PolicySummary | null;
  perTxMaxUsd?: number;
}

export function BuilderPanel({
  open,
  onClose,
  deviceId,
  network,
  isGuest,
  onSignIn,
  policySummary,
  perTxMaxUsd,
}: Props) {
  const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    fetch(`/api/devices/${deviceId}/agent-key`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.keyPrefix) setKeyPrefix(d.keyPrefix);
      })
      .catch(() => {});
  }, [deviceId]);

  async function mintKey() {
    if (isGuest) {
      onSignIn?.();
      return;
    }
    if (!deviceId || revealing) return;
    setRevealing(true);
    try {
      const res = await fetch(`/api/devices/${deviceId}/agent-key`, {
        method: "POST",
      });
      const d = await res.json();
      if (d?.rawKey) {
        setRevealedKey(d.rawKey);
        if (d.keyPrefix) setKeyPrefix(d.keyPrefix);
      }
    } catch {
      /* ignore */
    } finally {
      setRevealing(false);
    }
  }

  return (
    <DevicePanel
      open={open}
      onClose={onClose}
      title="Builder"
      subtitle="Test the policy · wrap your agent · mint a key"
      footer={
        <div
          className="text-center font-mono uppercase tracking-[0.16em]"
          style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
        >
          More integrations coming: Jupiter · Drift · Marinade · MagicEden.
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* CARD 1 — Policy Playground */}
        <section>
          <SectionHeader
            eyebrow="Test the policy"
            title="Punch in any payment. Watch the chain decide."
            subtitle="No code. No docs. Real on-chain enforcement of the rules below."
          />
          <PolicyPlayground
            deviceId={deviceId}
            network={network}
            policySummary={policySummary ?? null}
            perTxMaxUsd={perTxMaxUsd}
          />
        </section>

        {/* CARD 2 / 3 — Integrate (SDK ↔ Pay.sh) + Agent key */}
        <section>
          <SectionHeader
            eyebrow="Integrate"
            title="Wrap your own agent in five lines."
            subtitle="The same SDK works with Pay.sh — Solana × Google Cloud's agent commerce rail."
          />
          <IntegrateCard
            keyPrefix={keyPrefix}
            revealedKey={revealedKey}
            onMint={mintKey}
            revealing={revealing}
            isGuest={isGuest}
          />
        </section>
      </div>
    </DevicePanel>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-3">
      <div
        className="font-mono uppercase tracking-[0.18em] mb-1"
        style={{ color: "#9CA3AF", fontSize: 10 }}
      >
        {eyebrow}
      </div>
      <h3
        className="text-[15.5px] font-semibold tracking-[-0.005em] mb-0.5"
        style={{ color: "#0A0A0A" }}
      >
        {title}
      </h3>
      <p
        className="text-[12px] leading-[1.5]"
        style={{ color: "#6B7280" }}
      >
        {subtitle}
      </p>
    </div>
  );
}
