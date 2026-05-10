"use client";

/**
 * /app/inbox — Findings (the audit log).
 *
 * Every payment decision the user's vault has seen, in chronological
 * order. Settled, refused, blocked — all surfaced with the policy
 * code that triggered the outcome and an Explorer link when applicable.
 *
 * Pivots cleanly off the graph-agent signals model that lived here
 * before. Now it's a security ledger: judges can click any row and
 * verify the chain decision on Solana Explorer.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Search,
  Shield,
  ShieldX,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface VaultBrief {
  vault: { id: string; name: string; network: "devnet" | "mainnet" };
}

interface VaultPayment {
  id: string;
  createdAt: string;
  merchant: string;
  amountUsd: number;
  status: "settled" | "blocked" | "failed" | "allowed";
  reason: string | null;
  txSignature: string | null;
  memo: string | null;
}

interface VaultPayload {
  vault: { id: string; name: string; network: "devnet" | "mainnet" };
  payments: VaultPayment[];
}

interface Finding {
  id: string;
  vaultId: string;
  vaultName: string;
  network: "devnet" | "mainnet";
  createdAt: string;
  whenMs: number;
  merchant: string;
  amountUsd: number;
  status: VaultPayment["status"];
  reason: string | null;
  txSignature: string | null;
}

type FilterId = "all" | "settled" | "refused";

function devWallet(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("kyvern:dev-wallet") ?? "";
}

export default function FindingsPage() {
  const { wallet, isLoading } = useAuth();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (isLoading) return;
    const owner = wallet ?? devWallet();
    if (!owner) {
      setLoading(false);
      return;
    }
    try {
      const listRes = await fetch(
        `/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`,
      );
      if (!listRes.ok) {
        setLoading(false);
        return;
      }
      const listData = (await listRes.json()) as { vaults?: VaultBrief[] };
      const vaults = listData.vaults ?? [];
      if (vaults.length === 0) {
        setFindings([]);
        setLoading(false);
        return;
      }
      const payloads = await Promise.all(
        vaults.map((v) =>
          fetch(`/api/vault/${v.vault.id}?limit=100`)
            .then((r) => (r.ok ? (r.json() as Promise<VaultPayload>) : null))
            .catch(() => null),
        ),
      );
      const all: Finding[] = [];
      for (const p of payloads) {
        if (!p) continue;
        for (const pay of p.payments ?? []) {
          all.push({
            id: pay.id,
            vaultId: p.vault.id,
            vaultName: p.vault.name,
            network: p.vault.network,
            createdAt: pay.createdAt,
            whenMs: parseTs(pay.createdAt),
            merchant: pay.merchant,
            amountUsd: pay.amountUsd,
            status: pay.status,
            reason: pay.reason,
            txSignature: pay.txSignature,
          });
        }
      }
      all.sort((a, b) => b.whenMs - a.whenMs);
      setFindings(all);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [isLoading, wallet]);

  useEffect(() => {
    void load();
    const t = setInterval(load, 5_000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return findings.filter((f) => {
      if (filter === "settled" && f.status !== "settled" && f.status !== "allowed")
        return false;
      if (
        filter === "refused" &&
        f.status !== "blocked" &&
        f.status !== "failed"
      )
        return false;
      if (q) {
        const blob = `${f.merchant} ${f.reason ?? ""} ${f.vaultName}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [findings, filter, search]);

  const counts = useMemo(() => {
    let settled = 0,
      refused = 0;
    for (const f of findings) {
      if (f.status === "settled" || f.status === "allowed") settled++;
      else if (f.status === "blocked" || f.status === "failed") refused++;
    }
    return { all: findings.length, settled, refused };
  }, [findings]);

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
          href="/app"
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
            Back
          </span>
        </Link>
        <span
          style={{ width: 1, height: 16, background: "rgba(15,23,42,0.10)" }}
        />
        <div className="flex flex-col gap-0.5">
          <h1
            className="text-[18px] font-semibold tracking-[-0.015em]"
            style={{ color: "#0A0A0A" }}
          >
            Findings
          </h1>
          <p
            className="text-[12px]"
            style={{ color: "rgba(15,23,42,0.55)" }}
          >
            Every policy decision your vaults have seen — settled, refused,
            blocked. Each row links to the on-chain proof.
          </p>
        </div>
      </motion.div>

      {/* Filter row */}
      <div
        className="flex items-center gap-2 flex-wrap rounded-[14px] p-3"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        <FilterPill
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="All"
          count={counts.all}
        />
        <FilterPill
          active={filter === "settled"}
          onClick={() => setFilter("settled")}
          label="Settled"
          count={counts.settled}
          tone="green"
        />
        <FilterPill
          active={filter === "refused"}
          onClick={() => setFilter("refused")}
          label="Refused"
          count={counts.refused}
          tone="amber"
        />
        <div
          className="ml-auto flex items-center gap-2 rounded-[8px] px-2.5 py-1.5"
          style={{
            background: "rgba(15,23,42,0.04)",
            border: "1px solid rgba(15,23,42,0.06)",
          }}
        >
          <Search
            className="w-3 h-3"
            strokeWidth={2}
            style={{ color: "rgba(15,23,42,0.45)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter merchant or reason"
            className="font-mono outline-none bg-transparent"
            style={{
              fontSize: 11.5,
              color: "#0A0A0A",
              minWidth: 180,
            }}
          />
        </div>
      </div>

      {/* List */}
      <div
        className="rounded-[16px] overflow-hidden"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{
                borderColor: "rgba(0,0,0,0.08)",
                borderTopColor: "#0A0A0A",
              }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <Empty hasFindings={findings.length > 0} />
        ) : (
          <AnimatePresence initial={false}>
            {filtered.slice(0, 50).map((f, i) => (
              <FindingRow
                key={f.id}
                f={f}
                isLast={i === Math.min(filtered.length, 50) - 1}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer hint */}
      <p
        className="text-center text-[10.5px]"
        style={{ color: "rgba(15,23,42,0.45)" }}
      >
        Authorization enforced by{" "}
        <a
          href="https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet"
          target="_blank"
          rel="noreferrer"
          className="font-mono hover:underline"
          style={{ color: "rgba(15,23,42,0.65)" }}
        >
          PpmZ…MSqc
        </a>{" "}
        · every refusal is a real failed Solana tx
      </p>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function FilterPill({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: "green" | "amber";
}) {
  const accent =
    tone === "green" ? "#15803D" : tone === "amber" ? "#B45309" : "#0A0A0A";
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium transition-all"
      style={{
        background: active ? "rgba(15,23,42,0.06)" : "transparent",
        color: active ? accent : "rgba(15,23,42,0.55)",
        border: active
          ? "1px solid rgba(15,23,42,0.10)"
          : "1px solid transparent",
      }}
    >
      {label}
      <span
        className="font-mono tabular-nums"
        style={{
          fontSize: 10,
          color: active ? accent : "rgba(15,23,42,0.45)",
        }}
      >
        {count}
      </span>
    </button>
  );
}

function FindingRow({ f, isLast }: { f: Finding; isLast: boolean }) {
  const settled = f.status === "settled" || f.status === "allowed";
  const refused = f.status === "blocked" || f.status === "failed";
  const explorerUrl = f.txSignature
    ? `https://explorer.solana.com/tx/${f.txSignature}?cluster=${f.network}`
    : null;
  const Inner = (
    <div
      className="px-4 py-3 flex items-start gap-3 transition-colors hover:bg-[rgba(15,23,42,0.025)]"
      style={{
        borderBottom: isLast ? undefined : "1px solid rgba(15,23,42,0.04)",
      }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: settled
            ? "rgba(34,197,94,0.10)"
            : refused
              ? "rgba(245,158,11,0.10)"
              : "rgba(15,23,42,0.05)",
          color: settled ? "#15803D" : refused ? "#B45309" : "#6B7280",
        }}
      >
        {settled ? (
          <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.2} />
        ) : refused ? (
          <ShieldX className="w-3.5 h-3.5" strokeWidth={2.2} />
        ) : (
          <Shield className="w-3.5 h-3.5" strokeWidth={2.2} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-mono uppercase tracking-[0.10em]"
            style={{
              fontSize: 9.5,
              color: settled ? "#15803D" : refused ? "#B45309" : "rgba(15,23,42,0.55)",
            }}
          >
            {settled ? "Settled" : refused ? "Refused" : f.status}
          </span>
          <span
            className="font-mono tabular-nums"
            style={{ fontSize: 10.5, color: "rgba(15,23,42,0.45)" }}
          >
            {fmtAbsTime(f.whenMs)}
          </span>
          <span
            className="font-mono tabular-nums"
            style={{ fontSize: 10.5, color: "rgba(15,23,42,0.45)" }}
          >
            ${formatAmt(f.amountUsd)}
          </span>
          <span
            className="font-mono uppercase tracking-[0.10em]"
            style={{ fontSize: 9, color: "rgba(15,23,42,0.40)" }}
          >
            {f.vaultName}
          </span>
        </div>
        <div
          className="text-[12.5px] mt-0.5 truncate"
          style={{ color: "rgba(15,23,42,0.85)" }}
          title={f.merchant}
        >
          {f.merchant}
        </div>
        {f.reason && (
          <div
            className="font-mono text-[10.5px] mt-0.5 truncate"
            style={{ color: "rgba(15,23,42,0.45)" }}
            title={f.reason}
          >
            {f.reason}
          </div>
        )}
      </div>

      {explorerUrl && (
        <ExternalLink
          className="w-3 h-3 flex-shrink-0 mt-1"
          strokeWidth={2}
          style={{ color: "rgba(15,23,42,0.40)" }}
        />
      )}
    </div>
  );
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
    >
      {explorerUrl ? (
        <a href={explorerUrl} target="_blank" rel="noreferrer" className="block">
          {Inner}
        </a>
      ) : (
        Inner
      )}
    </motion.div>
  );
}

function Empty({ hasFindings }: { hasFindings: boolean }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <Shield
        className="w-8 h-8"
        strokeWidth={1.4}
        style={{ color: "rgba(15,23,42,0.20)" }}
      />
      <h3
        className="mt-3 text-[14px] font-semibold tracking-[-0.005em]"
        style={{ color: "#0A0A0A" }}
      >
        {hasFindings ? "No matches" : "No findings yet"}
      </h3>
      <p
        className="mt-1 text-[12px] leading-[1.5] max-w-[400px]"
        style={{ color: "rgba(15,23,42,0.55)" }}
      >
        {hasFindings
          ? "Adjust the filter or clear the search."
          : "Click Watch the chain refuse on the worker card to produce your first refusal — it will land here with a Solana Explorer link."}
      </p>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function parseTs(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string" || raw.length === 0) return 0;
  let ms = Date.parse(raw);
  if (isNaN(ms)) {
    const norm = raw.includes("T") ? raw : raw.replace(" ", "T") + "Z";
    ms = Date.parse(norm);
  }
  return isNaN(ms) ? 0 : ms;
}

function fmtAbsTime(ms: number): string {
  if (!ms) return "--:--";
  const d = new Date(ms);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatAmt(v: number): string {
  if (Math.abs(v) < 0.01) return v.toFixed(3);
  return v.toFixed(2);
}
