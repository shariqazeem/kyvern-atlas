"use client";

/**
 * /app/vaults/[id] — Per-vault mission control.
 *
 * Thin page wrapper around <UserVaultCard>. The same card mounts on
 * /app for the user's primary vault — this page is reachable via
 * Settings or any deep link.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  UserVaultCard,
  deriveSerial,
  type VaultPayload,
} from "@/components/device/worker/user-vault-card";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function VaultDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { wallet, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<VaultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/vault/${params.id}?limit=20`, {
        cache: "no-store",
      });
      if (!r.ok) {
        if (r.status === 404) setError("vault_not_found");
        return;
      }
      const d = (await r.json()) as VaultPayload;
      setData(d);
      setError(null);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
    const t = setInterval(load, 5_000);
    return () => clearInterval(t);
  }, [load]);

  if (loading || authLoading) return <Spinner />;
  if (error === "vault_not_found") return <NotFound id={params.id} />;
  if (!data) return <Spinner />;

  const isMine =
    !wallet || !data.vault.ownerWallet || wallet === data.vault.ownerWallet;
  const serial = deriveSerial(data.vault.id);

  return (
    <div
      className="mx-auto w-full px-4 sm:px-6 py-5 flex flex-col gap-4"
      style={{ maxWidth: 880 }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex items-center gap-3 flex-wrap"
      >
        <Link
          href="/app/settings"
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-all hover:bg-[rgba(15,23,42,0.04)]"
        >
          <ArrowLeft
            className="w-3.5 h-3.5"
            strokeWidth={2}
            style={{ color: "rgba(15,23,42,0.55)" }}
          />
          <span
            className="text-[12px]"
            style={{ color: "rgba(15,23,42,0.55)" }}
          >
            Settings
          </span>
        </Link>
        <span
          style={{ width: 1, height: 16, background: "rgba(15,23,42,0.10)" }}
        />
        <h1
          className="text-[18px] font-semibold tracking-[-0.015em]"
          style={{ color: "#0A0A0A" }}
        >
          {data.vault.emoji} {data.vault.name}
        </h1>
        <span
          className="font-mono text-[10.5px]"
          style={{ color: "rgba(15,23,42,0.55)" }}
        >
          {serial}
        </span>
      </motion.div>

      {!isMine && (
        <div
          className="rounded-md px-3 py-2 text-[12px]"
          style={{
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.18)",
            color: "#B45309",
          }}
        >
          You are signed in as a different wallet — this vault is owned by{" "}
          <span className="font-mono">
            {data.vault.ownerWallet.slice(0, 4)}…
            {data.vault.ownerWallet.slice(-4)}
          </span>
          . Read-only view.
        </div>
      )}

      <UserVaultCard
        data={data}
        ownerWallet={wallet ?? null}
        now={now}
        firstCall={isMine}
      />
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div
        className="w-5 h-5 border-2 rounded-full animate-spin"
        style={{
          borderColor: "rgba(0,0,0,0.08)",
          borderTopColor: "#0A0A0A",
        }}
      />
    </div>
  );
}

function NotFound({ id }: { id: string }) {
  return (
    <div
      className="mx-auto w-full px-4 sm:px-6 py-16 text-center"
      style={{ maxWidth: 540 }}
    >
      <h1
        className="text-[20px] font-semibold tracking-[-0.015em]"
        style={{ color: "#0A0A0A" }}
      >
        Vault not found
      </h1>
      <p
        className="mt-2 text-[13px]"
        style={{ color: "rgba(15,23,42,0.55)" }}
      >
        <span className="font-mono">{id}</span> doesn&apos;t exist or you
        don&apos;t have access.
      </p>
      <Link
        href="/app/settings"
        className="mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-[12px] text-[13px] font-semibold transition-all active:scale-[0.97]"
        style={{ background: "#0A0A0A", color: "#FFFFFF" }}
      >
        Back to Settings
      </Link>
    </div>
  );
}
