"use client";

/**
 * /app/store/[id] — Ability detail + install page.
 *
 * Shows full description, config fields, and install button.
 * On install: saves to device store, registers server-side
 * (for Paywall: registers x402 endpoint), redirects to home.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Shield, Zap } from "lucide-react";
import { getAbility } from "@/lib/abilities/registry";
import { useDeviceStore } from "@/hooks/use-device-store";
import { useAuth } from "@/hooks/use-auth";
import { ConfigFields } from "@/components/store/config-fields";

function devWallet(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("kyvern:dev-wallet") ?? "";
}

const CATEGORY_COLORS: Record<string, string> = {
  earn: "#22C55E",
  protect: "#EF4444",
  monitor: "#3B82F6",
};

export default function AbilityDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const ability = getAbility(params.id);
  const { install, isInstalled, vaultId, autoInit } = useDeviceStore();
  const { wallet, isLoading: authLoading } = useAuth();
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  // Auto-init store if not initialized
  useEffect(() => {
    if (authLoading || vaultId) return;
    const w = wallet ?? devWallet();
    if (w) void autoInit(w);
  }, [authLoading, wallet, autoInit, vaultId]);

  // Build initial config from schema defaults
  const defaultConfig = useMemo(() => {
    if (!ability) return {};
    const cfg: Record<string, string | number | boolean> = {};
    for (const f of ability.configSchema) {
      cfg[f.key] = f.default;
    }
    return cfg;
  }, [ability]);

  const [config, setConfig] = useState(defaultConfig);

  const handleFieldChange = useCallback(
    (key: string, value: string | number | boolean) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleInstall = useCallback(async () => {
    if (!ability || !vaultId || installing) return;
    setInstalling(true);

    try {
      // Server-side registrations based on ability type
      if (ability.id === "paywall-url" && config.targetUrl) {
        // Register x402 endpoint on server
        await fetch("/api/endpoints/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vaultId,
            targetUrl: config.targetUrl,
            priceUsd: config.priceUsd ?? 0.001,
          }),
        });
      }

      if (ability.id === "drain-bounty") {
        // Enable bounty on vault (fires welcome attack)
        await fetch(`/api/vault/${vaultId}/bounty`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }).catch(() => {});
      }

      // Save to device store (localStorage)
      install(ability.id, config);
      setInstalled(true);

      // Redirect to home after a beat
      setTimeout(() => router.push("/app"), 1200);
    } catch {
      setInstalling(false);
    }
  }, [ability, vaultId, config, installing, install, router]);

  if (!ability) {
    return (
      <div className="py-20 text-center">
        <p className="text-[14px] text-[#6B7280]">Ability not found.</p>
        <Link href="/app/store" className="text-[13px] text-[#111] underline mt-2 inline-block">
          Back to Store
        </Link>
      </div>
    );
  }

  const alreadyInstalled = isInstalled(ability.id);
  const catColor = CATEGORY_COLORS[ability.category] ?? "#9CA3AF";

  return (
    <div className="py-2">
      {/* Back */}
      <Link
        href="/app/store"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#9CA3AF] mb-4 hover:text-[#6B7280]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Store
      </Link>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-[20px] p-5 mb-5"
        style={{
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-[16px] flex items-center justify-center text-[30px] shrink-0"
            style={{ background: "#F3F4F6" }}
          >
            {ability.emoji}
          </div>
          <div>
            <h1 className="text-[20px] font-semibold text-[#111]">
              {ability.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: `${catColor}10`, color: catColor }}
              >
                {ability.category}
              </span>
              <span className="text-[11px] text-[#9CA3AF]">
                by {ability.publisher}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[13px] text-[#6B7280] leading-[1.65]">
          {ability.fullDescription}
        </p>

        {/* On-chain proof */}
        <div
          className="mt-4 flex items-start gap-2 p-3 rounded-[12px]"
          style={{ background: "#F9FAFB" }}
        >
          <Shield className="w-3.5 h-3.5 text-[#9CA3AF] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[#9CA3AF] leading-[1.5]">
            <span className="font-semibold text-[#6B7280]">On-chain proof:</span>{" "}
            {ability.onChainProof}
          </p>
        </div>
      </motion.div>

      {/* Config */}
      {!alreadyInstalled && !installed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="rounded-[20px] p-5 mb-5"
          style={{
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <h2 className="text-[14px] font-semibold text-[#111] mb-4">
            Configure
          </h2>
          <ConfigFields
            schema={ability.configSchema}
            values={config}
            onChange={handleFieldChange}
          />
        </motion.div>
      )}

      {/* Install button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="sticky bottom-20 z-40"
      >
        {installed ? (
          <div
            className="flex items-center justify-center gap-2 h-12 rounded-[14px] text-[15px] font-semibold"
            style={{ background: "#22C55E", color: "#fff" }}
          >
            <Check className="w-5 h-5" />
            Installed
          </div>
        ) : alreadyInstalled ? (
          <div
            className="flex items-center justify-center h-12 rounded-[14px] text-[15px] font-medium"
            style={{ background: "#F3F4F6", color: "#9CA3AF" }}
          >
            Already installed
          </div>
        ) : (
          <button
            onClick={handleInstall}
            disabled={installing}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-[14px] text-[15px] font-semibold transition-all active:scale-[0.98]"
            style={{
              background: installing ? "#6B7280" : "#111",
              color: "#fff",
            }}
          >
            {installing ? (
              <>
                <motion.span
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
                Installing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Install on device
              </>
            )}
          </button>
        )}
      </motion.div>
    </div>
  );
}
