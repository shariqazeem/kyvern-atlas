/**
 * watch_url — generic HTTP poller used by Path C templates.
 *
 * Composable: every Bounty Hunter, Ecosystem Watcher, and GitHub Watcher
 * is powered by this one tool. Returns new items since the worker's last
 * check, dedup'd via the watch_url_cache table.
 *
 * Fast paths (recognised by host):
 *   · earn.superteam.fun  — Superteam Earn public listings JSON
 *
 * Generic paths:
 *   · format='json' — fetch and stringify the response, hash for dedupe.
 *                     Optionally match keywords / minPrize against the body.
 *   · format='rss'  — minimal RSS 2.0 parser (regex-based, dependency-free)
 *                     extracting <item><title><link><description>.
 *   · format='html' — fetch as text, hash for change detection only (no
 *                     selector engine in v1; templates can use keyword
 *                     match against the body instead).
 *
 * Result shape (consumed by the runner's structured-message path):
 *   { ok, message, data: { found, newItems: [{id,title,url,summary,...}], totalSeen, kindHint? } }
 *
 * Worker's job after this tool returns: if `found` is true, surface each
 * item via message_user with a structured signal payload. If false, idle.
 */

import { createHash } from "crypto";
import type { AgentTool } from "../types";
import { readWatchCache, writeWatchCache } from "../store";

const FETCH_TIMEOUT_MS = 5000;
// Superteam moved their listings API from earn.superteam.fun to
// superteam.fun in early 2026 (the old host now 308-redirects, but the
// old enum values like Frontend are also rejected — we accept both
// hosts and let the URL the user/agent supplies determine the path).
const SUPERTEAM_HOSTS = new Set(["earn.superteam.fun", "superteam.fun"]);

interface NormalizedItem {
  id: string;
  title: string;
  url: string;
  summary?: string;
  rewardUsd?: number | null;
  deadline?: string | null;
}

function md5(s: string): string {
  return createHash("md5").update(s).digest("hex").slice(0, 16);
}

function detectFormatFromUrl(url: string): "json" | "rss" | "html" {
  if (url.endsWith(".rss") || url.endsWith(".xml") || url.includes("/rss")) return "rss";
  if (url.endsWith(".json") || url.includes("/api/")) return "json";
  return "html";
}

interface ListingItem {
  id?: string;
  slug?: string;
  title?: string;
  description?: string;
  rewardAmount?: number;
  usdValue?: number;
  deadline?: string;
}

async function fetchSuperteam(url: string): Promise<{ items: NormalizedItem[]; ok: boolean; raw?: string }> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { items: [], ok: false };
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { items: [], ok: false };
    }
    // Some Superteam endpoints return { listings: [...] } and others bare arrays
    const arr: ListingItem[] = Array.isArray(parsed)
      ? (parsed as ListingItem[])
      : (parsed as { listings?: ListingItem[] }).listings ?? [];
    const items: NormalizedItem[] = arr.map((it) => {
      const slug = it.slug ?? it.id ?? md5(String(it.title ?? Math.random()));
      // Superteam canonical listing URL post-2026 migration. The bare
      // /listing/<slug> path 404s; the real route is /earn/listing/<slug>.
      const listingUrl = `https://superteam.fun/earn/listing/${slug}`;
      return {
        id: String(slug),
        title: String(it.title ?? "Untitled listing"),
        url: listingUrl,
        summary: it.description ? String(it.description).slice(0, 240) : undefined,
        rewardUsd:
          typeof it.usdValue === "number"
            ? it.usdValue
            : typeof it.rewardAmount === "number"
              ? it.rewardAmount
              : null,
        deadline: it.deadline ?? null,
      };
    });
    return { items, ok: true, raw: text };
  } catch {
    return { items: [], ok: false };
  }
}

async function fetchGenericJson(url: string): Promise<{ items: NormalizedItem[]; ok: boolean; raw?: string }> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { items: [], ok: false };
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { items: [], ok: false };
    }
    // Best-effort: if the body has an array of objects with a title-like
    // field, normalise. Otherwise return one synthetic "item" representing
    // the whole snapshot — keyword match still works.
    if (Array.isArray(parsed)) {
      const arr = parsed as Array<Record<string, unknown>>;
      const items = arr.slice(0, 25).map((it, i) => ({
        id: String(it.id ?? it.slug ?? it.url ?? i),
        title: String(it.title ?? it.name ?? `item ${i}`),
        url: String(it.url ?? it.link ?? url),
        summary:
          typeof it.description === "string"
            ? it.description.slice(0, 240)
            : typeof it.body === "string"
              ? (it.body as string).slice(0, 240)
              : undefined,
      }));
      return { items, ok: true, raw: text };
    }
    return {
      items: [
        {
          id: md5(text),
          title: "JSON snapshot",
          url,
          summary: text.slice(0, 240),
        },
      ],
      ok: true,
      raw: text,
    };
  } catch {
    return { items: [], ok: false };
  }
}

async function fetchRss(url: string): Promise<{ items: NormalizedItem[]; ok: boolean; raw?: string }> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { items: [], ok: false };
    const text = await res.text();
    const items: NormalizedItem[] = [];
    // Minimal regex parser — RSS 2.0 + Atom subset
    const itemRegex = /<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = itemRegex.exec(text)) !== null && i < 25) {
      const block = m[1];
      const title = (block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1] ?? "").trim();
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
      const guid =
        block.match(/<guid[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/guid>/i)?.[1] ?? link ?? title;
      items.push({
        id: md5(String(guid)),
        title: title || "(untitled)",
        url: String(link),
        summary: desc ? desc.slice(0, 240) : undefined,
      });
      i++;
    }
    return { items, ok: true, raw: text };
  } catch {
    return { items: [], ok: false };
  }
}

async function fetchHtmlSnapshot(url: string): Promise<{ items: NormalizedItem[]; ok: boolean; raw?: string }> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { items: [], ok: false };
    const text = await res.text();
    const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = (titleMatch?.[1] ?? "Page snapshot").trim().slice(0, 160);
    return {
      items: [
        {
          id: md5(text),
          title,
          url,
          summary: undefined,
        },
      ],
      ok: true,
      raw: text,
    };
  } catch {
    return { items: [], ok: false };
  }
}

export const watchUrlTool: AgentTool = {
  id: "watch_url",
  name: "Watch URL for changes",
  description:
    "Poll an HTTP URL and return only items that are new since your last check. Supports JSON (auto-detects API responses, with a fast path for earn.superteam.fun), RSS/Atom feeds, and HTML snapshot diffs. Use minPrize to filter bounty boards by reward; matchKeywords to filter items by topic.",
  category: "read",
  costsMoney: false,
  schema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description:
          "The URL to poll. Examples: https://earn.superteam.fun/api/listings/?category=Frontend&take=15 · https://nitter.net/SolanaFndn/rss · https://api.github.com/repos/anchor-lang/anchor/releases",
      },
      format: {
        type: "string",
        enum: ["json", "rss", "html", "auto"],
        description: "How to parse the response. 'auto' (default) infers from URL.",
      },
      matchKeywords: {
        type: "string",
        description:
          "Comma-separated keywords (OR-match). Only items whose title or summary contains at least one keyword are returned. Leave empty to return all new items.",
      },
      minPrize: {
        type: "number",
        description:
          "Minimum reward in USD (bounty boards). Items below this are filtered out. Leave 0 to disable.",
      },
      sinceLastCheck: {
        type: "boolean",
        description:
          "Default true. If true, only items new since the worker's last call are returned. Set false to always return everything found.",
      },
    },
    required: ["url"],
  },
  execute: async (ctx, input) => {
    const url = String(input.url ?? "").trim();
    if (!url) return { ok: false, message: "url required" };
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { ok: false, message: `not a valid url: ${url}` };
    }
    if (!/^https?:$/.test(parsedUrl.protocol)) {
      return { ok: false, message: `only http(s) URLs supported (got ${parsedUrl.protocol})` };
    }

    const formatRaw = String(input.format ?? "auto");
    const format =
      formatRaw === "auto" ? detectFormatFromUrl(url) : (formatRaw as "json" | "rss" | "html");
    const sinceLast = input.sinceLastCheck !== false;
    const minPrize = Math.max(0, Number(input.minPrize ?? 0));
    const keywordsRaw = String(input.matchKeywords ?? "").trim();
    const keywords = keywordsRaw
      ? keywordsRaw.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean)
      : [];

    // Fetch
    let result: { items: NormalizedItem[]; ok: boolean; raw?: string };
    let kindHint: string;
    if (SUPERTEAM_HOSTS.has(parsedUrl.host)) {
      result = await fetchSuperteam(url);
      kindHint = "bounty";
    } else if (format === "rss") {
      result = await fetchRss(url);
      kindHint = "ecosystem_announcement";
    } else if (format === "json") {
      result = await fetchGenericJson(url);
      kindHint = "observation";
    } else {
      result = await fetchHtmlSnapshot(url);
      kindHint = "observation";
    }

    if (!result.ok) {
      return { ok: false, message: `fetch failed: ${url}` };
    }

    // Apply filters
    let filtered = result.items;
    if (keywords.length > 0) {
      filtered = filtered.filter((it) => {
        const hay = `${it.title} ${it.summary ?? ""}`.toLowerCase();
        return keywords.some((k) => hay.includes(k));
      });
    }
    if (minPrize > 0) {
      filtered = filtered.filter((it) => (it.rewardUsd ?? 0) >= minPrize);
    }

    // Dedupe via cache
    const cached = readWatchCache(ctx.agent.id, url);
    const seenSet = new Set(cached?.lastSeenIds ?? []);
    const newItems = sinceLast ? filtered.filter((it) => !seenSet.has(it.id)) : filtered;

    // Update cache (always — including the items we just saw)
    const allCurrentIds = result.items.map((it) => it.id);
    const merged = Array.from(new Set([...allCurrentIds, ...(cached?.lastSeenIds ?? [])]));
    const responseHash = result.raw ? md5(result.raw) : "";
    writeWatchCache(ctx.agent.id, url, responseHash, merged);

    const summary =
      newItems.length === 0
        ? `No new items at ${parsedUrl.host}${minPrize > 0 ? ` (min $${minPrize})` : ""}${keywords.length > 0 ? ` matching [${keywords.join(", ")}]` : ""}.`
        : `Found ${newItems.length} new item${newItems.length === 1 ? "" : "s"} at ${parsedUrl.host}: ${newItems
            .slice(0, 3)
            .map((it) => `"${it.title.slice(0, 50)}"`)
            .join(" · ")}`;

    return {
      ok: true,
      message: summary,
      data: {
        found: newItems.length > 0,
        newItems: newItems.slice(0, 10),
        totalScanned: result.items.length,
        kindHint,
      },
    };
  },
};
