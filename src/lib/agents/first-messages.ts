/**
 * First-60-seconds copy — hand-written, never LLM-generated.
 *
 * Two artifacts per worker, both derived server-side from the picked
 * template + the job_prompt the user typed:
 *
 *   1. firstMessage   — the single chat-bubble the worker types out at
 *                        the top of the agent detail page. One paragraph
 *                        in-character. Persisted to agents.metadata_json.
 *
 *   2. bootBeats      — seven status lines that unfold over ~45s while
 *                        the user waits for the first thought. Written
 *                        to agent_status_updates with future created_at
 *                        offsets so the client can poll and reveal them
 *                        as time elapses.
 *
 * Why scripted (not LLM-generated)? The first 60 seconds is the most
 * load-bearing moment in the product. We refuse to let it depend on a
 * model that might rate-limit, hallucinate, or land flat. These strings
 * are the worker's voice, frozen at spawn.
 */
import type { AgentTemplate } from "./types";

/** Total beat count rendered by the BootSequence stack. */
export const BOOT_BEAT_COUNT = 7;

/** ms offsets from agent.createdAt at which each beat becomes visible. */
export const BOOT_BEAT_OFFSETS_MS: number[] = [
  0,      // 00:00 — waking up
  3_000,  // 00:03 — reading the brief
  8_000,  // 00:08 — checking source
  14_000, // 00:14 — got items back
  22_000, // 00:22 — narrowing
  30_000, // 00:30 — found something
  42_000, // 00:42 — sent
];

export interface FirstSixtySeconds {
  firstMessage: string;
  bootBeats: string[];
  /** Lightweight, parsed projection of the job_prompt — used by the
   *  LiveWorkerCard's "WATCHING" line. */
  watchingTarget: string;
}

interface ParsedJob {
  sourceLabel: string;        // user-friendly host or wallet shortform
  filterDescription: string;  // e.g. "Development bounties over $500"
  cadenceLabel: string;       // e.g. "every 10 minutes"
  /** Best display string for the LiveWorkerCard "watching" row. Tries to
   *  preserve the raw URL/wallet for click-through, falls back to
   *  sourceLabel. */
  watchingLine: string;
}

/* ─────────────────────────────────────────────────────────────────── */
/*                       Cadence & generic helpers                      */
/* ─────────────────────────────────────────────────────────────────── */

function cadenceLabel(frequencySeconds: number): string {
  if (frequencySeconds <= 90) return `every ${Math.max(60, frequencySeconds)} seconds`;
  const minutes = Math.round(frequencySeconds / 60);
  return `every ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function shortenAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function firstUrl(s: string): string | null {
  const m = s.match(/https?:\/\/[^\s)\]"']+/i);
  return m ? m[0] : null;
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/*                        Per-template parsers                          */
/* ─────────────────────────────────────────────────────────────────── */

function parseBountyHunter(jobPrompt: string, frequencySeconds: number): ParsedJob {
  const url = firstUrl(jobPrompt);
  const host = url ? hostFromUrl(url) : "";
  const minPrize = jobPrompt.match(/minPrize\s*=?\s*(\d+)/i);
  const categoryMatch = jobPrompt.match(/category[=:]?\s*['"]?([A-Za-z]+)/i);

  const filterParts: string[] = [];
  if (categoryMatch) filterParts.push(`${categoryMatch[1]} bounties`);
  else if (host.includes("superteam")) filterParts.push("Superteam bounties");
  else filterParts.push("bounties");
  if (minPrize) filterParts.push(`over $${minPrize[1]}`);

  const sourceLabel = host || "the bounty board you pointed me at";
  return {
    sourceLabel,
    filterDescription: filterParts.join(" "),
    cadenceLabel: cadenceLabel(frequencySeconds),
    watchingLine: url ?? sourceLabel,
  };
}

function parseEcosystemWatcher(jobPrompt: string, frequencySeconds: number): ParsedJob {
  const urls = jobPrompt.match(/https?:\/\/[^\s)\]"']+/gi) ?? [];
  const hosts = urls.map(hostFromUrl);
  const uniqueHosts = Array.from(new Set(hosts));
  let sourceLabel: string;
  if (uniqueHosts.length === 0) sourceLabel = "the ecosystem feeds you pointed me at";
  else if (uniqueHosts.length === 1) sourceLabel = uniqueHosts[0];
  else if (uniqueHosts.length === 2) sourceLabel = `${uniqueHosts[0]} + ${uniqueHosts[1]}`;
  else sourceLabel = `${uniqueHosts[0]}, ${uniqueHosts[1]} + ${uniqueHosts.length - 2} more`;

  return {
    sourceLabel,
    filterDescription: "ecosystem updates",
    cadenceLabel: cadenceLabel(frequencySeconds),
    watchingLine: urls[0] ?? sourceLabel,
  };
}

function parseWhaleTracker(jobPrompt: string, frequencySeconds: number): ParsedJob {
  const addr = jobPrompt.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  const wallet = addr ? addr[0] : "";
  const threshold = jobPrompt.match(/(?:minUsdThreshold|>\s*\$?)\s*(\d+(?:[\.,]\d+)?)/i);
  const filterParts: string[] = ["wallet moves"];
  if (threshold) filterParts.push(`over $${threshold[1].replace(",", "")}`);

  const sourceLabel = wallet ? shortenAddress(wallet) : "the wallet you pointed me at";
  return {
    sourceLabel,
    filterDescription: filterParts.join(" "),
    cadenceLabel: cadenceLabel(frequencySeconds),
    watchingLine: wallet || sourceLabel,
  };
}

function parseTokenPulse(jobPrompt: string, frequencySeconds: number): ParsedJob {
  // Look for SYM in 'SYM' or "SYM" or with read_dex
  let symbol = "";
  const dexMatch = jobPrompt.match(/read_dex\s*(?:with)?\s*['"]?([A-Z]{2,8})['"]?/);
  if (dexMatch) symbol = dexMatch[1];
  if (!symbol) {
    const inlineMatch = jobPrompt.match(/\b([A-Z]{3,6})\b\s+(?:price|outside|band|moves|crosses)/);
    if (inlineMatch) symbol = inlineMatch[1];
  }
  const bandMatch = jobPrompt.match(/\$([\d.]+)\s*[–\-—]\s*\$([\d.]+)/);

  const filterParts: string[] = [];
  if (symbol) filterParts.push(symbol);
  filterParts.push("price");
  if (bandMatch) filterParts.push(`crossing $${bandMatch[1]}–$${bandMatch[2]}`);

  const sourceLabel = symbol || "the token you pointed me at";
  return {
    sourceLabel,
    filterDescription: filterParts.join(" "),
    cadenceLabel: cadenceLabel(frequencySeconds),
    watchingLine: symbol || sourceLabel,
  };
}

function parseGithubWatcher(jobPrompt: string, frequencySeconds: number): ParsedJob {
  const repoMatch = jobPrompt.match(/api\.github\.com\/repos\/([^\s/]+)\/([^\s/]+)/i);
  let repo = "";
  if (repoMatch) repo = `${repoMatch[1]}/${repoMatch[2]}`;
  if (!repo) {
    const slashMatch = jobPrompt.match(/\b([\w.-]+\/[\w.-]+)\b/);
    if (slashMatch) repo = slashMatch[1];
  }

  const sourceLabel = repo || "the repo you pointed me at";
  return {
    sourceLabel,
    filterDescription: "new releases",
    cadenceLabel: cadenceLabel(frequencySeconds),
    watchingLine: repo || sourceLabel,
  };
}

function parseGeneric(jobPrompt: string, frequencySeconds: number): ParsedJob {
  const url = firstUrl(jobPrompt);
  const sourceLabel = url ? hostFromUrl(url) : "the source you pointed me at";
  return {
    sourceLabel,
    filterDescription: "what you asked me to watch",
    cadenceLabel: cadenceLabel(frequencySeconds),
    watchingLine: url ?? sourceLabel,
  };
}

function parseJob(template: AgentTemplate, jobPrompt: string, frequencySeconds: number): ParsedJob {
  switch (template) {
    case "bounty_hunter": return parseBountyHunter(jobPrompt, frequencySeconds);
    case "ecosystem_watcher": return parseEcosystemWatcher(jobPrompt, frequencySeconds);
    case "whale_tracker": return parseWhaleTracker(jobPrompt, frequencySeconds);
    case "token_pulse": return parseTokenPulse(jobPrompt, frequencySeconds);
    case "github_watcher": return parseGithubWatcher(jobPrompt, frequencySeconds);
    default: return parseGeneric(jobPrompt, frequencySeconds);
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/*                  First message — hand-written per template           */
/* ─────────────────────────────────────────────────────────────────── */

function firstMessageFor(name: string, template: AgentTemplate, parsed: ParsedJob): string {
  switch (template) {
    case "bounty_hunter":
      return `Hi. I'm ${name}. You told me to watch ${parsed.sourceLabel} for ${parsed.filterDescription}. I'll check ${parsed.cadenceLabel} and ping you the moment something fits. First sweep starting now.`;
    case "whale_tracker":
      return `Hi. I'm ${name}. I'll watch ${parsed.sourceLabel} continuously. Most of the time nothing happens — that's the job. When they move size, I'll tell you immediately.`;
    case "token_pulse":
      return `Hi. I'm ${name}. ${parsed.sourceLabel} is being watched. I'll alert you only when it crosses your bands or volume jumps. Quiet otherwise.`;
    case "ecosystem_watcher":
      return `Hi. I'm ${name}. I'm subscribing to ${parsed.sourceLabel} now. The next time something interesting drops, you'll see it here first.`;
    case "github_watcher":
      return `Hi. I'm ${name}. I'll watch ${parsed.sourceLabel} for releases. Nothing surfaces until there's actually a new tag.`;
    default:
      return `Hi. I'm ${name}. I just read the brief you wrote. I'll check ${parsed.cadenceLabel} and surface anything that matches. First sweep starting now.`;
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/*                Boot beats — 7 lines, in-character per template       */
/* ─────────────────────────────────────────────────────────────────── */

function bootBeatsFor(name: string, template: AgentTemplate, parsed: ParsedJob): string[] {
  switch (template) {
    case "bounty_hunter":
      return [
        `${name} · waking up`,
        `${name} · reading the brief you wrote`,
        `${name} · checking ${parsed.sourceLabel}`,
        `${name} · pulling the latest listings`,
        `${name} · narrowing to ones that match — ${parsed.filterDescription}`,
        `${name} · found something. writing it up.`,
        `${name} · sent. check your inbox.`,
      ];
    case "whale_tracker":
      return [
        `${name} · waking up`,
        `${name} · reading the brief you wrote`,
        `${name} · locking on to ${parsed.sourceLabel}`,
        `${name} · pulling the last 20 transfers`,
        `${name} · scanning for moves over your threshold`,
        `${name} · finishing the first scan…`,
        `${name} · live. I'll ping you when they move size.`,
      ];
    case "token_pulse":
      return [
        `${name} · waking up`,
        `${name} · reading the brief you wrote`,
        `${name} · pulling ${parsed.sourceLabel} price`,
        `${name} · checking it against your bands`,
        `${name} · setting up the volume baseline`,
        `${name} · finishing the first read…`,
        `${name} · live. I'll only ping on real moves.`,
      ];
    case "ecosystem_watcher":
      return [
        `${name} · waking up`,
        `${name} · reading the brief you wrote`,
        `${name} · subscribing to ${parsed.sourceLabel}`,
        `${name} · pulling the latest posts`,
        `${name} · marking what you've already seen`,
        `${name} · finishing the first sweep…`,
        `${name} · live. The next drop lands here first.`,
      ];
    case "github_watcher":
      return [
        `${name} · waking up`,
        `${name} · reading the brief you wrote`,
        `${name} · fetching ${parsed.sourceLabel} releases`,
        `${name} · noting the latest tag`,
        `${name} · setting the watch baseline`,
        `${name} · finishing the first check…`,
        `${name} · live. The next release lands here first.`,
      ];
    default:
      return [
        `${name} · waking up`,
        `${name} · reading the brief you wrote`,
        `${name} · checking ${parsed.sourceLabel}`,
        `${name} · pulling the latest data`,
        `${name} · narrowing to ${parsed.filterDescription}`,
        `${name} · finishing the first cycle…`,
        `${name} · live. First finding incoming.`,
      ];
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/*                              Public API                              */
/* ─────────────────────────────────────────────────────────────────── */

export function buildFirstSixtySeconds(input: {
  name: string;
  template: AgentTemplate;
  jobPrompt: string;
  frequencySeconds: number;
}): FirstSixtySeconds {
  const parsed = parseJob(input.template, input.jobPrompt, input.frequencySeconds);
  return {
    firstMessage: firstMessageFor(input.name, input.template, parsed),
    bootBeats: bootBeatsFor(input.name, input.template, parsed),
    watchingTarget: parsed.watchingLine,
  };
}
