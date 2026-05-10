/**
 * POST /api/keys/providers/[id]/test — verify a stored key works.
 *
 * Loads + decrypts the key, sends a 1-token request to the provider,
 * caches the result on the row (last_test_status + last_test_at),
 * returns the status to the caller.
 *
 * Cost: ~$0.0001 per test (1 input token, 1 output token, cheapest
 * model on each provider). Ratelimited at 10/min/owner to prevent
 * abuse. Plaintext key is never logged.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { decryptKey } from "@/lib/agents/graph/keys-crypto";
import {
  recordKeyTest,
  type ProviderKeyTestStatus,
} from "@/lib/agents/graph/keys-store";
import type { LlmProvider } from "@/lib/agents/graph/types";

const TEST_TIMEOUT_MS = 15_000;

const TEST_MODELS: Record<LlmProvider, string> = {
  anthropic: "claude-haiku-4-5",
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
  // openai/gpt-oss-120b is the most reliably-accessible cheap model on
  // Commonstack across account tiers (per kyvern_deploy_learnings the
  // V3.2-Exp lineup is gated for some accounts and returns 400). We
  // use it for the test endpoint specifically so a working key never
  // shows up as "unknown" just because of model access.
  commonstack: "openai/gpt-oss-120b",
};

const rateBuckets = new Map<string, number[]>();
function checkOwnerRate(owner: string): boolean {
  const now = Date.now();
  const cutoff = now - 60_000;
  const arr = (rateBuckets.get(owner) ?? []).filter((t) => t > cutoff);
  if (arr.length >= 10) {
    rateBuckets.set(owner, arr);
    return false;
  }
  arr.push(now);
  rateBuckets.set(owner, arr);
  return true;
}

interface KeyRow {
  id: string;
  owner_wallet: string;
  provider: LlmProvider;
  encrypted_key_blob: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const owner = req.headers.get("x-owner-wallet")?.trim() || "";
  if (!owner) {
    return NextResponse.json(
      { ok: false, error: "owner_wallet_required" },
      { status: 401 },
    );
  }
  if (!checkOwnerRate(owner)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 },
    );
  }
  const row = getDb()
    .prepare(
      `SELECT id, owner_wallet, provider, encrypted_key_blob
         FROM user_provider_keys WHERE id = ? AND owner_wallet = ?`,
    )
    .get(params.id, owner) as KeyRow | undefined;
  if (!row) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  let plaintext: string;
  try {
    plaintext = decryptKey(row.encrypted_key_blob);
  } catch (e) {
    recordKeyTest(row.id, owner, "unknown");
    return NextResponse.json(
      {
        ok: false,
        status: "unknown" as ProviderKeyTestStatus,
        message: `decrypt failed: ${e instanceof Error ? e.message : String(e)}`,
      },
      { status: 500 },
    );
  }

  const result = await testProviderKey(row.provider, plaintext);
  recordKeyTest(row.id, owner, result.status);
  if (result.status !== "ok") {
    console.warn(
      `[keys/test] ${row.provider} → ${result.status} (HTTP ${result.httpStatus ?? "?"}): ${(result.body ?? "").slice(0, 300)}`,
    );
  }
  return NextResponse.json({
    ok: result.status === "ok",
    status: result.status,
    httpStatus: result.httpStatus ?? null,
    detail: result.status === "ok" ? null : (result.body ?? "").slice(0, 300),
  });
}

interface TestResult {
  status: ProviderKeyTestStatus;
  httpStatus?: number;
  body?: string;
}

async function testProviderKey(
  provider: LlmProvider,
  apiKey: string,
): Promise<TestResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
  try {
    if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TEST_MODELS.anthropic,
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
        signal: controller.signal,
      });
      return classifyResponse(r);
    }
    const url =
      provider === "openai" ? "https://api.openai.com/v1/chat/completions"
      : provider === "deepseek" ? "https://api.deepseek.com/v1/chat/completions"
      : "https://api.commonstack.ai/v1/chat/completions";
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TEST_MODELS[provider],
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
      signal: controller.signal,
    });
    return classifyResponse(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("aborted")) {
      return { status: "network_error", body: "request timed out" };
    }
    return { status: "network_error", body: msg };
  } finally {
    clearTimeout(timer);
  }
}

async function classifyResponse(r: Response): Promise<TestResult> {
  const body = await r.text().catch(() => "");
  if (r.ok) return { status: "ok", httpStatus: r.status };
  if (r.status === 401 || r.status === 403) {
    return { status: "invalid", httpStatus: r.status, body };
  }
  if (r.status === 429) {
    if (/quota|limit/i.test(body)) {
      return { status: "quota_exceeded", httpStatus: r.status, body };
    }
    return { status: "quota_exceeded", httpStatus: r.status, body };
  }
  return { status: "unknown", httpStatus: r.status, body };
}
