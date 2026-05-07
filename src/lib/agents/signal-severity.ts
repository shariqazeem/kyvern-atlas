/**
 * signal-severity — display-time scoring for the inbox.
 *
 * Cane's transformation #4 spec asks the inbox to render each signal
 * with a coloured left accent + severity badge so the owner can
 * triage at a glance:
 *
 *   critical  red    — high-stakes finding the owner should act on now
 *   important amber  — worth attention, on-chain action attached
 *   info      blue   — heads-up announcement
 *   routine   none   — low-noise observations + condition updates
 *
 * The Signal schema doesn't carry structured numeric fields (reward
 * amounts, deadlines, dollar values), so we extract them from
 * `subject + evidence` text with a couple of small regexes. If parsing
 * fails the signal falls back to its kind-default severity.
 *
 * Both the inbox card (`SignalGroupCard`) and the WorkersFoundStrip
 * dot read from this same helper so the colour mapping stays consistent.
 */

import type { Signal, SignalKind } from "./types";

export type Severity = "critical" | "important" | "info" | "routine";

interface SignalLike {
  kind: SignalKind;
  subject: string;
  evidence: string[];
  signature?: string | null;
}

/** Pull the largest dollar amount from a string. Handles "$1,500",
 *  "$500", "$1.5k", "$10k", "$10,000", "$1M". Returns 0 if none. */
function parseLargestDollar(s: string): number {
  let max = 0;
  // $X.YZk / $XM forms
  const sufRe = /\$\s*([\d,]+(?:\.\d+)?)\s*([kKmM])/g;
  let m: RegExpExecArray | null;
  while ((m = sufRe.exec(s)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (!isFinite(n)) continue;
    const mult = m[2].toLowerCase() === "k" ? 1_000 : 1_000_000;
    max = Math.max(max, n * mult);
  }
  // $X / $X.YZ / $X,YYY forms
  const plainRe = /\$\s*([\d,]+(?:\.\d+)?)\b(?![kKmM])/g;
  while ((m = plainRe.exec(s)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (!isFinite(n)) continue;
    max = Math.max(max, n);
  }
  return max;
}

/** Returns true if the text mentions a deadline within the next 48h.
 *  Heuristic match — "ends in 36h", "closes in 2 days", "deadline tomorrow". */
function isNearDeadline(s: string): boolean {
  const text = s.toLowerCase();
  if (/(deadline|ends?|closes?)\s+(today|tomorrow|in\s*\d+\s*h\b)/i.test(s))
    return true;
  // "in 24h" / "in 36h" / "ends in 1 day" / "in 2 days"
  const hMatch = text.match(/in\s*(\d+)\s*h\b/);
  if (hMatch) return parseInt(hMatch[1], 10) <= 48;
  const dMatch = text.match(/in\s*(\d+)\s*d(ays?)?\b/);
  if (dMatch) return parseInt(dMatch[1], 10) <= 2;
  return false;
}

export function severityForSignal(s: SignalLike): Severity {
  const text = [s.subject, ...s.evidence].join(" · ");
  const maxDollars = parseLargestDollar(text);

  // ── Phase 3 kinds — short-circuit first ────────────────────────────
  if (s.kind === "drafted_application") {
    if (maxDollars >= 1000) return "critical";
    if (maxDollars >= 500) return "important";
    return "info";
  }
  if (s.kind === "wallet_alert") {
    if (maxDollars >= 500_000) return "critical";
    if (maxDollars >= 100_000) return "important";
    return "info";
  }
  if (s.kind === "trigger_fired") return "important";
  if (s.kind === "trigger_armed") return "routine";

  // ── Legacy kinds ──────────────────────────────────────────────────
  if (s.kind === "bounty" || s.kind === "opportunity") {
    if (maxDollars >= 500 && isNearDeadline(text)) return "critical";
    if (maxDollars >= 500) return "important";
  }
  if (
    (s.kind === "wallet_move" || s.kind === "market_intel") &&
    maxDollars >= 10_000
  ) {
    return "critical";
  }

  // On-chain action present → at least important.
  if (s.signature) return "important";

  // Kind-default mapping.
  switch (s.kind) {
    case "bounty":
    case "opportunity":
      return "important"; // an opportunity is always worth a glance even if small
    case "wallet_move":
    case "market_intel":
      return "important";
    case "ecosystem_announcement":
      return "info";
    case "github_release":
      return "info";
    case "price_trigger":
    case "condition_update":
    case "observation":
    default:
      return "routine";
  }
}

interface SeverityVisuals {
  /** rgba/hex for the left accent stripe + ring tint */
  accent: string;
  /** Short label for the badge ("CRITICAL", "ON-CHAIN", etc.) */
  badge: string | null;
  /** Display-only solid swatch for severity dots in compact UIs */
  dot: string;
}

/** Visual mapping for severity. The badge is null for routine so we
 *  don't render an empty pill. */
export function severityVisuals(
  s: Severity,
  hasSignature?: boolean,
): SeverityVisuals {
  switch (s) {
    case "critical":
      return { accent: "#DC2626", badge: "CRITICAL", dot: "#DC2626" };
    case "important":
      return {
        accent: "#D97706",
        badge: hasSignature ? "ON-CHAIN" : "IMPORTANT",
        dot: "#D97706",
      };
    case "info":
      return { accent: "#2563EB", badge: "INFO", dot: "#2563EB" };
    case "routine":
    default:
      return { accent: "transparent", badge: null, dot: "#9CA3AF" };
  }
}

/** True if the signal can be picked up by the "On-chain" filter — a
 *  signal counts as on-chain when it has a tx signature OR when the
 *  worker that produced it is exercising the policy program (via
 *  post_task / claim_task / stake_on_finding). The cheap proxy is
 *  signature presence; more advanced detection lives server-side. */
export function isOnChainSignal(s: Signal): boolean {
  return s.signature != null && s.signature.length > 0;
}
