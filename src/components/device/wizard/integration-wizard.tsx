"use client";

/**
 * IntegrationWizard — five-step Apple-Settings flow that ships in the
 * left column of AliveConsole per TRANSFORM_24H §T2.
 *
 *   1. Mint your key            (kv_live_… revealed once, Copy)
 *   2. Install                  (npx scaffolder + npm SDK)
 *   3. Make your first call     (paste-and-run snippet w/ key inlined)
 *   4. Try a violation          (3 buttons → user's vault, blocked tx
 *                                lands in the event feed)
 *   5. Send earnings to KAST    (paste address + test $0.001 payout)
 *
 * Each step has 3 visual states:
 *   · locked    — dimmed, lock icon, no interaction
 *   · active    — full card, soft glow, "now" pill
 *   · complete  — collapsed to a single row with green check + "done X ago"
 *
 * Progress persists to /api/vault/[id]/integration-progress and
 * survives refreshes.
 */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Copy,
  Eye,
  Loader2,
  Lock,
  Play,
  Sparkles,
  Terminal,
} from "lucide-react";
import type {
  WizardStepKey,
  ProgressMap,
} from "@/app/api/vault/[id]/integration-progress/route";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const STEP_ORDER: WizardStepKey[] = [
  "mint_key",
  "install",
  "first_call",
  "try_violation",
  "kast_payout",
];

const STEP_TITLES: Record<WizardStepKey, string> = {
  mint_key: "Mint your key",
  install: "Install",
  first_call: "Make your first call",
  try_violation: "Try a violation",
  kast_payout: "Send earnings to KAST",
};

interface Props {
  vaultId: string | null;
  ownerWallet: string | null;
  className?: string;
  /** Called when a step is freshly marked complete. */
  onStepComplete?: (step: WizardStepKey) => void;
}

export function IntegrationWizard({
  vaultId,
  ownerWallet,
  className,
  onStepComplete,
}: Props) {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loading, setLoading] = useState(true);

  // Hydrate progress on mount
  useEffect(() => {
    if (!vaultId || !ownerWallet) return;
    let cancelled = false;
    void fetch(`/api/vault/${vaultId}/integration-progress`, {
      headers: { "x-owner-wallet": ownerWallet },
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.ok && d?.progress) setProgress(d.progress as ProgressMap);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vaultId, ownerWallet]);

  const markComplete = useCallback(
    async (step: WizardStepKey) => {
      if (progress[step]) return; // idempotent
      if (!vaultId || !ownerWallet) return;
      // Optimistic
      setProgress((prev) => ({
        ...prev,
        [step]: { completedAt: new Date().toISOString() },
      }));
      try {
        const r = await fetch(
          `/api/vault/${vaultId}/integration-progress`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-owner-wallet": ownerWallet,
            },
            body: JSON.stringify({ step }),
          },
        );
        const d = await r.json();
        if (d?.ok && d?.progress) setProgress(d.progress as ProgressMap);
      } catch {
        // optimistic state stays — next mount re-syncs
      }
      onStepComplete?.(step);
    },
    [progress, vaultId, ownerWallet, onStepComplete],
  );

  // Active step = first one that's not complete.
  const activeStep =
    STEP_ORDER.find((s) => !progress[s]) ?? null;

  return (
    <div
      className={`flex flex-col rounded-[14px] overflow-hidden ${className ?? ""}`}
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles
            className="w-3.5 h-3.5"
            strokeWidth={2}
            style={{ color: "#0A0A0A" }}
          />
          <h3
            className="text-[13px] font-semibold tracking-[-0.005em]"
            style={{ color: "#0A0A0A" }}
          >
            Integrate
          </h3>
        </div>
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9, color: "#9CA3AF" }}
        >
          {Object.keys(progress).length}/{STEP_ORDER.length}
        </span>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 420 }}>
        {loading ? (
          <div className="flex items-center justify-center px-6 py-10 h-full">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#9CA3AF" }} />
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "rgba(15,23,42,0.05)" }}>
            {STEP_ORDER.map((key, i) => (
              <WizardStep
                key={key}
                stepKey={key}
                index={i + 1}
                title={STEP_TITLES[key]}
                completed={!!progress[key]}
                completedAt={progress[key]?.completedAt ?? null}
                isActive={activeStep === key}
                vaultId={vaultId}
                ownerWallet={ownerWallet}
                markComplete={markComplete}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Step shell — handles state transitions + state-specific bodies
   ────────────────────────────────────────────────────────────────── */

function WizardStep({
  stepKey,
  index,
  title,
  completed,
  completedAt,
  isActive,
  vaultId,
  ownerWallet,
  markComplete,
}: {
  stepKey: WizardStepKey;
  index: number;
  title: string;
  completed: boolean;
  completedAt: string | null;
  isActive: boolean;
  vaultId: string | null;
  ownerWallet: string | null;
  markComplete: (step: WizardStepKey) => void;
}) {
  const locked = !completed && !isActive;

  if (completed) {
    return (
      <li
        className="px-3.5 py-2.5 flex items-center gap-3"
        style={{ background: "rgba(34,197,94,0.04)" }}
      >
        <span
          className="w-5 h-5 rounded-full inline-flex items-center justify-center flex-shrink-0"
          style={{
            background: "#15803D",
            color: "#FFFFFF",
          }}
        >
          <Check className="w-3 h-3" strokeWidth={3} />
        </span>
        <span
          className="text-[12.5px] font-medium tracking-[-0.005em] flex-1"
          style={{ color: "#0A0A0A" }}
        >
          {index}. {title}
        </span>
        <span
          className="font-mono uppercase tracking-[0.14em] flex-shrink-0"
          style={{ fontSize: 9, color: "#15803D" }}
        >
          {completedAt ? agoLabel(completedAt) : "done"}
        </span>
      </li>
    );
  }

  if (locked) {
    return (
      <li
        className="px-3.5 py-2.5 flex items-center gap-3"
        style={{ opacity: 0.5 }}
      >
        <span
          className="w-5 h-5 rounded-full inline-flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(15,23,42,0.06)",
            color: "#9CA3AF",
          }}
        >
          <Lock className="w-2.5 h-2.5" strokeWidth={2.5} />
        </span>
        <span
          className="text-[12.5px] font-medium tracking-[-0.005em] flex-1"
          style={{ color: "#9CA3AF" }}
        >
          {index}. {title}
        </span>
      </li>
    );
  }

  // ACTIVE
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="px-3.5 py-3"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, rgba(34,197,94,0.04) 100%)",
        boxShadow: "inset 3px 0 0 #15803D",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-5 h-5 rounded-full inline-flex items-center justify-center flex-shrink-0 font-mono"
          style={{
            background: "#0A0A0A",
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {index}
        </span>
        <span
          className="text-[13px] font-semibold tracking-[-0.005em] flex-1"
          style={{ color: "#0A0A0A" }}
        >
          {title}
        </span>
        <span
          className="font-mono uppercase tracking-[0.14em] rounded-full px-1.5 py-0.5 flex-shrink-0"
          style={{
            fontSize: 8.5,
            color: "#15803D",
            background: "rgba(34,197,94,0.10)",
            border: "1px solid rgba(34,197,94,0.18)",
          }}
        >
          now
        </span>
      </div>
      <StepBody
        stepKey={stepKey}
        vaultId={vaultId}
        ownerWallet={ownerWallet}
        markComplete={() => markComplete(stepKey)}
      />
    </motion.li>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Per-step bodies
   ────────────────────────────────────────────────────────────────── */

function StepBody({
  stepKey,
  vaultId,
  ownerWallet,
  markComplete,
}: {
  stepKey: WizardStepKey;
  vaultId: string | null;
  ownerWallet: string | null;
  markComplete: () => void;
}) {
  switch (stepKey) {
    case "mint_key":
      return <MintKeyBody vaultId={vaultId} markComplete={markComplete} />;
    case "install":
      return <InstallBody markComplete={markComplete} />;
    case "first_call":
      return <FirstCallBody vaultId={vaultId} markComplete={markComplete} />;
    case "try_violation":
      return (
        <ViolationBody
          vaultId={vaultId}
          ownerWallet={ownerWallet}
          markComplete={markComplete}
        />
      );
    case "kast_payout":
      return (
        <KastPayoutBody
          vaultId={vaultId}
          ownerWallet={ownerWallet}
          markComplete={markComplete}
        />
      );
  }
}

/* ── Step 1 — Mint key ─────────────────────────────────────────── */

function MintKeyBody({
  vaultId,
  markComplete,
}: {
  vaultId: string | null;
  markComplete: () => void;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [prefix, setPrefix] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!vaultId) return;
    void fetch(`/api/devices/${vaultId}/agent-key`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.keyPrefix) setPrefix(d.keyPrefix);
      })
      .catch(() => {});
  }, [vaultId]);

  async function mint() {
    if (!vaultId || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/devices/${vaultId}/agent-key`, {
        method: "POST",
      });
      if (r.ok) {
        const d = await r.json();
        // Endpoint returns rawKey on POST (per /api/devices/[id]/agent-key).
        // Tolerate both names defensively in case the contract drifts.
        const fresh = d?.rawKey ?? d?.fullKey;
        if (fresh) {
          setRevealed(fresh);
          setPrefix(d?.keyPrefix ?? fresh.slice(0, 14));
        }
      }
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!revealed) return;
    void navigator.clipboard.writeText(revealed);
    setCopied(true);
    markComplete();
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-2 ml-7">
      <p className="text-[12px] leading-[1.5]" style={{ color: "#6B7280" }}>
        Server-signed `kv_live_…` key. Shown <strong>once</strong> — copy it
        now or regenerate later.
      </p>
      {revealed ? (
        <div
          className="rounded-[10px] p-2.5 flex items-center justify-between gap-2"
          style={{
            background: "#0A0A0A",
            border: "1px solid rgba(15,23,42,0.20)",
          }}
        >
          <code
            className="font-mono truncate"
            style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5 }}
          >
            {revealed}
          </code>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] flex-shrink-0"
            style={{
              fontSize: 9,
              color: copied ? "#86EFAC" : "rgba(255,255,255,0.55)",
            }}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" strokeWidth={2.5} />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" strokeWidth={2} />
                Copy
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span
            className="font-mono text-[11.5px] truncate"
            style={{ color: prefix ? "#0A0A0A" : "rgba(15,23,42,0.55)" }}
          >
            {prefix ? `${prefix}…` : "no key minted yet"}
          </span>
          <button
            type="button"
            onClick={mint}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 font-mono uppercase tracking-[0.14em] flex-shrink-0 disabled:opacity-50 transition active:scale-[0.97]"
            style={{
              fontSize: 9.5,
              color: "#FFFFFF",
              background: "#0A0A0A",
              border: "1px solid rgba(0,0,0,0.85)",
            }}
          >
            {busy ? "Minting…" : prefix ? <><Eye className="w-3 h-3" />Regenerate</> : <>Mint a key<ArrowRight className="w-3 h-3" /></>}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Step 2 — Install ─────────────────────────────────────────── */

function InstallBody({ markComplete }: { markComplete: () => void }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedSet, setCopiedSet] = useState<Set<string>>(new Set());

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setCopiedSet((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setTimeout(() => setCopiedKey(null), 1500);
  }

  // Don't auto-advance the wizard on first copy — the user usually
  // wants to copy BOTH commands. Show a manual Continue once they've
  // copied at least one. Auto-advance on the second copy is fine.
  const bothCopied = copiedSet.has("scaffold") && copiedSet.has("sdk");
  const canContinue = copiedSet.size > 0;

  function continueToNext() {
    markComplete();
  }

  // Auto-advance once both are copied (a small UX win — no extra click)
  useEffect(() => {
    if (bothCopied) markComplete();
  }, [bothCopied, markComplete]);

  return (
    <div className="flex flex-col gap-1.5 ml-7">
      <CmdLine
        cmd="npx create-kyvern-agent my-agent"
        copied={copiedKey === "scaffold"}
        onCopy={() => copy("npx create-kyvern-agent my-agent", "scaffold")}
      />
      <CmdLine
        cmd="npm install @kyvernlabs/sdk"
        copied={copiedKey === "sdk"}
        onCopy={() => copy("npm install @kyvernlabs/sdk", "sdk")}
      />
      {canContinue && !bothCopied && (
        <button
          type="button"
          onClick={continueToNext}
          className="self-end inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] hover:opacity-80 transition mt-1"
          style={{ fontSize: 9.5, color: "#15803D" }}
        >
          Continue
          <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

function CmdLine({
  cmd,
  copied,
  onCopy,
}: {
  cmd: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div
      className="rounded-[10px] px-2.5 py-1.5 flex items-center justify-between gap-2"
      style={{
        background: "#0A0A0A",
        border: "1px solid rgba(15,23,42,0.20)",
      }}
    >
      <code
        className="font-mono truncate"
        style={{ color: "rgba(255,255,255,0.92)", fontSize: 11 }}
      >
        <span style={{ color: "rgba(255,255,255,0.45)" }}>$ </span>
        {cmd}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center gap-0.5 font-mono uppercase tracking-[0.14em] flex-shrink-0"
        style={{ fontSize: 8.5, color: copied ? "#86EFAC" : "rgba(255,255,255,0.45)" }}
      >
        {copied ? (
          <>
            <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
            Copied
          </>
        ) : (
          <>
            <Copy className="w-2.5 h-2.5" strokeWidth={2} />
            Copy
          </>
        )}
      </button>
    </div>
  );
}

/* ── Step 3 — First call ───────────────────────────────────────── */

function FirstCallBody({
  vaultId,
  markComplete,
}: {
  vaultId: string | null;
  markComplete: () => void;
}) {
  const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!vaultId) return;
    void fetch(`/api/devices/${vaultId}/agent-key`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.keyPrefix) setKeyPrefix(d.keyPrefix);
      })
      .catch(() => {});
  }, [vaultId]);

  const snippet = `import { Vault } from "@kyvernlabs/sdk";
const vault = new Vault({ agentKey: ${keyPrefix ? `"${keyPrefix}…"` : `process.env.KYVERN_AGENT_KEY!`} });
const ok = await vault.checkAllowance({ merchant: "api.openai.com", amount: 0.05 });`;

  function copy() {
    void navigator.clipboard.writeText(snippet);
    setCopied(true);
    markComplete();
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-2 ml-7">
      <p className="text-[12px] leading-[1.5]" style={{ color: "#6B7280" }}>
        Three lines. The vault decides <strong>before</strong> any rail fires.
      </p>
      <div
        className="rounded-[10px] overflow-hidden"
        style={{
          background: "#0A0A0A",
          border: "1px solid rgba(15,23,42,0.20)",
        }}
      >
        <div
          className="flex items-center justify-between px-2.5 py-1.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{ fontSize: 8.5, color: "rgba(255,255,255,0.45)" }}
          >
            <Terminal className="w-2.5 h-2.5 inline mr-1" />
            agent.ts
          </span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-0.5 font-mono uppercase tracking-[0.14em]"
            style={{
              fontSize: 8.5,
              color: copied ? "#86EFAC" : "rgba(255,255,255,0.55)",
            }}
          >
            {copied ? (
              <>
                <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-2.5 h-2.5" strokeWidth={2} />
                Copy
              </>
            )}
          </button>
        </div>
        <pre
          className="px-2.5 py-2 font-mono whitespace-pre overflow-x-auto"
          style={{
            color: "rgba(255,255,255,0.92)",
            fontSize: 10.5,
            lineHeight: 1.55,
          }}
        >
{snippet}
        </pre>
      </div>
    </div>
  );
}

/* ── Step 4 — Try a violation ─────────────────────────────────── */

function ViolationBody({
  vaultId,
  ownerWallet,
  markComplete,
}: {
  vaultId: string | null;
  ownerWallet: string | null;
  markComplete: () => void;
}) {
  const [running, setRunning] = useState<string | null>(null);
  const [lastSig, setLastSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fire(scenario: string) {
    if (!vaultId || !ownerWallet || running) return;
    setRunning(scenario);
    setError(null);
    setLastSig(null);
    try {
      const r = await fetch("/api/atlas/probe-scenarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-wallet": ownerWallet,
        },
        body: JSON.stringify({ scenario, vaultId }),
      });
      const d = await r.json();
      if (d?.signature) {
        setLastSig(d.signature);
        markComplete();
      } else if (d?.error) {
        setError(d?.message ?? d?.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setRunning(null);
    }
  }

  // Wait for useAuth to hydrate before allowing fires — the wallet
  // header has to match vault.ownerWallet on the server, and a
  // pre-hydration request lacks the header entirely (401).
  const ready = !!vaultId && !!ownerWallet;

  return (
    <div className="flex flex-col gap-2 ml-7">
      <p className="text-[12px] leading-[1.5]" style={{ color: "#6B7280" }}>
        {ready
          ? "Each button submits a real Solana tx that the chain refuses. Watch the event feed →"
          : "Hydrating auth — buttons unlock in a second."}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <ViolationBtn
          label="Over-cap $5"
          running={running === "amount_exceeds_per_tx"}
          disabled={!ready}
          onClick={() => fire("amount_exceeds_per_tx")}
        />
        <ViolationBtn
          label="Off-allowlist"
          running={running === "merchant_not_allowed"}
          disabled={!ready}
          onClick={() => fire("merchant_not_allowed")}
        />
        <ViolationBtn
          label="Missing memo"
          running={running === "missing_memo"}
          disabled={!ready}
          onClick={() => fire("missing_memo")}
        />
      </div>
      {lastSig && (
        <a
          href={`https://explorer.solana.com/tx/${lastSig}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[10.5px] hover:underline"
          style={{ color: "#15803D" }}
        >
          ✓ {lastSig.slice(0, 8)}…{lastSig.slice(-6)} on Explorer
        </a>
      )}
      {error && (
        <p className="text-[11px]" style={{ color: "#B45309" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function ViolationBtn({
  label,
  running,
  disabled,
  onClick,
}: {
  label: string;
  running: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={running || disabled}
      className="inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1 font-mono uppercase tracking-[0.14em] disabled:opacity-60 transition active:scale-[0.97]"
      style={{
        fontSize: 9.5,
        color: "#B91C1C",
        background: "rgba(220,38,38,0.06)",
        border: "1px solid rgba(220,38,38,0.18)",
      }}
    >
      {running ? (
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
      ) : (
        <Play className="w-2.5 h-2.5" strokeWidth={2.2} />
      )}
      {label}
    </button>
  );
}

/* ── Step 5 — KAST payout ─────────────────────────────────────── */

function KastPayoutBody({
  vaultId,
  ownerWallet,
  markComplete,
}: {
  vaultId: string | null;
  ownerWallet: string | null;
  markComplete: () => void;
}) {
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test-payout state
  const [paying, setPaying] = useState(false);
  const [paySig, setPaySig] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // Hydrate
  useEffect(() => {
    if (!vaultId || !ownerWallet) return;
    void fetch(`/api/vault/${vaultId}/set-kast-destination`, {
      headers: { "x-owner-wallet": ownerWallet },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d?.address) {
          setAddress(d.address);
          setSaved(true);
        }
      })
      .catch(() => {});
  }, [vaultId, ownerWallet]);

  async function save() {
    if (!vaultId || !ownerWallet || !address || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/vault/${vaultId}/set-kast-destination`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-wallet": ownerWallet,
        },
        body: JSON.stringify({ address, ownerWallet }),
      });
      const d = await r.json();
      if (d?.ok) {
        setSaved(true);
      } else {
        setError(d?.message ?? d?.error ?? "save failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setBusy(false);
    }
  }

  async function testPayout() {
    if (!vaultId || !ownerWallet || !saved || paying) return;
    setPaying(true);
    setPayError(null);
    setPaySig(null);
    try {
      const r = await fetch(`/api/vault/${vaultId}/test-payout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-wallet": ownerWallet,
        },
        body: JSON.stringify({ ownerWallet, amountUsd: 0.001 }),
      });
      const d = await r.json();
      if (d?.ok && d?.signature) {
        setPaySig(d.signature);
        markComplete();
      } else {
        setPayError(
          d?.reason ??
            d?.message ??
            d?.error ??
            "Payout failed. Top up your vault first.",
        );
      }
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "request failed");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 ml-7">
      <p className="text-[12px] leading-[1.5]" style={{ color: "#6B7280" }}>
        Allowlist your KAST USDC deposit address as <code>MY_KAST</code>.
        From then on, every <code>vault.pay()</code> your agent makes to
        that address is a real on-chain transfer that funds your card.
      </p>
      <input
        value={address}
        onChange={(e) => {
          setAddress(e.target.value);
          setSaved(false);
        }}
        placeholder="KAST app · Deposit · Solana USDC"
        className="font-mono text-[11.5px] rounded-[10px] px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-orange-200"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.10)",
        }}
      />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <a
          href="https://go.kast.xyz/VqVO/STPAK"
          target="_blank"
          rel="noreferrer"
          className="font-mono uppercase tracking-[0.14em] hover:underline"
          style={{ fontSize: 9, color: "#EA580C" }}
        >
          Don&apos;t have KAST? Get one →
        </a>
        <button
          type="button"
          onClick={save}
          disabled={!address || saved || busy}
          className="inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1 font-mono uppercase tracking-[0.14em] disabled:opacity-50 transition active:scale-[0.97]"
          style={{
            fontSize: 9.5,
            color: "#FFFFFF",
            background: saved ? "#15803D" : "#0A0A0A",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          {saved ? (
            <>
              <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
              Allowlisted
            </>
          ) : busy ? (
            "Saving…"
          ) : (
            <>
              Allowlist as MY_KAST
              <ArrowRight className="w-2.5 h-2.5" />
            </>
          )}
        </button>
      </div>
      {error && (
        <p className="text-[10.5px]" style={{ color: "#B45309" }}>
          {error}
        </p>
      )}

      {/* Test $0.001 payout — only available after allowlist saves. */}
      {saved && (
        <div
          className="mt-2 rounded-[10px] p-2.5 flex flex-col gap-1.5"
          style={{
            background: "rgba(34,197,94,0.04)",
            border: "1px solid rgba(34,197,94,0.18)",
          }}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span
              className="font-mono uppercase tracking-[0.14em]"
              style={{ fontSize: 9.5, color: "#15803D" }}
            >
              Verify the rail
            </span>
            <button
              type="button"
              onClick={testPayout}
              disabled={paying || !!paySig}
              className="inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1 font-mono uppercase tracking-[0.14em] disabled:opacity-50 transition active:scale-[0.97]"
              style={{
                fontSize: 9.5,
                color: "#FFFFFF",
                background: paySig ? "#15803D" : "#0A0A0A",
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              {paying ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : paySig ? (
                <>
                  <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
                  Payout settled
                </>
              ) : (
                <>
                  Test $0.001 payout
                  <ArrowRight className="w-2.5 h-2.5" />
                </>
              )}
            </button>
          </div>
          <p className="text-[10.5px]" style={{ color: "#6B7280" }}>
            Sends <strong>$0.001 USDC</strong> from your vault to{" "}
            <code className="font-mono">MY_KAST</code>. Real on-chain Squads
            tx. Needs vault USDC; if blocked you&apos;ll see the reason.
          </p>
          {paySig && (
            <a
              href={`https://explorer.solana.com/tx/${paySig}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[10.5px] hover:underline"
              style={{ color: "#15803D" }}
            >
              ✓ {paySig.slice(0, 8)}…{paySig.slice(-6)} on Explorer
            </a>
          )}
          {payError && (
            <p className="text-[10.5px]" style={{ color: "#B45309" }}>
              {payError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────── */

function agoLabel(iso: string): string {
  const ts = Date.parse(iso);
  if (isNaN(ts)) return "done";
  const diff = Math.max(0, Date.now() - ts);
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
