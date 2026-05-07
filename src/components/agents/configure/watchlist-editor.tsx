"use client";

/**
 * WatchlistEditor — Wren's Configure form.
 *
 *   { watchlist[{ address, label, threshold_usd }], cadence_minutes }
 *
 * Wren watches each wallet and pings the owner when a swap clears its
 * per-address threshold. Pay.sh / Gemini does the materiality check.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import type { WrenConfig, WrenWatchEntry } from "@/lib/agents/types";
import { Field, SaveBar } from "./skills-field";

interface Props {
  agentId: string;
  initial: WrenConfig;
  onSaved?: (next: WrenConfig) => void;
}

const CADENCES = [1, 5, 15, 60];

export function WatchlistEditor({ agentId, initial, onSaved }: Props) {
  const [list, setList] = useState<WrenWatchEntry[]>(initial.watchlist);
  const [cadence, setCadence] = useState<number>(initial.cadence_minutes);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(idx: number, patch: Partial<WrenWatchEntry>) {
    setList((prev) =>
      prev.map((w, i) => (i === idx ? { ...w, ...patch } : w)),
    );
  }

  function remove(idx: number) {
    setList((prev) => prev.filter((_, i) => i !== idx));
  }

  function addRow() {
    if (list.length >= 20) return;
    setList((prev) => [
      ...prev,
      { address: "", label: `Wallet ${prev.length + 1}`, threshold_usd: 5000 },
    ]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const cleaned = list
        .map((w) => ({
          address: w.address.trim(),
          label: w.label.trim(),
          threshold_usd: Number(w.threshold_usd),
        }))
        .filter((w) => w.address.length >= 8);
      const res = await fetch(`/api/agents/${agentId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            watchlist: cleaned,
            cadence_minutes: Number(cadence),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(
          (data?.errors && data.errors.join(", ")) || "save failed",
        );
        return;
      }
      setSavedAt(Date.now());
      onSaved?.(data.config as WrenConfig);
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Watchlist"
        hint={`${list.length} address${list.length === 1 ? "" : "es"} · max 20`}
      >
        <div className="flex flex-col gap-2">
          {list.length === 0 && (
            <div
              className="rounded-[10px] px-3 py-3 text-center text-[12px]"
              style={{
                color: "#6B7280",
                background: "rgba(15,23,42,0.02)",
                border: "1px dashed rgba(15,23,42,0.10)",
              }}
            >
              No wallets yet. Add one to start receiving alerts.
            </div>
          )}
          {list.map((w, idx) => (
            <div
              key={idx}
              className="rounded-[10px] p-3 flex flex-col gap-2"
              style={{
                background: "#FAFAFA",
                border: "1px solid rgba(15,23,42,0.06)",
              }}
            >
              <input
                type="text"
                value={w.label}
                onChange={(e) => update(idx, { label: e.target.value })}
                placeholder="Label"
                className="w-full px-2.5 py-1.5 rounded-[6px] outline-none text-[12px] font-semibold"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(15,23,42,0.08)",
                  color: "#0A0A0A",
                }}
              />
              <input
                type="text"
                value={w.address}
                onChange={(e) => update(idx, { address: e.target.value })}
                placeholder="Solana address (base58)"
                spellCheck={false}
                className="w-full px-2.5 py-1.5 rounded-[6px] outline-none font-mono"
                style={{
                  fontSize: 11,
                  background: "#FFFFFF",
                  border: "1px solid rgba(15,23,42,0.08)",
                  color: "#0A0A0A",
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="font-mono uppercase tracking-[0.14em]"
                    style={{ color: "#9CA3AF", fontSize: 9.5 }}
                  >
                    Threshold
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={10_000_000}
                    value={w.threshold_usd}
                    onChange={(e) =>
                      update(idx, {
                        threshold_usd: parseInt(e.target.value || "0", 10),
                      })
                    }
                    className="px-2 py-1 rounded-[6px] outline-none font-mono tabular-nums"
                    style={{
                      width: 96,
                      fontSize: 11.5,
                      background: "#FFFFFF",
                      border: "1px solid rgba(15,23,42,0.08)",
                      color: "#0A0A0A",
                    }}
                  />
                  <span
                    className="font-mono"
                    style={{ fontSize: 10, color: "rgba(15,23,42,0.45)" }}
                  >
                    USD
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="rounded-full p-1 hover:bg-black/5 transition"
                  aria-label="Remove wallet"
                >
                  <Trash2
                    className="w-3.5 h-3.5"
                    strokeWidth={1.8}
                    style={{ color: "rgba(15,23,42,0.55)" }}
                  />
                </button>
              </div>
            </div>
          ))}
          {list.length < 20 && (
            <motion.button
              type="button"
              onClick={addRow}
              whileTap={{ scale: 0.98 }}
              className="rounded-[10px] py-2.5 inline-flex items-center justify-center gap-1.5 transition"
              style={{
                background: "transparent",
                border: "1px dashed rgba(15,23,42,0.18)",
                color: "rgba(15,23,42,0.55)",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />
              Add wallet
            </motion.button>
          )}
        </div>
      </Field>

      <Field label="Cadence" hint={`every ${cadence}m`}>
        <div className="flex gap-1.5">
          {CADENCES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCadence(c)}
              className="flex-1 font-mono uppercase tracking-[0.14em] rounded-[8px] py-2 transition"
              style={{
                fontSize: 9.5,
                color: cadence === c ? "#0A0A0A" : "rgba(15,23,42,0.55)",
                background: cadence === c ? "#FFFFFF" : "transparent",
                border:
                  cadence === c
                    ? "1px solid rgba(15,23,42,0.12)"
                    : "1px solid rgba(15,23,42,0.06)",
              }}
            >
              {c}m
            </button>
          ))}
        </div>
      </Field>

      <SaveBar
        saving={saving}
        savedAt={savedAt}
        error={error}
        onSave={save}
      />
    </div>
  );
}
