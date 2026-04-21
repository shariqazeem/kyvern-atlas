"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * <AttackAtlas/> — "Try to exploit Atlas yourself."
 *
 * A standalone module dropped onto /atlas that turns the observatory
 * from a spectator sport into a participatory one. Visitors pick one
 * of four adversarial scenarios, fire it at Atlas's REAL vault, watch
 * the policy program refuse, and leave with a share-ready tweet that
 * links to the actual failed transaction on Solana Explorer.
 *
 * UX beats (what a judge or X poster sees):
 *
 *   ┌─ INITIAL  ─── "Attack Atlas yourself. The chain will refuse."
 *   │              · scenario picker (4 attacks, label + one-liner)
 *   │
 *   ├─ FIRING   ─── live terminal-receipt animation:
 *   │                $ atlas-attacker --scenario rogue_merchant
 *   │                [00:00:00.014] fetch /api/vault/pay
 *   │                [00:00:00.081] await policy program…
 *   │
 *   ├─ REFUSED  ─── "Solana refused. 0 USDC moved."
 *   │              · Error Code: MerchantNotAllowlisted
 *   │              · [Open on Explorer]  [Tweet this]
 *   │
 *   └─ POST-SHARE — "Fire another one →"
 *
 * The tweet carries the live explorer URL + a branded one-liner. Every
 * successful probe is a share moment; every share is acquisition.
 * ════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Zap, ShieldAlert, Check, Share2 } from "lucide-react";
import { EASE_PREMIUM as EASE } from "@/lib/motion";

interface ScenarioSummary {
  index: number;
  type: "prompt_injection" | "over_cap" | "rogue_merchant" | "missing_memo";
  label: string;
  description: string;
  flavor: string;
}

interface ProbeResult {
  ok: boolean;
  error?: string;
  message?: string;
  retryAfterSeconds?: number;
  attack?: {
    id: string;
    attemptedAt: string;
    type: string;
    description: string;
    blockedReason: string;
    failedTxSignature: string | null;
  };
  scenario?: {
    index: number;
    type: string;
    label: string;
    flavor: string;
    payload: {
      merchant: string;
      recipientPubkey: string;
      amountUsd: number;
      memo?: string;
    };
  };
  explorerUrl?: string | null;
}

type Phase = "idle" | "firing" | "refused" | "error";

export function AttackAtlas() {
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [firingStep, setFiringStep] = useState(0);

  // Load scenarios on mount — single GET, cheap.
  useEffect(() => {
    fetch("/api/atlas/probe")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { scenarios?: ScenarioSummary[] } | null) => {
        if (j?.scenarios) setScenarios(j.scenarios);
      })
      .catch(() => {
        /* silent — module just stays idle */
      });
  }, []);

  // Drive the firing-sequence stepper purely with elapsed time so the
  // terminal-style log feels like a real attack stream.
  useEffect(() => {
    if (phase !== "firing") {
      setFiringStep(0);
      return;
    }
    const steps = 5;
    const id = setInterval(() => {
      setFiringStep((s) => Math.min(steps, s + 1));
    }, 240);
    return () => clearInterval(id);
  }, [phase]);

  const fire = async (index: number) => {
    setSelected(index);
    setPhase("firing");
    setResult(null);

    try {
      // Kick off the request + a minimum-hold so the terminal animation
      // has room to land. Whichever is slower drives total duration.
      const [res] = await Promise.all([
        fetch("/api/atlas/probe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenarioIndex: index }),
        }).then((r) => r.json() as Promise<ProbeResult>),
        new Promise((r) => setTimeout(r, 1400)),
      ]);

      if (!res.ok) {
        setResult(res);
        setPhase("error");
        return;
      }
      setResult(res);
      setPhase("refused");
    } catch (e) {
      setResult({
        ok: false,
        error: "network_error",
        message: e instanceof Error ? e.message : String(e),
      });
      setPhase("error");
    }
  };

  const reset = () => {
    setPhase("idle");
    setSelected(null);
    setResult(null);
  };

  return (
    <section
      id="attack-atlas"
      className="rounded-[20px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.03), 0 20px 60px -30px rgba(0,0,0,0.10)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{
          borderBottom: "0.5px solid var(--border-subtle)",
          background: "var(--attack-bg)",
        }}
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" style={{ color: "var(--attack)" }} />
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--attack)" }}
          >
            Attack Atlas yourself
          </span>
        </div>
        <span
          className="text-[11px] font-mono-numbers tabular-nums"
          style={{ color: "var(--text-tertiary)" }}
        >
          3 per minute · 10 per hour
        </span>
      </div>

      {/* Body */}
      <div className="px-6 py-6">
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <h3
                className="text-[22px] md:text-[26px] font-semibold tracking-[-0.015em] text-balance mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Pick an attack. Fire it at Atlas&apos;s real vault. Watch Solana refuse.
              </h3>
              <p
                className="text-[13.5px] leading-[1.55] mb-5 max-w-[620px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Every button below sends an authentic adversarial payload to
                Atlas&apos;s live <code className="code-inline">/api/vault/pay</code>{" "}
                endpoint. The Kyvern policy program on Solana devnet rejects it.
                You get a failed transaction you can verify on Explorer and
                share on X.
              </p>

              {/* Scenario grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {scenarios.length === 0 && (
                  <div
                    className="col-span-2 h-[120px] rounded-[12px] animate-pulse"
                    style={{ background: "var(--surface-2)" }}
                  />
                )}
                {scenarios.map((s) => (
                  <button
                    key={`${s.type}-${s.index}`}
                    onClick={() => fire(s.index)}
                    className="text-left px-4 py-3.5 rounded-[12px] transition-all hover:-translate-y-0.5"
                    style={{
                      background: "var(--surface)",
                      border: "0.5px solid var(--border-subtle)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: "var(--attack)" }}
                      />
                      <span
                        className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                        style={{ color: "var(--attack)" }}
                      >
                        {s.type.replace("_", " ")}
                      </span>
                    </div>
                    <p
                      className="text-[14px] font-semibold tracking-[-0.01em] mb-1"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {s.label}
                    </p>
                    <p
                      className="text-[12px] leading-[1.5]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {s.flavor}
                    </p>
                    <div
                      className="mt-2.5 inline-flex items-center gap-1 text-[11.5px] font-semibold"
                      style={{ color: "var(--attack)" }}
                    >
                      <Zap className="w-3 h-3" />
                      Fire this attack
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "firing" && (
            <motion.div
              key="firing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <FiringTerminal
                scenario={scenarios.find((s) => s.index === selected) ?? null}
                step={firingStep}
              />
            </motion.div>
          )}

          {phase === "refused" && result?.attack && (
            <motion.div
              key="refused"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <RefusedReceipt result={result} onAgain={reset} />
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="py-6 text-center"
            >
              <p
                className="text-[15px] font-semibold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                {result?.error === "rate_limited"
                  ? "Cooldown — Atlas is taking a breather."
                  : "Something went wrong."}
              </p>
              <p
                className="text-[13px] leading-[1.5] mb-4"
                style={{ color: "var(--text-tertiary)" }}
              >
                {result?.message ?? "Try another scenario."}
              </p>
              <button
                onClick={reset}
                className="btn-secondary"
                style={{ height: 40, padding: "0 18px", fontSize: 13 }}
              >
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/**
 * The five-step firing animation. Terminal-style log lines appear one
 * per ~240ms — enough to read, not so slow that it drags. If the real
 * request comes back BEFORE the animation finishes, the parent still
 * waits the minimum hold so the user sees the full sequence.
 */
function FiringTerminal({
  scenario,
  step,
}: {
  scenario: ScenarioSummary | null;
  step: number;
}) {
  const lines: Array<[string, string]> = [
    ["00:00:00.002", `firing scenario: ${scenario?.type ?? "loading"}`],
    ["00:00:00.014", "POST /api/vault/pay  (bearer: atlas-agent-key)"],
    ["00:00:00.081", "await kyvern policy program…"],
    ["00:00:00.092", "Program log: checking merchant allowlist…"],
    ["00:00:00.094", "awaiting Solana consensus…"],
  ];
  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{
        background: "#0B0B0F",
        color: "#E4E4E7",
      }}
    >
      <div
        className="flex items-center gap-2 px-3.5 py-2"
        style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.14)" }}
        />
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.14)" }}
        />
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.14)" }}
        />
        <span
          className="ml-1 text-[10.5px] font-mono-numbers"
          style={{ color: "rgba(255,255,255,0.42)" }}
        >
          atlas-attacker · firing
        </span>
      </div>
      <div className="px-4 py-4 font-mono-numbers text-[12.5px] leading-[1.7]">
        <div>
          <span style={{ color: "#7FDBCA" }}>~/kyvern</span>
          <span style={{ color: "rgba(255,255,255,0.28)" }}>{" "}❯{" "}</span>
          atlas-attacker --scenario{" "}
          <span style={{ color: "#79B8FF" }}>{scenario?.type ?? "…"}</span>
        </div>
        {lines.slice(0, step).map(([t, body], i) => (
          <div key={i} className="mt-1">
            <span style={{ color: "rgba(255,255,255,0.28)" }}>[{t}]</span>{" "}
            {body}
          </div>
        ))}
        {step < lines.length && (
          <motion.span
            aria-hidden
            className="inline-block align-middle"
            style={{
              width: "8px",
              height: "14px",
              background: "#E4E4E7",
              marginLeft: "4px",
            }}
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              times: [0, 0.5, 0.5, 1],
            }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * The landing page for a successful refusal — terminal receipt + share
 * buttons. This is the money screen: a judge or a random X user lands
 * here and has the option to tweet a real failed-tx link in one click.
 */
function RefusedReceipt({
  result,
  onAgain,
}: {
  result: ProbeResult;
  onAgain: () => void;
}) {
  const a = result.attack!;
  const sc = result.scenario;
  const tweetText =
    `i tried to exploit @kyvernlabs' live atlas agent with a ${sc?.type.replace(
      "_",
      "-",
    )} attack.\n\n` +
    `solana refused. 0 USDC moved. every refusal is a real on-chain tx.\n\n` +
    (result.explorerUrl ? `${result.explorerUrl}\n\n` : "") +
    `try it yourself → kyvernlabs.com/atlas`;
  const tweetHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    tweetText,
  )}`;

  return (
    <div>
      {/* Refusal receipt — same visual language as the moat section's
          terminal but tuned to the single-attack result. */}
      <div
        className="rounded-[14px] overflow-hidden mb-4"
        style={{
          background: "#0B0B0F",
          color: "#E4E4E7",
        }}
      >
        <div
          className="flex items-center gap-2 px-3.5 py-2"
          style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.14)" }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.14)" }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.14)" }}
          />
          <span
            className="ml-1 text-[10.5px] font-mono-numbers"
            style={{ color: "rgba(255,255,255,0.42)" }}
          >
            atlas-attacker · result
          </span>
        </div>
        <div className="px-4 py-4 font-mono-numbers text-[12.5px] leading-[1.7]">
          <div>
            <span style={{ color: "rgba(255,255,255,0.28)" }}>[00:00:00.091]</span>{" "}
            Program log: Error Code:{" "}
            <span style={{ color: "#F97583", fontWeight: 700 }}>
              {a.blockedReason}
            </span>
          </div>
          <div>
            <span style={{ color: "rgba(255,255,255,0.28)" }}>[00:00:00.094]</span>{" "}
            Program{" "}
            <span style={{ color: "#79B8FF" }}>PpmZErWfT5zpeo1f…WViaMSqc</span>{" "}
            <span style={{ color: "#F97583", fontWeight: 700 }}>failed</span>
          </div>
          <div
            className="mt-2 pt-2 flex items-center justify-between"
            style={{ borderTop: "0.5px dashed rgba(255,255,255,0.08)" }}
          >
            <span style={{ color: "#F97583", fontWeight: 700 }}>
              ✗ transaction reverted · 0 USDC moved
            </span>
            <span style={{ color: "rgba(255,255,255,0.42)" }}>exit 1</span>
          </div>
        </div>
      </div>

      {/* Summary line */}
      <div
        className="flex items-start gap-2 mb-4 text-[13.5px] leading-[1.55]"
        style={{ color: "var(--text-primary)" }}
      >
        <Check
          className="w-4 h-4 shrink-0 mt-0.5"
          style={{ color: "var(--success-deep)" }}
        />
        <span>
          <strong>Refused on-chain.</strong>{" "}
          <span style={{ color: "var(--text-tertiary)" }}>
            Scenario: {sc?.label ?? a.type}. The policy program checked the
            request against Atlas&apos;s vault rules and reverted before USDC
            could move.
          </span>
        </span>
      </div>

      {/* Action row — explorer + tweet + again */}
      <div className="flex flex-wrap items-center gap-2.5">
        {result.explorerUrl && (
          <a
            href={result.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-[12.5px] font-semibold transition-colors"
            style={{
              background: "var(--text-primary)",
              color: "var(--background)",
            }}
          >
            Open failed tx on Solana Explorer
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        )}
        <a
          href={tweetHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-[12.5px] font-semibold transition-colors"
          style={{
            background: "var(--agent-bg)",
            color: "var(--agent)",
            border: "0.5px solid var(--border-subtle)",
          }}
        >
          <Share2 className="w-3.5 h-3.5" />
          Tweet this refusal
        </a>
        <button
          onClick={onAgain}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-[12.5px] font-semibold transition-colors"
          style={{
            background: "var(--surface-2)",
            color: "var(--text-primary)",
            border: "0.5px solid var(--border-subtle)",
          }}
        >
          Fire another
        </button>
      </div>
    </div>
  );
}
