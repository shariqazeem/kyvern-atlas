/**
 * Atlas signal production — Path C Sprint 3, "two-birds" approach.
 *
 * Atlas keeps its existing 6-day decide() → pay() → record loop
 * untouched (that's the credibility moat). On top of that loop, every
 * 5 cycles (~15 minutes on a 3-min cadence) we run this function:
 * fetch one ecosystem source, detect new items via the watch_url_cache,
 * and write any new items into the `signals` table as Atlas findings.
 *
 * No LLM call, no policy spend — just structured data extraction.
 * Atlas continues to be the proof unit; it now also produces real
 * signals into the Inbox the same way user workers do.
 *
 * Sources rotate so we don't hammer one feed: Solana Foundation blog
 * (RSS), Solana Labs releases (GitHub JSON), Anchor releases (GitHub
 * JSON). If a source fails, we silently move on — never blocks Atlas.
 */

import { createHash } from "crypto";
import {
  writeSignal,
  readWatchCache,
  writeWatchCache,
} from "@/lib/agents/store";
import type { SignalKind } from "@/lib/agents/types";

export const ATLAS_AGENT_ID = "agt_atlas";
export const ATLAS_DEVICE_ID = "vlt_QcCPbp3XTzHtF5";

const FETCH_TIMEOUT_MS = 6_000;
const MAX_NEW_ITEMS_PER_PASS = 3;

interface FindingSource {
  url: string;
  format: "rss" | "github-releases";
  kind: SignalKind;
  label: string;
}

const SOURCES: FindingSource[] = [
  {
    url: "https://solana.com/news/rss.xml",
    format: "rss",
    kind: "ecosystem_announcement",
    label: "Solana Foundation blog",
  },
  {
    url: "https://api.github.com/repos/solana-labs/solana/releases",
    format: "github-releases",
    kind: "github_release",
    label: "Solana Labs releases",
  },
  {
    url: "https://api.github.com/repos/coral-xyz/anchor/releases",
    format: "github-releases",
    kind: "github_release",
    label: "Anchor releases",
  },
];

interface ParsedItem {
  id: string;
  title: string;
  url: string;
  evidence: string[];
  suggestion?: string;
}

function md5(s: string): string {
  return createHash("md5").update(s).digest("hex").slice(0, 16);
}

async function fetchRssItems(url: string): Promise<ParsedItem[]> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const text = await res.text();
    const items: ParsedItem[] = [];
    const itemRegex = /<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = itemRegex.exec(text)) !== null && i < 10) {
      const block = m[1];
      const title = (
        block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1] ?? ""
      ).trim();
      const link =
        block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() ??
        block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ??
        url;
      const desc = (
        block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1] ??
        block.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i)?.[1] ??
        ""
      )
        .replace(/<[^>]+>/g, "")
        .trim();
      const pubDate = (
        block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ??
        block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1] ??
        ""
      ).trim();
      const guid =
        block.match(/<guid[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/guid>/i)?.[1] ?? link ?? title;
      const evidence: string[] = [];
      if (desc) evidence.push(desc.slice(0, 200));
      if (pubDate) evidence.push(`Published: ${pubDate.slice(0, 32)}`);
      items.push({
        id: md5(String(guid)),
        title: title || "(untitled)",
        url: String(link),
        evidence: evidence.length > 0 ? evidence : ["(no description)"],
      });
      i++;
    }
    return items;
  } catch {
    return [];
  }
}

interface GithubReleaseRaw {
  id?: number | string;
  name?: string;
  tag_name?: string;
  html_url?: string;
  body?: string;
  published_at?: string;
  author?: { login?: string };
}

async function fetchGithubReleases(url: string): Promise<ParsedItem[]> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as GithubReleaseRaw[];
    if (!Array.isArray(json)) return [];
    return json.slice(0, 10).map((r) => {
      const tag = r.tag_name ?? "?";
      const name = r.name ?? tag;
      const evidence: string[] = [];
      if (r.body) evidence.push(r.body.slice(0, 220).replace(/\s+/g, " ").trim());
      if (r.published_at) evidence.push(`Published: ${r.published_at.slice(0, 10)}`);
      if (r.author?.login) evidence.push(`By: @${r.author.login}`);
      return {
        id: md5(String(r.id ?? r.tag_name ?? r.name ?? Math.random())),
        title: `${name} ${tag !== name ? "(" + tag + ")" : ""}`.trim(),
        url: r.html_url ?? url,
        evidence: evidence.length > 0 ? evidence : ["(no body)"],
      };
    });
  } catch {
    return [];
  }
}

export interface AtlasFindingsOutcome {
  source: string;
  fetched: number;
  produced: number;
  signalIds: string[];
}

export async function produceAtlasFindings(cycleNumber: number): Promise<AtlasFindingsOutcome | null> {
  const source = SOURCES[Math.abs(cycleNumber) % SOURCES.length];

  let items: ParsedItem[] = [];
  if (source.format === "rss") {
    items = await fetchRssItems(source.url);
  } else if (source.format === "github-releases") {
    items = await fetchGithubReleases(source.url);
  }

  if (items.length === 0) {
    return { source: source.label, fetched: 0, produced: 0, signalIds: [] };
  }

  // Dedupe via watch_url_cache (Atlas reuses the same table user
  // workers use, keyed by (agent_id, url) — Atlas's agent_id is
  // 'agt_atlas', so the cache namespace is naturally isolated).
  const cached = readWatchCache(ATLAS_AGENT_ID, source.url);
  const seenSet = new Set(cached?.lastSeenIds ?? []);

  const newItems = items.filter((it) => !seenSet.has(it.id)).slice(0, MAX_NEW_ITEMS_PER_PASS);

  const signalIds: string[] = [];
  for (const it of newItems) {
    const result = writeSignal({
      agentId: ATLAS_AGENT_ID,
      deviceId: ATLAS_DEVICE_ID,
      kind: source.kind,
      subject: it.title.slice(0, 200),
      evidence: it.evidence,
      sourceUrl: it.url,
    });
    // writeSignal now returns { signal, created, duplicateAgeMs? }
    // for server-side dedup. Atlas's per-source watch cache already
    // dedupes upstream (we filter by seenSet a few lines up), but if
    // the storage-layer gate also fires we still get back the
    // existing signal id — append it so the response stays
    // consistent with the user-facing meaning of "the signal
    // associated with this item".
    signalIds.push(result.signal.id);
  }

  // Always update cache — including items we didn't surface (cap reached
  // or already seen). This keeps the cache lean and ensures we don't
  // re-process the same items next pass.
  const allCurrentIds = items.map((it) => it.id);
  const merged = Array.from(new Set([...allCurrentIds, ...(cached?.lastSeenIds ?? [])]));
  const responseHash = md5(items.map((it) => it.id).join("|"));
  writeWatchCache(ATLAS_AGENT_ID, source.url, responseHash, merged);

  return {
    source: source.label,
    fetched: items.length,
    produced: signalIds.length,
    signalIds,
  };
}
