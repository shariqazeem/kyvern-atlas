"use client";

/**
 * SkillsField — Sentinel's Configure form.
 *
 *   { skills, min_payout_usd, cadence_minutes }
 *
 * Sentinel uses `skills` as the prompt-shaping input for the Pay.sh /
 * Gemini draft call. `min_payout_usd` filters the ecosystem feed scan.
 * `cadence_minutes` controls how often the worker ticks.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import type { SentinelConfig } from "@/lib/agents/types";

interface Props {
  agentId: string;
  initial: SentinelConfig;
  onSaved?: (next: SentinelConfig) => void;
}

const CADENCES = [5, 10, 30, 60];

export function SkillsField({ agentId, initial, onSaved }: Props) {
  const [skills, setSkills] = useState(initial.skills);
  const [minPayout, setMinPayout] = useState<number>(initial.min_payout_usd);
  const [cadence, setCadence] = useState<number>(initial.cadence_minutes);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            skills: skills.trim(),
            min_payout_usd: Number(minPayout),
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
      onSaved?.(data.config as SentinelConfig);
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Your skills" hint="feeds Pay.sh / Gemini drafting">
        <textarea
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          rows={3}
          placeholder="Solana developer · Rust · TypeScript"
          className="w-full px-3 py-2 rounded-[8px] outline-none resize-none"
          style={{
            fontSize: 13,
            color: "#0A0A0A",
            background: "#FAFAFA",
            border: "1px solid rgba(15,23,42,0.08)",
            lineHeight: 1.5,
          }}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Min payout (USD)">
          <input
            type="number"
            min={50}
            max={100000}
            value={minPayout}
            onChange={(e) => setMinPayout(parseInt(e.target.value || "0", 10))}
            className="w-full px-3 py-2 rounded-[8px] outline-none font-mono tabular-nums"
            style={{
              fontSize: 13,
              color: "#0A0A0A",
              background: "#FAFAFA",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          />
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
      </div>

      <SaveBar
        saving={saving}
        savedAt={savedAt}
        error={error}
        onSave={save}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Shared bits — Field, SaveBar — used by all three configure forms.
   Inlined here for cohesion; could promote to ./shared.tsx later.
   ──────────────────────────────────────────────────────────────────── */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-baseline justify-between">
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ color: "#9CA3AF", fontSize: 9.5 }}
        >
          {label}
        </span>
        {hint && (
          <span
            className="font-mono"
            style={{ color: "rgba(15,23,42,0.45)", fontSize: 9.5 }}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function SaveBar({
  saving,
  savedAt,
  error,
  onSave,
}: {
  saving: boolean;
  savedAt: number | null;
  error: string | null;
  onSave: () => void;
}) {
  const justSaved = savedAt && Date.now() - savedAt < 2400;
  return (
    <div className="flex items-center justify-between gap-3 mt-1">
      <div
        className="font-mono"
        style={{
          fontSize: 11,
          color: error ? "#B45309" : justSaved ? "#15803D" : "transparent",
        }}
      >
        {error
          ? error
          : justSaved
            ? "Saved"
            : "."}
      </div>
      <motion.button
        type="button"
        onClick={onSave}
        disabled={saving}
        whileTap={{ scale: 0.97 }}
        className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-[10px] text-[12.5px] font-semibold tracking-[-0.005em] transition disabled:opacity-60"
        style={{
          background: "#0A0A0A",
          color: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.8)",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.10)",
        }}
      >
        {saving ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
            Saving…
          </>
        ) : (
          <>
            <Check className="w-3.5 h-3.5" strokeWidth={2} />
            Save
          </>
        )}
      </motion.button>
    </div>
  );
}
