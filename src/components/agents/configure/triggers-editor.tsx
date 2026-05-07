"use client";

/**
 * TriggersEditor — Pulse's Configure form.
 *
 *   { triggers[{ id, asset, direction, threshold_usd, amount_usd,
 *                merchant, memo }],
 *     cadence_minutes }
 *
 * Each trigger arms a conditional vault.pay(). When the price crosses
 * the threshold in the chosen direction, Pulse fires the spend through
 * the policy program — chain decides every dollar.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import type { PulseConfig, PulseTrigger } from "@/lib/agents/types";
import { Field, SaveBar } from "./skills-field";

interface Props {
  agentId: string;
  initial: PulseConfig;
  onSaved?: (next: PulseConfig) => void;
}

const CADENCES = [1, 5, 15];
const ASSETS = ["SOL", "JUP", "BONK", "PYTH", "WIF"];

function newTriggerRow(idx: number): PulseTrigger {
  return {
    id: `trg_${Date.now().toString(36)}_${idx}`,
    asset: "SOL",
    direction: "below",
    threshold_usd: 180,
    amount_usd: 5,
    merchant: "api.openai.com",
    memo: "",
  };
}

export function TriggersEditor({ agentId, initial, onSaved }: Props) {
  const [triggers, setTriggers] = useState<PulseTrigger[]>(initial.triggers);
  const [cadence, setCadence] = useState<number>(initial.cadence_minutes);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(idx: number, patch: Partial<PulseTrigger>) {
    setTriggers((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    );
  }
  function remove(idx: number) {
    setTriggers((prev) => prev.filter((_, i) => i !== idx));
  }
  function addRow() {
    if (triggers.length >= 10) return;
    setTriggers((prev) => [...prev, newTriggerRow(prev.length)]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const cleaned = triggers.map((t) => ({
        ...t,
        asset: t.asset.trim().toUpperCase(),
        merchant: t.merchant.trim(),
        memo: t.memo.trim(),
        threshold_usd: Number(t.threshold_usd),
        amount_usd: Number(t.amount_usd),
      }));
      const res = await fetch(`/api/agents/${agentId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            triggers: cleaned,
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
      onSaved?.(data.config as PulseConfig);
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Triggers"
        hint={`${triggers.length} armed · max 10`}
      >
        <div className="flex flex-col gap-2">
          {triggers.length === 0 && (
            <div
              className="rounded-[10px] px-3 py-3 text-center text-[12px]"
              style={{
                color: "#6B7280",
                background: "rgba(15,23,42,0.02)",
                border: "1px dashed rgba(15,23,42,0.10)",
              }}
            >
              No triggers yet. Add one to arm a conditional spend.
            </div>
          )}
          {triggers.map((t, idx) => (
            <div
              key={t.id}
              className="rounded-[10px] p-3 flex flex-col gap-2"
              style={{
                background: "#FAFAFA",
                border: "1px solid rgba(15,23,42,0.06)",
              }}
            >
              <div className="flex items-center gap-2">
                <select
                  value={t.asset}
                  onChange={(e) => update(idx, { asset: e.target.value })}
                  className="px-2.5 py-1.5 rounded-[6px] outline-none text-[12px] font-semibold"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(15,23,42,0.08)",
                    color: "#0A0A0A",
                  }}
                >
                  {ASSETS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <select
                  value={t.direction}
                  onChange={(e) =>
                    update(idx, {
                      direction: e.target.value as "below" | "above",
                    })
                  }
                  className="px-2.5 py-1.5 rounded-[6px] outline-none text-[12px]"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(15,23,42,0.08)",
                    color: "#0A0A0A",
                  }}
                >
                  <option value="below">below</option>
                  <option value="above">above</option>
                </select>
                <input
                  type="number"
                  step="0.0001"
                  min={0}
                  value={t.threshold_usd}
                  onChange={(e) =>
                    update(idx, {
                      threshold_usd: parseFloat(e.target.value || "0"),
                    })
                  }
                  className="flex-1 px-2.5 py-1.5 rounded-[6px] outline-none font-mono tabular-nums"
                  style={{
                    fontSize: 12,
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
              <div className="flex items-center gap-2">
                <span
                  className="font-mono uppercase tracking-[0.14em]"
                  style={{ color: "#9CA3AF", fontSize: 9.5 }}
                >
                  Spend
                </span>
                <input
                  type="number"
                  step="0.01"
                  min={0.001}
                  max={50}
                  value={t.amount_usd}
                  onChange={(e) =>
                    update(idx, {
                      amount_usd: parseFloat(e.target.value || "0"),
                    })
                  }
                  className="px-2.5 py-1.5 rounded-[6px] outline-none font-mono tabular-nums"
                  style={{
                    width: 80,
                    fontSize: 12,
                    background: "#FFFFFF",
                    border: "1px solid rgba(15,23,42,0.08)",
                    color: "#0A0A0A",
                  }}
                />
                <span
                  className="font-mono"
                  style={{ fontSize: 10, color: "rgba(15,23,42,0.45)" }}
                >
                  →
                </span>
                <input
                  type="text"
                  value={t.merchant}
                  onChange={(e) => update(idx, { merchant: e.target.value })}
                  placeholder="api.openai.com"
                  className="flex-1 px-2.5 py-1.5 rounded-[6px] outline-none font-mono"
                  style={{
                    fontSize: 11.5,
                    background: "#FFFFFF",
                    border: "1px solid rgba(15,23,42,0.08)",
                    color: "#0A0A0A",
                  }}
                />
              </div>
              <input
                type="text"
                value={t.memo}
                onChange={(e) => update(idx, { memo: e.target.value })}
                placeholder="Memo (optional)"
                className="w-full px-2.5 py-1.5 rounded-[6px] outline-none"
                style={{
                  fontSize: 11.5,
                  background: "#FFFFFF",
                  border: "1px solid rgba(15,23,42,0.08)",
                  color: "#0A0A0A",
                }}
              />
              {/* Phase 2 (KYVERN_FRONTIER_GRAND_CHAMPION) — chain-enforced
                  swap target. When set, the trigger fires through the
                  Anchor program's swap_via_oracle once Phase 1 is live. */}
              <div className="flex items-center gap-2">
                <span
                  className="font-mono uppercase tracking-[0.14em]"
                  style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
                >
                  Swap into
                </span>
                <select
                  value={t.target_token ?? ""}
                  onChange={(e) =>
                    update(idx, {
                      target_token: e.target.value
                        ? (e.target.value as "SOL" | "kBONK" | "kJUP")
                        : undefined,
                    })
                  }
                  className="px-2.5 py-1.5 rounded-[6px] outline-none text-[11.5px]"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(15,23,42,0.08)",
                    color: "#0A0A0A",
                  }}
                >
                  <option value="">— off —</option>
                  <option value="SOL">SOL</option>
                  <option value="kBONK">kBONK</option>
                  <option value="kJUP">kJUP</option>
                </select>
                {t.target_token && (
                  <span
                    className="font-mono uppercase tracking-[0.12em] rounded-md px-1.5 py-0.5"
                    style={{
                      fontSize: 8.5,
                      color: "#15803D",
                      background: "rgba(34,197,94,0.08)",
                      border: "1px solid rgba(34,197,94,0.20)",
                    }}
                  >
                    Chain-enforced
                  </span>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="rounded-full p-1 hover:bg-black/5 transition"
                  aria-label="Remove trigger"
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
          {triggers.length < 10 && (
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
              Add trigger
            </motion.button>
          )}
        </div>
      </Field>

      <Field label="Poll cadence" hint={`every ${cadence}m`}>
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
