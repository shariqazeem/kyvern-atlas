"use client";

/**
 * DeployTab — Tab 2. The device-bay metaphor: this device has 5 bays.
 * Workers occupy them. Empty bays pulse. Tap an empty bay to slot in
 * a tenant.
 *
 *   ┌────┐ ┌────┐ ┌────┐ ┌╌╌╌╌┐ ┌╌╌╌╌┐
 *   │ 🎯 │ │ 🐋 │ │ 📈 │ │ +  │ │ +  │
 *   │ ON │ │ ON │ │ ON │ │EMPT│ │EMPT│
 *   └────┘ └────┘ └────┘ └╌╌╌╌┘ └╌╌╌╌┘
 *
 * Click an empty bay → inline panel below with two co-equal tabs:
 *   1. Pick a preset (3 preset cards)
 *   2. Wrap my own agent (BYO form: name + emoji + job + cadence)
 *
 * On submit → slot fill animation → toast → auto-switch to Tab 1.
 *
 * Replaces the previous "card grid" layout. The chassis metaphor is
 * preserved at the deploy moment, not just in copy.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const TOTAL_BAYS = 5;

const PRESETS: Array<{
  id: string;
  emoji: string;
  name: string;
  oneLine: string;
  template: string;
}> = [
  {
    id: "sentinel",
    emoji: "🎯",
    name: "Sentinel",
    oneLine: "Scans 7 ecosystem feeds. Posts paid jobs on finds ≥$300.",
    template: "bounty_hunter",
  },
  {
    id: "wren",
    emoji: "🐋",
    name: "Wren",
    oneLine: "Tracks whale wallets. Posts intel on $5k+ swaps.",
    template: "whale_tracker",
  },
  {
    id: "pulse",
    emoji: "📈",
    name: "Pulse",
    oneLine: "Reads live DEX prices. Stakes on band breaches.",
    template: "token_pulse",
  },
];

interface OccupiedWorker {
  id: string;
  emoji: string;
  name: string;
}

interface Props {
  deviceId: string | null;
  workers?: OccupiedWorker[];
  onDeployed?: () => void;
  isGuest?: boolean;
  onSignIn?: () => void;
  onOpenSdk?: () => void;
}

type DeployMode = "preset" | "byo";

interface ByoForm {
  name: string;
  emoji: string;
  jobPrompt: string;
  cadence: number; // seconds
}

const BYO_DEFAULTS: ByoForm = {
  name: "My Agent",
  emoji: "🤖",
  jobPrompt:
    "Watch on-chain activity and message me when something interesting happens. Be brief.",
  cadence: 600,
};

export function DeployTab({
  deviceId,
  workers = [],
  onDeployed,
  isGuest,
  onSignIn,
  onOpenSdk,
}: Props) {
  const [openBay, setOpenBay] = useState<number | null>(null);
  const [mode, setMode] = useState<DeployMode>("preset");
  const [deploying, setDeploying] = useState(false);
  const [justFilledBay, setJustFilledBay] = useState<number | null>(null);
  const [justFilledEmoji, setJustFilledEmoji] = useState<string | null>(null);
  const [justFilledName, setJustFilledName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [byo, setByo] = useState<ByoForm>(BYO_DEFAULTS);

  const occupied = workers.slice(0, TOTAL_BAYS);
  const emptyCount = Math.max(0, TOTAL_BAYS - occupied.length);

  function openBayPanel(bayIdx: number) {
    if (isGuest) {
      onSignIn?.();
      return;
    }
    setOpenBay(bayIdx);
    setMode("preset");
    setError(null);
  }

  async function deployPreset(preset: (typeof PRESETS)[number]) {
    if (!deviceId || deploying || openBay === null) return;
    setDeploying(true);
    setError(null);
    try {
      const res = await fetch(`/api/devices/${deviceId}/deploy-preset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: preset.template }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || data?.error || "Deploy failed");
      }
      celebrate(openBay, preset.emoji, preset.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deploy failed");
      setDeploying(false);
    }
  }

  async function deployByo() {
    if (!deviceId || deploying || openBay === null) return;
    if (!byo.name.trim() || !byo.jobPrompt.trim()) {
      setError("name + job description required");
      return;
    }
    setDeploying(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/spawn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          template: "custom",
          name: byo.name.trim(),
          emoji: byo.emoji,
          jobPrompt: byo.jobPrompt.trim(),
          frequencySeconds: byo.cadence,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || data?.error || "Deploy failed");
      }
      celebrate(openBay, byo.emoji, byo.name.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deploy failed");
      setDeploying(false);
    }
  }

  function celebrate(bayIdx: number, emoji: string, name: string) {
    setJustFilledBay(bayIdx);
    setJustFilledEmoji(emoji);
    setJustFilledName(name);
    // Slot-fill animation runs on the bay row, toast slides above the
    // bays, then we auto-switch tabs. ~1.8s total ceremony.
    setTimeout(() => {
      setOpenBay(null);
      setDeploying(false);
      onDeployed?.();
    }, 1800);
  }

  return (
    <div className="relative flex flex-col gap-5">
      {/* CELEBRATION TOAST */}
      <AnimatePresence>
        {justFilledBay !== null && justFilledName && (
          <motion.div
            key="bay-toast"
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="absolute left-1/2 -translate-x-1/2 -top-2 z-30 inline-flex items-center gap-2 rounded-full px-3.5 py-2 pointer-events-none"
            style={{
              background: "#0A0A0A",
              color: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.8)",
              boxShadow:
                "0 8px 28px rgba(15,23,42,0.18), 0 0 0 4px rgba(34,197,94,0.10)",
            }}
          >
            <CheckCircle2
              className="w-4 h-4"
              strokeWidth={2}
              style={{ color: "#86EFAC" }}
            />
            <span className="text-[12px] font-semibold tracking-[-0.005em]">
              {justFilledEmoji} Bay {justFilledBay + 1} online ·{" "}
              {justFilledName} added
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div>
        <div
          className="font-mono uppercase tracking-[0.18em] mb-1"
          style={{ color: "#9CA3AF", fontSize: 10 }}
        >
          Add a worker
        </div>
        <h3
          className="text-[20px] font-semibold tracking-[-0.015em] mb-1"
          style={{ color: "#0A0A0A" }}
        >
          {emptyCount > 0
            ? `Your device has ${emptyCount} open bay${emptyCount === 1 ? "" : "s"}.`
            : "All bays occupied."}
        </h3>
        <p
          className="text-[12.5px] leading-[1.55]"
          style={{ color: "#6B7280" }}
        >
          {isGuest
            ? "Sign in to slot a worker into an empty bay. Every worker runs inside this device under the same Anchor policy program."
            : "Tap an empty bay to slot in a tenant. Pick a preset or wrap your own agent."}
        </p>
      </div>

      {/* BAY ROW — 5 slots, occupied + empty + pulsing */}
      <div
        className="grid gap-2.5"
        style={{
          gridTemplateColumns: `repeat(${TOTAL_BAYS}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: TOTAL_BAYS }).map((_, idx) => {
          const tenant = occupied[idx];
          const isFilledByCelebration = justFilledBay === idx;
          if (tenant) {
            return (
              <BayOccupied
                key={tenant.id}
                emoji={tenant.emoji}
                name={tenant.name}
              />
            );
          }
          if (isFilledByCelebration && justFilledEmoji && justFilledName) {
            return (
              <BayFilling
                key={`filling-${idx}`}
                emoji={justFilledEmoji}
                name={justFilledName}
                bayIdx={idx}
              />
            );
          }
          return (
            <BayEmpty
              key={`empty-${idx}`}
              bayIdx={idx}
              isOpen={openBay === idx}
              onClick={() => openBayPanel(idx)}
              isGuest={isGuest}
            />
          );
        })}
      </div>

      {/* DEPLOY PANEL — slides in below the bay row */}
      <AnimatePresence>
        {openBay !== null && justFilledBay === null && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="overflow-hidden"
          >
            <DeployPanel
              bayIdx={openBay}
              mode={mode}
              setMode={setMode}
              byo={byo}
              setByo={setByo}
              deploying={deploying}
              error={error}
              onClose={() => {
                setOpenBay(null);
                setError(null);
              }}
              onDeployPreset={deployPreset}
              onDeployByo={deployByo}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* SDK SHORTCUT — quiet footer card pointing to Tab 3 Integrate */}
      <button
        type="button"
        onClick={onOpenSdk}
        className="rounded-[14px] p-4 flex items-center justify-between gap-3 text-left transition active:scale-[0.99]"
        style={{
          background:
            "linear-gradient(180deg, #0A0A0A 0%, #1A1A1A 100%)",
          border: "1px solid rgba(15,23,42,0.10)",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="rounded-[10px] flex items-center justify-center flex-shrink-0 font-mono"
            style={{
              width: 40,
              height: 40,
              fontSize: 16,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "#86EFAC",
            }}
          >
            {"</>"}
          </div>
          <div className="min-w-0">
            <div
              className="text-[13.5px] font-semibold tracking-[-0.005em]"
              style={{ color: "#FFFFFF" }}
            >
              Already have an agent running elsewhere?
            </div>
            <div
              className="text-[11.5px]"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Wrap it in 5 lines · SDK + Pay.sh
            </div>
          </div>
        </div>
        <ArrowRight
          className="w-4 h-4 flex-shrink-0"
          style={{ color: "rgba(255,255,255,0.65)" }}
          strokeWidth={2}
        />
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Bay components
   ──────────────────────────────────────────────────────────────────── */

function BayOccupied({ emoji, name }: { emoji: string; name: string }) {
  return (
    <div
      className="rounded-[14px] aspect-square flex flex-col items-center justify-center p-1"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <div
        className="rounded-[10px] flex items-center justify-center mb-1"
        style={{
          width: 38,
          height: 38,
          fontSize: 24,
          background:
            "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
          border: "1px solid rgba(15,23,42,0.06)",
        }}
      >
        {emoji}
      </div>
      <span
        className="text-[10px] font-semibold tracking-[-0.005em] truncate w-full text-center px-1"
        style={{ color: "#0A0A0A" }}
      >
        {name}
      </span>
      <span
        className="font-mono uppercase tracking-[0.14em]"
        style={{ fontSize: 7.5, color: "#15803D" }}
      >
        Online
      </span>
    </div>
  );
}

function BayEmpty({
  bayIdx,
  isOpen,
  onClick,
  isGuest,
}: {
  bayIdx: number;
  isOpen: boolean;
  onClick: () => void;
  isGuest?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="rounded-[14px] aspect-square flex flex-col items-center justify-center p-1 transition"
      style={{
        background: isOpen ? "rgba(34,197,94,0.04)" : "transparent",
        border: isOpen
          ? "1.5px dashed rgba(34,197,94,0.45)"
          : "1.5px dashed rgba(15,23,42,0.18)",
      }}
      animate={
        isOpen
          ? { boxShadow: "0 0 0 3px rgba(34,197,94,0.10)" }
          : {
              boxShadow: [
                "0 0 0 0 rgba(34,197,94,0.0)",
                "0 0 0 3px rgba(34,197,94,0.06)",
                "0 0 0 0 rgba(34,197,94,0.0)",
              ],
            }
      }
      transition={
        isOpen
          ? { duration: 0.3 }
          : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <div
        className="rounded-[10px] flex items-center justify-center mb-1"
        style={{
          width: 38,
          height: 38,
          background: "transparent",
          border: "1px dashed rgba(15,23,42,0.18)",
        }}
      >
        <Plus
          className="w-4 h-4"
          strokeWidth={1.6}
          style={{ color: "rgba(15,23,42,0.45)" }}
        />
      </div>
      <span
        className="font-mono uppercase tracking-[0.14em] mb-0.5"
        style={{ fontSize: 8, color: "rgba(15,23,42,0.40)" }}
      >
        Bay {bayIdx + 1}
      </span>
      <span
        className="font-mono uppercase tracking-[0.12em]"
        style={{
          fontSize: 7.5,
          color: isGuest ? "#B45309" : "rgba(15,23,42,0.55)",
        }}
      >
        {isGuest ? "Sign in" : "Empty"}
      </span>
    </motion.button>
  );
}

function BayFilling({
  emoji,
  name,
  bayIdx,
}: {
  emoji: string;
  name: string;
  bayIdx: number;
}) {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{
        duration: 0.55,
        ease: EASE,
        type: "spring",
        damping: 14,
      }}
      className="rounded-[14px] aspect-square flex flex-col items-center justify-center p-1 relative overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(34,197,94,0.40)",
        boxShadow:
          "inset 0 0 0 2px rgba(34,197,94,0.20), 0 8px 24px -8px rgba(34,197,94,0.40)",
      }}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.2, ease: EASE }}
        style={{
          background:
            "radial-gradient(closest-side, rgba(34,197,94,0.18) 0%, transparent 80%)",
        }}
      />
      <div
        className="rounded-[10px] flex items-center justify-center mb-1"
        style={{
          width: 38,
          height: 38,
          fontSize: 24,
          background:
            "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
          border: "1px solid rgba(34,197,94,0.30)",
        }}
      >
        {emoji}
      </div>
      <span
        className="text-[10px] font-semibold tracking-[-0.005em] truncate w-full text-center px-1"
        style={{ color: "#0A0A0A" }}
      >
        {name}
      </span>
      <span
        className="font-mono uppercase tracking-[0.14em]"
        style={{ fontSize: 7.5, color: "#15803D" }}
      >
        Bay {bayIdx + 1} online
      </span>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Deploy panel — preset + BYO toggle
   ──────────────────────────────────────────────────────────────────── */

function DeployPanel({
  bayIdx,
  mode,
  setMode,
  byo,
  setByo,
  deploying,
  error,
  onClose,
  onDeployPreset,
  onDeployByo,
}: {
  bayIdx: number;
  mode: DeployMode;
  setMode: (m: DeployMode) => void;
  byo: ByoForm;
  setByo: (b: ByoForm) => void;
  deploying: boolean;
  error: string | null;
  onClose: () => void;
  onDeployPreset: (p: (typeof PRESETS)[number]) => void;
  onDeployByo: () => void;
}) {
  return (
    <div
      className="rounded-[16px] p-4"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
      }}
    >
      {/* HEADER */}
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <div
            className="font-mono uppercase tracking-[0.16em] mb-1"
            style={{ color: "#9CA3AF", fontSize: 10 }}
          >
            Bay {bayIdx + 1}
          </div>
          <h4
            className="text-[16px] font-semibold tracking-[-0.005em]"
            style={{ color: "#0A0A0A" }}
          >
            Put a tenant in this slot.
          </h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 hover:bg-black/5 transition"
        >
          <X
            className="w-4 h-4"
            strokeWidth={1.8}
            style={{ color: "rgba(15,23,42,0.55)" }}
          />
        </button>
      </div>

      {/* MODE TOGGLE — co-equal preset / BYO */}
      <div
        className="inline-flex items-center gap-1 rounded-[10px] p-1 mb-4"
        style={{
          background: "rgba(15,23,42,0.04)",
          border: "1px solid rgba(15,23,42,0.06)",
        }}
      >
        <ModeButton
          active={mode === "preset"}
          onClick={() => setMode("preset")}
          label="Pick a preset"
          sub="3 starters"
        />
        <ModeButton
          active={mode === "byo"}
          onClick={() => setMode("byo")}
          label="Wrap my own agent"
          sub="bring your code"
        />
      </div>

      {/* PRESET MODE */}
      {mode === "preset" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {PRESETS.map((p) => (
            <motion.button
              key={p.id}
              type="button"
              onClick={() => onDeployPreset(p)}
              disabled={deploying}
              whileTap={{ scale: 0.98 }}
              className="rounded-[12px] p-3.5 flex flex-col items-start text-left transition disabled:opacity-60"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
              }}
            >
              <div
                className="rounded-[10px] flex items-center justify-center mb-2"
                style={{
                  width: 44,
                  height: 44,
                  fontSize: 26,
                  background:
                    "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
                  border: "1px solid rgba(15,23,42,0.06)",
                }}
              >
                {p.emoji}
              </div>
              <div
                className="text-[14px] font-semibold tracking-[-0.005em] mb-0.5"
                style={{ color: "#0A0A0A" }}
              >
                {p.name}
              </div>
              <p
                className="text-[11.5px] leading-[1.4] mb-2 flex-1"
                style={{ color: "#6B7280" }}
              >
                {p.oneLine}
              </p>
              <div
                className="w-full inline-flex items-center justify-between font-mono uppercase tracking-[0.14em] mt-auto"
                style={{ fontSize: 9, color: "#15803D" }}
              >
                <span>Slot into bay {bayIdx + 1}</span>
                <ArrowRight className="w-3 h-3" strokeWidth={2} />
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* BYO MODE */}
      {mode === "byo" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-[60px_1fr] gap-2">
            <Field label="Emoji">
              <input
                type="text"
                value={byo.emoji}
                onChange={(e) =>
                  setByo({ ...byo, emoji: e.target.value.slice(0, 4) })
                }
                className="w-full px-3 py-2 rounded-[8px] outline-none text-center"
                style={{
                  fontSize: 18,
                  background: "#FAFAFA",
                  border: "1px solid rgba(15,23,42,0.08)",
                }}
              />
            </Field>
            <Field label="Name">
              <input
                type="text"
                value={byo.name}
                onChange={(e) => setByo({ ...byo, name: e.target.value })}
                placeholder="My Agent"
                className="w-full px-3 py-2 rounded-[8px] outline-none"
                style={{
                  fontSize: 13,
                  color: "#0A0A0A",
                  background: "#FAFAFA",
                  border: "1px solid rgba(15,23,42,0.08)",
                }}
              />
            </Field>
          </div>

          <Field
            label="Job · what should it do?"
            hint="plain English"
          >
            <textarea
              value={byo.jobPrompt}
              onChange={(e) =>
                setByo({ ...byo, jobPrompt: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 rounded-[8px] outline-none resize-none"
              style={{
                fontSize: 12.5,
                color: "#0A0A0A",
                background: "#FAFAFA",
                border: "1px solid rgba(15,23,42,0.08)",
                lineHeight: 1.5,
              }}
            />
          </Field>

          <Field label="Cadence" hint={`every ${byo.cadence}s`}>
            <div className="flex gap-1.5">
              {[60, 180, 600, 1800].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setByo({ ...byo, cadence: c })}
                  className="flex-1 font-mono uppercase tracking-[0.14em] rounded-[8px] py-1.5 transition"
                  style={{
                    fontSize: 9.5,
                    color:
                      byo.cadence === c ? "#0A0A0A" : "rgba(15,23,42,0.55)",
                    background:
                      byo.cadence === c ? "#FFFFFF" : "transparent",
                    border:
                      byo.cadence === c
                        ? "1px solid rgba(15,23,42,0.12)"
                        : "1px solid rgba(15,23,42,0.06)",
                  }}
                >
                  {c < 120 ? `${c}s` : `${Math.round(c / 60)}m`}
                </button>
              ))}
            </div>
          </Field>

          <motion.button
            type="button"
            onClick={onDeployByo}
            disabled={deploying}
            whileTap={{ scale: 0.98 }}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-[10px] text-[13px] font-semibold tracking-[-0.005em] transition disabled:opacity-60"
            style={{
              background: "#0A0A0A",
              color: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.8)",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.10)",
            }}
          >
            {deploying ? (
              <>
                <Loader2
                  className="w-4 h-4 animate-spin"
                  strokeWidth={2}
                />
                Slotting into bay {bayIdx + 1}…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" strokeWidth={2} />
                Slot into bay {bayIdx + 1}
              </>
            )}
          </motion.button>
        </div>
      )}

      {error && (
        <p
          className="font-mono mt-3 px-1"
          style={{ color: "#B45309", fontSize: 11 }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[8px] px-3 py-1.5 transition active:scale-[0.97]"
      style={{
        background: active ? "#FFFFFF" : "transparent",
        boxShadow: active
          ? "0 1px 2px rgba(15,23,42,0.06), 0 4px 10px -4px rgba(15,23,42,0.08)"
          : "none",
      }}
    >
      <div
        className="text-[12px] font-semibold tracking-[-0.005em]"
        style={{
          color: active ? "#0A0A0A" : "rgba(15,23,42,0.55)",
        }}
      >
        {label}
      </div>
      <div
        className="font-mono uppercase tracking-[0.12em]"
        style={{
          fontSize: 8.5,
          color: active ? "rgba(15,23,42,0.50)" : "rgba(15,23,42,0.40)",
        }}
      >
        {sub}
      </div>
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
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
