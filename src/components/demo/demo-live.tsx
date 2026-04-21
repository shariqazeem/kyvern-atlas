"use client";

/* ════════════════════════════════════════════════════════════════════
   <DemoLive /> — the live /demo surface
   ────────────────────────────────────────────────────────────────────
   Three panels:
     ① Agent brain  — streaming thoughts + attempts
     ② The Wall     — live policy checks, five rules, pass/fail per call
     ③ Ledger       — real on-chain payments with explorer links

   Plus a hero strip that makes the "it's real" claim, and a bottom
   counterfactual banner — "here's what happens without this vault."

   This component is the product demo. Every event comes from the
   SSE feed at /api/demo/stream?session=…, which is fed by a real
   runner executing against Solana devnet.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  Check,
  ExternalLink,
  Play,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  TerminalSquare,
  Wallet,
  X,
  Zap,
} from "lucide-react";

const EASE = [0.25, 0.1, 0.25, 1] as const;

/* ─── SSE event shapes (mirror src/lib/demo-session.ts) ─── */

type AnyRecord = Record<string, unknown>;

interface SseBase {
  seq: number;
  t: number;
}
interface NarrativeEvent extends SseBase {
  message?: string;
  agent?: { name: string; tagline: string };
  counterfactual?: {
    headline: string;
    body: string;
    drainedUsd: number;
    drainedSeconds: number;
  };
  vault?: {
    id: string;
    name: string;
    network: "devnet" | "mainnet";
    squadsAddress: string;
    allowedMerchants: string[];
    dailyLimitUsd: number;
    perTxMaxUsd: number;
  };
}
interface ThinkEvent extends SseBase {
  message: string;
}
interface AttemptEvent extends SseBase {
  merchant: string;
  amountUsd: number;
  memo: string | null;
  expected?: "allow" | "block";
}
interface PolicyEvent extends SseBase {
  decision: "allowed" | "blocked";
  code?: string;
  reason?: string;
  budget?: AnyRecord;
  velocity?: AnyRecord;
}
interface SettledEvent extends SseBase {
  payment: PaymentRow;
  tx: { signature: string; explorerUrl: string };
}
interface BlockedEvent extends SseBase {
  payment: PaymentRow;
  code?: string;
  reason?: string;
}
interface FailedEvent extends SseBase {
  payment: PaymentRow;
  message: string;
}
interface BudgetEvent extends SseBase {
  dailyLimitUsd: number;
  weeklyLimitUsd: number;
  perTxMaxUsd: number;
  maxCallsPerWindow: number;
  spentToday: number;
  spentThisWeek: number;
  callsInWindow: number;
}

interface PaymentRow {
  id: string;
  merchant: string;
  amountUsd: number;
  memo: string | null;
  status: "allowed" | "blocked" | "settled" | "failed";
  reason: string | null;
  txSignature: string | null;
  latencyMs: number | null;
  createdAt: string;
}

type BrainLine = { kind: "think" | "attempt" | "narrative" | "summary"; text: string; t: number };

/* ─── Component ─── */

export function DemoLive() {
  const [status, setStatus] = useState<"idle" | "starting" | "running" | "done" | "errored">("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const [agent, setAgent] = useState<NarrativeEvent["agent"] | null>(null);
  const [vault, setVault] = useState<NarrativeEvent["vault"] | null>(null);
  const [counterfactual, setCounterfactual] = useState<NarrativeEvent["counterfactual"] | null>(null);

  const [brain, setBrain] = useState<BrainLine[]>([]);
  const [banner, setBanner] = useState<string>(
    "Live demo on Solana devnet. Every payment below is a real transaction — click the signature to verify on-chain.",
  );

  const [currentAttempt, setCurrentAttempt] = useState<AttemptEvent | null>(null);
  const [policy, setPolicy] = useState<PolicyEvent | null>(null);
  const [signing, setSigning] = useState<boolean>(false);

  const [ledger, setLedger] = useState<PaymentRow[]>([]);
  const [settledCount, setSettledCount] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);

  const [budget, setBudget] = useState<BudgetEvent | null>(null);

  const brainScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (brainScrollRef.current) {
      brainScrollRef.current.scrollTop = brainScrollRef.current.scrollHeight;
    }
  }, [brain.length]);

  /* ─── Start ─── */
  const start = useCallback(async () => {
    setStatus("starting");
    setStartError(null);
    setBrain([]);
    setLedger([]);
    setSettledCount(0);
    setBlockedCount(0);
    setCurrentAttempt(null);
    setPolicy(null);
    setSigning(false);
    try {
      const res = await fetch("/api/demo/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network: "devnet" }),
      });
      const json = (await res.json()) as AnyRecord;
      if (!res.ok) {
        setStartError(
          (json.message as string) ||
            (json.error as string) ||
            "failed to start demo",
        );
        setStatus("errored");
        return;
      }
      setSessionId(json.sessionId as string);
      setStatus("running");
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "network error");
      setStatus("errored");
    }
  }, []);

  /* ─── SSE subscription ─── */
  useEffect(() => {
    if (!sessionId) return;
    const src = new EventSource(`/api/demo/stream?session=${sessionId}`);

    const onNarrative = (e: MessageEvent) => {
      const d = JSON.parse(e.data) as NarrativeEvent;
      if (d.agent) setAgent(d.agent);
      if (d.vault) setVault(d.vault);
      if (d.counterfactual) setCounterfactual(d.counterfactual);
      if (d.message) {
        setBanner(d.message);
        setBrain((b) => [...b, { kind: "narrative", text: d.message!, t: d.t }]);
      }
    };
    const onThink = (e: MessageEvent) => {
      const d = JSON.parse(e.data) as ThinkEvent;
      setBrain((b) => [...b, { kind: "think", text: d.message, t: d.t }]);
    };
    const onAttempt = (e: MessageEvent) => {
      const d = JSON.parse(e.data) as AttemptEvent;
      setCurrentAttempt(d);
      setPolicy(null);
      setSigning(false);
      setBrain((b) => [
        ...b,
        {
          kind: "attempt",
          text: `→ pay ${d.merchant} · $${d.amountUsd.toFixed(2)}${d.memo ? ` · "${d.memo}"` : ""}`,
          t: d.t,
        },
      ]);
    };
    const onPolicy = (e: MessageEvent) => {
      const d = JSON.parse(e.data) as PolicyEvent;
      setPolicy(d);
    };
    const onSigning = () => setSigning(true);
    const onSettled = (e: MessageEvent) => {
      const d = JSON.parse(e.data) as SettledEvent;
      setLedger((l) => [
        { ...d.payment, txSignature: d.tx.signature },
        ...l,
      ].slice(0, 20));
      setSettledCount((c) => c + 1);
      setSigning(false);
    };
    const onBlocked = (e: MessageEvent) => {
      const d = JSON.parse(e.data) as BlockedEvent;
      setLedger((l) => [d.payment, ...l].slice(0, 20));
      setBlockedCount((c) => c + 1);
      setSigning(false);
    };
    const onFailed = (e: MessageEvent) => {
      const d = JSON.parse(e.data) as FailedEvent;
      setLedger((l) => [d.payment, ...l].slice(0, 20));
      setSigning(false);
    };
    const onBudget = (e: MessageEvent) => {
      const d = JSON.parse(e.data) as BudgetEvent;
      setBudget(d);
    };
    const onSummary = (e: MessageEvent) => {
      const d = JSON.parse(e.data) as ThinkEvent;
      setBanner(d.message);
      setBrain((b) => [...b, { kind: "summary", text: d.message, t: d.t }]);
    };
    const onEnd = () => {
      setStatus("done");
      src.close();
    };
    const onError = (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data) as { message?: string };
        setStartError(d.message ?? "demo stream error");
      } catch {
        // swallow
      }
      setStatus("errored");
    };

    src.addEventListener("narrative", onNarrative);
    src.addEventListener("think", onThink);
    src.addEventListener("attempt", onAttempt);
    src.addEventListener("policy", onPolicy);
    src.addEventListener("signing", onSigning);
    src.addEventListener("settled", onSettled);
    src.addEventListener("blocked", onBlocked);
    src.addEventListener("failed", onFailed);
    src.addEventListener("budget", onBudget);
    src.addEventListener("summary", onSummary);
    src.addEventListener("end", onEnd);
    src.addEventListener("error", onError as EventListener);

    return () => {
      src.close();
    };
  }, [sessionId]);

  const heroState = useMemo<"idle" | "running" | "done">(() => {
    if (status === "idle" || status === "starting" || status === "errored") return "idle";
    if (status === "running") return "running";
    return "done";
  }, [status]);

  /* ─── Render ─── */

  return (
    <div className="pt-28 pb-24">
      <section className="mx-auto max-w-6xl px-6">
        <HeroStrip
          state={heroState}
          agent={agent}
          vault={vault}
          banner={banner}
          settled={settledCount}
          blocked={blockedCount}
        />

        <div className="mt-6 flex items-center gap-3">
          {status === "idle" || status === "errored" ? (
            <button
              onClick={start}
              className="group inline-flex items-center gap-2 h-12 px-5 rounded-[12px] text-[14.5px] font-semibold transition-opacity duration-200 hover:opacity-90"
              style={{
                background: "var(--text-primary)",
                color: "var(--background)",
              }}
            >
              <Play className="w-4 h-4" />
              Run the demo
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
          ) : status === "starting" ? (
            <div
              className="inline-flex items-center gap-2 h-12 px-5 rounded-[12px] text-[14.5px] font-semibold"
              style={{
                background: "var(--surface-2)",
                color: "var(--text-secondary)",
                border: "0.5px solid var(--border)",
              }}
            >
              <Spinner /> Bootstrapping demo vault on Solana devnet…
            </div>
          ) : status === "running" ? (
            <div
              className="inline-flex items-center gap-2 h-12 px-5 rounded-[12px] text-[14.5px] font-semibold"
              style={{
                background: "var(--accent-bg)",
                color: "var(--accent)",
                border: "0.5px solid var(--accent)",
              }}
            >
              <PulsingDot /> Live — agent running
            </div>
          ) : (
            <button
              onClick={start}
              className="group inline-flex items-center gap-2 h-12 px-5 rounded-[12px] text-[14.5px] font-semibold transition-opacity duration-200 hover:opacity-90"
              style={{
                background: "var(--text-primary)",
                color: "var(--background)",
              }}
            >
              <RotateCcw className="w-4 h-4" />
              Run again
            </button>
          )}
          {vault && (
            <a
              href={solscanAccountUrl(vault.squadsAddress, vault.network)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-12 px-4 rounded-[12px] text-[13.5px] font-medium transition-colors"
              style={{
                color: "var(--text-secondary)",
                border: "0.5px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              View vault on Solscan
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {startError && (
          <div
            className="mt-4 flex items-start gap-2 px-4 py-3 rounded-[12px] text-[13.5px]"
            style={{
              background: "var(--destructive-bg)",
              color: "var(--destructive)",
              border: "0.5px solid var(--destructive)",
            }}
          >
            <X className="w-4 h-4 mt-0.5" />
            <div>
              <div className="font-semibold">Demo failed to start</div>
              <div className="opacity-80 mt-0.5">{startError}</div>
              <div className="opacity-70 mt-2 text-[12px]">
                If this is a fresh install, make sure you&apos;ve run{" "}
                <code className="font-mono">
                  npx tsx scripts/bootstrap-solana-signer.ts
                </code>{" "}
                so the server signer has devnet SOL.
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3-column live surface */}
      <section className="mx-auto max-w-6xl px-6 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <BrainPanel brain={brain} scrollRef={brainScrollRef} />
          <WallPanel
            attempt={currentAttempt}
            policy={policy}
            signing={signing}
            vault={vault}
          />
          <LedgerPanel
            ledger={ledger}
            network={vault?.network ?? "devnet"}
          />
        </div>
      </section>

      {/* Budget strip */}
      <section className="mx-auto max-w-6xl px-6 mt-6">
        <BudgetStrip budget={budget} />
      </section>

      {/* Counterfactual */}
      {counterfactual && (
        <section className="mx-auto max-w-6xl px-6 mt-16">
          <Counterfactual cf={counterfactual} />
        </section>
      )}

      {/* How this maps to production */}
      <section className="mx-auto max-w-6xl px-6 mt-12">
        <ProductionBridge />
      </section>
    </div>
  );
}

/* ─── Hero strip ─── */

function HeroStrip({
  state,
  agent,
  vault,
  banner,
  settled,
  blocked,
}: {
  state: "idle" | "running" | "done";
  agent: NarrativeEvent["agent"] | null;
  vault: NarrativeEvent["vault"] | null;
  banner: string;
  settled: number;
  blocked: number;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[22px] p-6 md:p-8"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.03), 0 16px 40px rgba(0,0,0,0.05)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-semibold uppercase tracking-wider"
          style={{
            background:
              state === "running" ? "var(--accent-bg)" : "var(--surface-2)",
            color:
              state === "running" ? "var(--accent)" : "var(--text-secondary)",
            border: "0.5px solid var(--border)",
          }}
        >
          {state === "running" ? <PulsingDot /> : <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--text-tertiary)" }} />}
          {state === "running" ? "LIVE" : state === "done" ? "COMPLETE" : "READY"}
        </span>
        <span
          className="text-[11.5px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)" }}
        >
          Solana devnet · Squads v4 · real policy · real signatures
        </span>
      </div>

      <h1
        className="mt-3 text-[32px] md:text-[44px] leading-[1.05] tracking-tight"
        style={{ color: "var(--text-primary)", fontWeight: 600 }}
      >
        Agents shouldn&apos;t have keys.
        <br />
        <span style={{ color: "var(--accent)" }}>They should have budgets.</span>
      </h1>

      <p
        className="mt-3 max-w-2xl text-[15px] leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        {banner}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-5 text-[13px]">
        <Badge icon={<Brain className="w-3.5 h-3.5" />} label="Agent" value={agent?.name ?? "Parallax"} />
        <Badge icon={<Wallet className="w-3.5 h-3.5" />} label="Vault" value={vault?.name ?? "Parallax (demo)"} />
        <Badge icon={<Zap className="w-3.5 h-3.5" />} label="Per-tx cap" value={vault ? `$${vault.perTxMaxUsd.toFixed(2)}` : "$0.50"} />
        <Badge icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Daily cap" value={vault ? `$${vault.dailyLimitUsd.toFixed(2)}` : "$5.00"} />
        {state !== "idle" && (
          <>
            <Badge tone="success" icon={<Check className="w-3.5 h-3.5" />} label="Settled" value={String(settled)} />
            <Badge tone="destructive" icon={<ShieldAlert className="w-3.5 h-3.5" />} label="Blocked" value={String(blocked)} />
          </>
        )}
      </div>
    </div>
  );
}

function Badge({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "success" | "destructive";
}) {
  const colors =
    tone === "success"
      ? { bg: "var(--success-bg)", fg: "var(--success)" }
      : tone === "destructive"
        ? { bg: "var(--destructive-bg)", fg: "var(--destructive)" }
        : { bg: "var(--surface-2)", fg: "var(--text-secondary)" };
  return (
    <span
      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[10px] font-medium"
      style={{
        background: colors.bg,
        color: colors.fg,
        border: "0.5px solid var(--border)",
      }}
    >
      {icon}
      <span className="opacity-75">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}

/* ─── Brain panel ─── */

function BrainPanel({
  brain,
  scrollRef,
}: {
  brain: BrainLine[];
  scrollRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div
      className="lg:col-span-5 rounded-[18px] p-5"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <PanelHeader
        icon={<Brain className="w-4 h-4" />}
        title="Agent brain"
        caption="Parallax · live reasoning"
      />
      <div
        ref={scrollRef}
        className="mt-3 h-[420px] overflow-y-auto pr-1 font-mono text-[12.5px] leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        {brain.length === 0 ? (
          <div className="opacity-60 italic">
            Waiting for agent to wake up. Press &quot;Run the demo&quot; above.
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {brain.map((line, i) => (
              <motion.div
                key={`${line.t}-${i}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="mb-1.5"
              >
                <span
                  className="mr-2 font-semibold uppercase text-[10.5px] tracking-wider"
                  style={{
                    color:
                      line.kind === "attempt"
                        ? "var(--accent)"
                        : line.kind === "summary"
                          ? "var(--success)"
                          : line.kind === "narrative"
                            ? "var(--text-primary)"
                            : "var(--text-tertiary)",
                  }}
                >
                  {line.kind}
                </span>
                <span style={{ color: "var(--text-primary)" }}>{line.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

/* ─── The Wall ─── */

interface RuleCheck {
  key: string;
  label: string;
  state: "idle" | "pending" | "pass" | "fail";
  detail?: string;
}

function WallPanel({
  attempt,
  policy,
  signing,
  vault,
}: {
  attempt: AttemptEvent | null;
  policy: PolicyEvent | null;
  signing: boolean;
  vault: NarrativeEvent["vault"] | null;
}) {
  const rules = useMemo<RuleCheck[]>(() => {
    if (!attempt) {
      return [
        { key: "merchant", label: "Merchant allowlist", state: "idle" },
        { key: "per_tx", label: "Per-tx cap", state: "idle" },
        { key: "daily", label: "Daily budget", state: "idle" },
        { key: "velocity", label: "Velocity window", state: "idle" },
        { key: "memo", label: "Memo required", state: "idle" },
      ];
    }
    if (!policy) {
      // attempt in flight, policy not back yet → pending
      return [
        { key: "merchant", label: "Merchant allowlist", state: "pending" },
        { key: "per_tx", label: "Per-tx cap", state: "pending" },
        { key: "daily", label: "Daily budget", state: "pending" },
        { key: "velocity", label: "Velocity window", state: "pending" },
        { key: "memo", label: "Memo required", state: "pending" },
      ];
    }
    // Map engine code → which rule failed.
    const failed = policy.code ?? "";
    const mk = (key: string, label: string, detail?: string): RuleCheck => ({
      key,
      label,
      state: failed.includes(key)
        ? "fail"
        : policy.decision === "allowed" || !failed
          ? "pass"
          : "pass",
      detail,
    });
    return [
      mk("merchant", "Merchant allowlist", attempt.merchant),
      mk("per_tx", "Per-tx cap", `$${attempt.amountUsd.toFixed(2)}`),
      mk("daily", "Daily budget"),
      mk("velocity", "Velocity window"),
      mk("memo", "Memo required", attempt.memo ?? "(missing)"),
    ];
  }, [attempt, policy]);

  const headline =
    policy?.decision === "blocked"
      ? "The vault just blocked this."
      : policy?.decision === "allowed" && signing
        ? "All checks passed — co-signing on-chain…"
        : policy?.decision === "allowed"
          ? "All checks passed — signed."
          : attempt
            ? "Evaluating…"
            : "The Wall — waiting for the agent";

  const tone =
    policy?.decision === "blocked"
      ? "destructive"
      : policy?.decision === "allowed"
        ? "success"
        : "default";

  return (
    <div
      className="lg:col-span-4 rounded-[18px] p-5"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <PanelHeader
        icon={<ShieldCheck className="w-4 h-4" />}
        title="The Wall"
        caption={
          vault
            ? `${vault.allowedMerchants.length} merchants · $${vault.perTxMaxUsd.toFixed(2)} per-tx · $${vault.dailyLimitUsd.toFixed(2)}/day`
            : "policy engine"
        }
      />

      <div
        className="mt-4 p-4 rounded-[14px]"
        style={{
          background:
            tone === "destructive"
              ? "var(--destructive-bg)"
              : tone === "success"
                ? "var(--success-bg)"
                : "var(--surface-2)",
          border:
            tone === "destructive"
              ? "0.5px solid var(--destructive)"
              : tone === "success"
                ? "0.5px solid var(--success)"
                : "0.5px solid var(--border)",
        }}
      >
        <div
          className="text-[13.5px] font-semibold"
          style={{
            color:
              tone === "destructive"
                ? "var(--destructive)"
                : tone === "success"
                  ? "var(--success)"
                  : "var(--text-primary)",
          }}
        >
          {headline}
        </div>
        {attempt && (
          <div
            className="mt-1 text-[12.5px] font-mono"
            style={{ color: "var(--text-secondary)" }}
          >
            {attempt.merchant} · ${attempt.amountUsd.toFixed(2)}
          </div>
        )}
        {policy?.reason && (
          <div
            className="mt-1 text-[12px]"
            style={{ color: "var(--text-secondary)" }}
          >
            {policy.reason}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {rules.map((r) => (
          <RuleRow key={r.key} rule={r} />
        ))}
      </div>
    </div>
  );
}

function RuleRow({ rule }: { rule: RuleCheck }) {
  const { state } = rule;
  const icon =
    state === "pass" ? (
      <Check className="w-3.5 h-3.5" />
    ) : state === "fail" ? (
      <X className="w-3.5 h-3.5" />
    ) : state === "pending" ? (
      <Spinner small />
    ) : (
      <span className="block w-2 h-2 rounded-full" style={{ background: "var(--text-quaternary)" }} />
    );
  const color =
    state === "pass"
      ? { fg: "var(--success)", bg: "var(--success-bg)" }
      : state === "fail"
        ? { fg: "var(--destructive)", bg: "var(--destructive-bg)" }
        : state === "pending"
          ? { fg: "var(--accent)", bg: "var(--accent-bg)" }
          : { fg: "var(--text-tertiary)", bg: "var(--surface-2)" };

  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-[10px] text-[13px]"
      style={{ background: "var(--surface-2)", border: "0.5px solid var(--border-subtle)" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full"
          style={{ background: color.bg, color: color.fg }}
        >
          {icon}
        </span>
        <span style={{ color: "var(--text-primary)" }}>{rule.label}</span>
      </div>
      {rule.detail && (
        <span className="font-mono text-[11.5px]" style={{ color: "var(--text-tertiary)" }}>
          {rule.detail}
        </span>
      )}
    </div>
  );
}

/* ─── Ledger ─── */

function LedgerPanel({
  ledger,
  network,
}: {
  ledger: PaymentRow[];
  network: "devnet" | "mainnet";
}) {
  return (
    <div
      className="lg:col-span-3 rounded-[18px] p-5"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <PanelHeader
        icon={<TerminalSquare className="w-4 h-4" />}
        title="On-chain ledger"
        caption={network === "mainnet" ? "Solana mainnet" : "Solana devnet"}
      />
      <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {ledger.length === 0 ? (
          <div
            className="text-[12.5px] italic"
            style={{ color: "var(--text-tertiary)" }}
          >
            No transactions yet.
          </div>
        ) : (
          ledger.map((p) => <LedgerRow key={p.id} p={p} network={network} />)
        )}
      </div>
    </div>
  );
}

function LedgerRow({
  p,
  network,
}: {
  p: PaymentRow;
  network: "devnet" | "mainnet";
}) {
  const tone =
    p.status === "settled"
      ? { fg: "var(--success)", bg: "var(--success-bg)", label: "settled" }
      : p.status === "blocked"
        ? { fg: "var(--destructive)", bg: "var(--destructive-bg)", label: "blocked" }
        : p.status === "failed"
          ? { fg: "var(--warning)", bg: "var(--warning-bg)", label: "failed" }
          : { fg: "var(--text-secondary)", bg: "var(--surface-2)", label: p.status };

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="p-3 rounded-[10px]"
      style={{
        background: "var(--surface-2)",
        border: "0.5px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center h-5 px-1.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider"
          style={{
            background: tone.bg,
            color: tone.fg,
          }}
        >
          {tone.label}
        </span>
        <span
          className="font-mono tabular-nums text-[12.5px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          ${p.amountUsd.toFixed(2)}
        </span>
      </div>
      <div
        className="mt-1.5 text-[12px] font-mono truncate"
        style={{ color: "var(--text-secondary)" }}
        title={p.merchant}
      >
        {p.merchant}
      </div>
      {p.memo && (
        <div
          className="text-[11.5px] italic truncate"
          style={{ color: "var(--text-tertiary)" }}
        >
          &quot;{p.memo}&quot;
        </div>
      )}
      {p.reason && (
        <div
          className="text-[11.5px] mt-0.5"
          style={{ color: "var(--destructive)" }}
        >
          {p.reason}
        </div>
      )}
      {p.txSignature && (
        <a
          href={solscanTxUrl(p.txSignature, network)}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-mono"
          style={{ color: "var(--accent)" }}
        >
          {shortSig(p.txSignature)}
          <ArrowUpRight className="w-3 h-3" />
        </a>
      )}
    </motion.div>
  );
}

/* ─── Budget strip ─── */

function BudgetStrip({ budget }: { budget: BudgetEvent | null }) {
  if (!budget) return null;
  const dailyPct = Math.min(100, (budget.spentToday / budget.dailyLimitUsd) * 100);
  const velocityPct = Math.min(
    100,
    (budget.callsInWindow / budget.maxCallsPerWindow) * 100,
  );
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-[18px]"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <BudgetBar
        label="Daily spend"
        current={`$${budget.spentToday.toFixed(2)}`}
        limit={`$${budget.dailyLimitUsd.toFixed(2)}`}
        pct={dailyPct}
      />
      <BudgetBar
        label="Velocity"
        current={`${budget.callsInWindow} calls`}
        limit={`${budget.maxCallsPerWindow} / window`}
        pct={velocityPct}
      />
    </div>
  );
}

function BudgetBar({
  label,
  current,
  limit,
  pct,
}: {
  label: string;
  current: string;
  limit: string;
  pct: number;
}) {
  const color = pct >= 100 ? "var(--destructive)" : pct >= 70 ? "var(--warning)" : "var(--accent)";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span
          className="text-[11.5px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)" }}
        >
          {label}
        </span>
        <span
          className="font-mono tabular-nums text-[13px]"
          style={{ color: "var(--text-secondary)" }}
        >
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {current}
          </span>
          <span className="opacity-60"> / {limit}</span>
        </span>
      </div>
      <div
        className="mt-2 h-2 rounded-full overflow-hidden"
        style={{ background: "var(--surface-2)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: EASE }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

/* ─── Counterfactual ─── */

function Counterfactual({ cf }: { cf: NonNullable<NarrativeEvent["counterfactual"]> }) {
  return (
    <div
      className="rounded-[22px] p-6 md:p-8"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" style={{ color: "var(--destructive)" }} />
        <span
          className="text-[11.5px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--destructive)" }}
        >
          Why this matters
        </span>
      </div>
      <h2
        className="mt-3 text-[22px] md:text-[28px] tracking-tight"
        style={{ color: "var(--text-primary)", fontWeight: 600 }}
      >
        {cf.headline}
      </h2>
      <p
        className="mt-2 max-w-2xl text-[15px] leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        {cf.body}
      </p>
      <div className="mt-5 flex flex-wrap gap-6">
        <Metric
          label="Drained"
          value={`$${cf.drainedUsd.toLocaleString()}`}
          tone="destructive"
        />
        <Metric
          label="Time to drain"
          value={`${cf.drainedSeconds}s`}
          tone="destructive"
        />
        <Metric label="Saved by this vault" value="$∞" tone="success" />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "destructive";
}) {
  const fg = tone === "success" ? "var(--success)" : "var(--destructive)";
  return (
    <div>
      <div
        className="text-[10.5px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </div>
      <div
        className="mt-1 font-mono tabular-nums text-[24px] md:text-[28px]"
        style={{ color: fg, fontWeight: 600 }}
      >
        {value}
      </div>
    </div>
  );
}

/* ─── Production bridge ─── */

function ProductionBridge() {
  return (
    <div
      className="rounded-[22px] p-6 md:p-8"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <span
          className="text-[11.5px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--accent)" }}
        >
          This is production
        </span>
      </div>
      <h2
        className="mt-3 text-[22px] md:text-[28px] tracking-tight"
        style={{ color: "var(--text-primary)", fontWeight: 600 }}
      >
        The same stack you just watched ships behind your agent.
      </h2>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        <Bullet
          title="One API call"
          body="POST /api/vault/pay with a bearer key. Same wire protocol you saw. Your agent gets allowed, blocked, or recovered — by on-chain rules, not by a server you have to trust."
        />
        <Bullet
          title="Real Squads v4"
          body="Every payment is a spendingLimitUse ix on a real multisig. The cap is enforced by the program, not the app. If our server goes dark, your cap still holds."
        />
        <Bullet
          title="Zero custodial risk"
          body="Owner keeps the multisig config authority. KyvernLabs never touches owner funds. The delegated key can only spend within the cap you set — nothing else."
        />
      </div>
      <div className="mt-6">
        <a
          href="/vault/new"
          className="group inline-flex items-center gap-2 h-12 px-5 rounded-[12px] text-[14.5px] font-semibold transition-opacity duration-200 hover:opacity-90"
          style={{
            background: "var(--accent)",
            color: "white",
          }}
        >
          Create your vault
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </a>
      </div>
    </div>
  );
}

function Bullet({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="rounded-[14px] p-4"
      style={{
        background: "var(--surface-2)",
        border: "0.5px solid var(--border-subtle)",
      }}
    >
      <div
        className="text-[13px] font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </div>
      <div
        className="mt-1.5 text-[13px] leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        {body}
      </div>
    </div>
  );
}

/* ─── Shared chrome ─── */

function PanelHeader({
  icon,
  title,
  caption,
}: {
  icon: React.ReactNode;
  title: string;
  caption: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded-[8px]"
          style={{
            background: "var(--surface-2)",
            color: "var(--text-secondary)",
            border: "0.5px solid var(--border)",
          }}
        >
          {icon}
        </span>
        <span
          className="text-[13.5px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </span>
      </div>
      <span
        className="text-[11px] font-medium"
        style={{ color: "var(--text-tertiary)" }}
      >
        {caption}
      </span>
    </div>
  );
}

function Spinner({ small = false }: { small?: boolean }) {
  const size = small ? "w-3 h-3" : "w-3.5 h-3.5";
  return (
    <svg
      className={`${size} animate-spin`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PulsingDot() {
  return (
    <span className="relative inline-block w-2 h-2">
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: "var(--accent)" }}
      />
      <span
        className="absolute inset-0 rounded-full animate-ping"
        style={{ background: "var(--accent)", opacity: 0.55 }}
      />
    </span>
  );
}

/* ─── Helpers ─── */

function solscanTxUrl(sig: string, network: "devnet" | "mainnet") {
  const cluster = network === "mainnet" ? "" : "?cluster=devnet";
  return `https://solscan.io/tx/${sig}${cluster}`;
}
function solscanAccountUrl(pubkey: string, network: "devnet" | "mainnet") {
  const cluster = network === "mainnet" ? "" : "?cluster=devnet";
  return `https://solscan.io/account/${pubkey}${cluster}`;
}
function shortSig(sig: string) {
  if (sig.length <= 12) return sig;
  return `${sig.slice(0, 6)}…${sig.slice(-4)}`;
}
