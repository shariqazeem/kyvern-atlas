import type { AgentTool, PulseConfig, PulseTrigger, SignalKind } from "../types";
import { appendChat, setSignalOnChain, writeSignal } from "../store";
import { firePulseTrigger } from "../pulse-fire";

/**
 * message_user — the worker's voice to its owner.
 *
 * Path C splits this into two modes by input shape:
 *
 *   FINDING MODE (preferred when reporting something the owner should
 *   read in the Inbox). The worker provides a structured payload:
 *     { kind, subject, evidence: string[], suggestion?, sourceUrl? }
 *   The runner writes a row to `signals` — a card in the Inbox.
 *
 *   CHAT MODE (replies to a direct chat from the owner). The worker
 *   provides a free-form prose message:
 *     { message: string }
 *   The runner appends to `agent_chat_messages` — a bubble in chat.
 *
 * The mode is detected automatically by which fields are populated.
 * Both shapes are described in the schema so the LLM picks the right one.
 */

const VALID_SIGNAL_KINDS: SignalKind[] = [
  // Phase 3 — user-benefit-first kinds (the trio's new defaults).
  "drafted_application",
  "wallet_alert",
  "trigger_armed",
  "trigger_fired",
  "trigger_blocked",
  // Legacy kinds — accepted for backwards-compat with historical rows.
  "bounty",
  "ecosystem_announcement",
  "wallet_move",
  "price_trigger",
  "github_release",
  "observation",
  "condition_update",
  "opportunity",
  "market_intel",
];

function isStructuredSignal(input: Record<string, unknown>): boolean {
  const evidenceOk =
    Array.isArray(input.evidence)
      ? input.evidence.length > 0
      : typeof input.evidence === "string" && input.evidence.trim().length > 0;
  return (
    typeof input.kind === "string" &&
    typeof input.subject === "string" &&
    evidenceOk
  );
}

function coerceKind(raw: unknown): SignalKind {
  const s = String(raw);
  return (VALID_SIGNAL_KINDS as readonly string[]).includes(s)
    ? (s as SignalKind)
    : "observation";
}

/**
 * Phase 2 (KYVERN_FRONTIER_GRAND_CHAMPION) — Pulse trigger_fired side-effect.
 *
 * Looks up the matching trigger from agent.config (using the asset
 * embedded in the LLM-emitted subject) and delegates to firePulseTrigger,
 * the shared helper that both this LLM path and the scripted Pulse runner
 * call. Returns the on-chain signature so the just-written signal can be
 * anchored via setSignalOnChain.
 */
async function firePulseTriggerSideEffect(
  agent: { id: string; deviceId: string; template: string; config: unknown },
  kind: SignalKind,
  subject: string,
): Promise<string | null> {
  if (kind !== "trigger_fired") return null;
  if (agent.template !== "token_pulse") return null;

  const cfg = agent.config as PulseConfig | undefined;
  if (!cfg || !Array.isArray(cfg.triggers) || cfg.triggers.length === 0) {
    return null;
  }

  // Subject from the prompt: "{asset} hit ${price}" (or close variants).
  const assetMatch = subject.match(/\b([A-Z]{2,8})\b/);
  const priceMatch = subject.match(/\$\s*([0-9]+(?:\.[0-9]+)?)/);
  const asset = assetMatch?.[1]?.toUpperCase();
  const livePrice = priceMatch ? parseFloat(priceMatch[1]) : null;
  if (!asset) return null;

  const trigger: PulseTrigger | undefined = cfg.triggers.find(
    (t) => t.asset.toUpperCase() === asset,
  );
  if (!trigger) return null;

  const result = await firePulseTrigger({
    agentId: agent.id,
    deviceId: agent.deviceId,
    trigger,
    livePrice,
  });
  return result.signature;
}

export const messageUserTool: AgentTool = {
  id: "message_user",
  name: "Message your owner",
  description:
    "Send something to your owner. TWO MODES: (1) Finding mode — when you report a discovery the owner should see in their Inbox, pass {kind, subject, evidence, suggestion?, sourceUrl?}. (2) Chat mode — when you're replying to a direct chat from the owner, pass {message: string}. Use Finding mode for everything autonomous; Chat mode only for replies.",
  category: "communicate",
  costsMoney: false,
  schema: {
    type: "object",
    properties: {
      // FINDING MODE fields
      kind: {
        type: "string",
        enum: [...VALID_SIGNAL_KINDS],
        description:
          "Signal kind for Finding mode. PREFERRED (Phase 3): drafted_application=Sentinel just drafted a paid bounty application for the owner · wallet_alert=Wren saw a material move on a watched wallet · trigger_armed=Pulse's price condition is within 5% of threshold · trigger_fired=Pulse's price condition crossed and the conditional spend settled. LEGACY (back-compat only — emit only if your template branch above tells you to): opportunity, market_intel, bounty, ecosystem_announcement, wallet_move, price_trigger, github_release, observation, condition_update.",
      },
      subject: {
        type: "string",
        description:
          "Finding mode: short headline (≤80 chars). What did you find? E.g. 'New Superteam bounty: Build Solana wallet UI · $2,500'.",
      },
      evidence: {
        type: "string",
        description:
          "Finding mode: 2-4 short factual bullets joined by ' || '. E.g. 'Reward: $2,500 USDC || Posted: 12m ago || Skills: React, TypeScript || Ends: May 8'.",
      },
      suggestion: {
        type: "string",
        description:
          "Finding mode (optional): one-line action recommendation. E.g. 'Apply within 24h — past similar bounties got 3+ applicants on day one'.",
      },
      sourceUrl: {
        type: "string",
        description:
          "Finding mode (optional): URL the owner can click to verify the finding directly.",
      },
      persistenceContext: {
        type: "string",
        description:
          "Finding mode (optional, ≤200 chars): how long has this been going on, what changed since you first observed it. E.g. 'below band for 6h — longest stretch since Apr 15' or 'wallet quiet for 4h — unusual, normally 3+ swaps/hr'. Frontends render this as the persistence stripe on the signal card.",
      },
      nextTrigger: {
        type: "string",
        description:
          "Finding mode (optional, ≤200 chars): the SPECIFIC trigger you're watching for next. REPLACES vague 'I'll continue monitoring' language with a concrete commitment. E.g. 'break above $85 on volume as bounce confirmation' or 'submission count crossing 50' or 'next Anchor release tag'.",
      },
      // CHAT MODE field
      message: {
        type: "string",
        description:
          "Chat mode only: free-form prose reply to a direct chat from the owner.",
      },
    },
    required: [],
  },
  execute: async (ctx, input) => {
    if (isStructuredSignal(input)) {
      // Finding mode → Inbox row
      const kind = coerceKind(input.kind);
      const subject = String(input.subject).slice(0, 200).trim();
      const rawEvidence = input.evidence;
      const evidence: string[] = Array.isArray(rawEvidence)
        ? (rawEvidence as unknown[]).map((e) => String(e).trim()).filter(Boolean)
        : String(rawEvidence)
            .split(/\s*\|\|\s*|\n+/)
            .map((s) => s.trim())
            .filter(Boolean);
      if (!subject || evidence.length === 0) {
        return { ok: false, message: "subject + at least one evidence bullet required for finding mode" };
      }
      const suggestion =
        typeof input.suggestion === "string" && input.suggestion.trim().length > 0
          ? String(input.suggestion).trim()
          : null;
      const sourceUrl =
        typeof input.sourceUrl === "string" && input.sourceUrl.trim().length > 0
          ? String(input.sourceUrl).trim()
          : null;
      const persistenceContext =
        typeof input.persistenceContext === "string" &&
        input.persistenceContext.trim().length > 0
          ? String(input.persistenceContext).slice(0, 200).trim()
          : null;
      const nextTrigger =
        typeof input.nextTrigger === "string" &&
        input.nextTrigger.trim().length > 0
          ? String(input.nextTrigger).slice(0, 200).trim()
          : null;

      const result = writeSignal({
        agentId: ctx.agent.id,
        deviceId: ctx.agent.deviceId,
        kind,
        subject,
        evidence,
        suggestion,
        sourceUrl,
        persistenceContext,
        nextTrigger,
      });

      // Dedup hit — the same (kind + subject) was already surfaced
      // inside the per-kind dedup window. Don't log a new
      // "Surfaced signal" event and tell the LLM honestly so its next
      // step can idle instead of retrying. This is the storage-layer
      // gate that closes the loop-breaking-rule failure mode where
      // the model knew it had surfaced and surfaced again anyway.
      if (!result.created) {
        const ageMs = result.duplicateAgeMs ?? 0;
        const ageMin = Math.max(1, Math.round(ageMs / 60_000));
        return {
          ok: true,
          message: `Already surfaced ${kind} "${subject.slice(0, 60)}${subject.length > 60 ? "…" : ""}" ${ageMin}m ago — no new alert sent. Idle this cycle.`,
          data: {
            signalId: result.signal.id,
            kind,
            subject,
            deduped: true,
            duplicateAgeMinutes: ageMin,
          },
        };
      }

      ctx.log({
        description: `Surfaced signal: ${subject.slice(0, 60)}${subject.length > 60 ? "…" : ""}`,
      });

      // Phase 2 — Pulse trigger_fired fires a real on-chain payment
      // (target_token set → kyvern.swap.{TOKEN} memo, else Pay.sh/Gemini
      // fallback). Anchored to the just-written signal so the inbox card
      // renders the green "On-chain ✓" badge with an Explorer link.
      let fireSignature: string | null = null;
      try {
        fireSignature = await firePulseTriggerSideEffect(
          {
            id: ctx.agent.id,
            deviceId: ctx.agent.deviceId,
            template: ctx.agent.template,
            config: ctx.agent.config,
          },
          kind,
          subject,
        );
      } catch {
        /* non-fatal — the signal still landed in the inbox */
      }
      if (fireSignature) {
        setSignalOnChain(result.signal.id, fireSignature);
      }

      return {
        ok: true,
        message: `Surfaced ${kind} to inbox: "${subject.slice(0, 60)}${subject.length > 60 ? "…" : ""}"${fireSignature ? ` · on-chain ✓` : ""}`,
        signature: fireSignature ?? undefined,
        data: {
          signalId: result.signal.id,
          kind,
          subject,
          firedSignature: fireSignature ?? null,
        },
      };
    }

    // Chat mode → conversation reply
    const message = String(input.message ?? "").trim();
    if (!message) {
      return {
        ok: false,
        message:
          "empty input — pass either {message: string} for chat reply or {kind, subject, evidence} for a finding",
      };
    }
    appendChat(ctx.agent.id, "agent", message);
    return {
      ok: true,
      message: `Sent message to owner: "${message.slice(0, 50)}${message.length > 50 ? "…" : ""}"`,
    };
  },
};
