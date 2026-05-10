/**
 * HTTP step — fetch any URL, optionally wrapped in pay.sh for x402
 * paid endpoints.
 *
 * SSRF protection: rejects localhost, link-local, private IP ranges,
 * and unencoded IP literals to prevent the executor from being used
 * as an internal-network proxy. The user-facing rule of thumb: only
 * public DNS-resolved hostnames over HTTPS (HTTP allowed for now,
 * tightened later if needed).
 *
 * Body size cap: 5 MB on the response. Larger responses are
 * truncated and the step returns ok:false with `response_too_large`.
 */

import { interpolate, interpolateDeep } from "../interpolate";
import type {
  HttpStepConfig,
  RunContext,
  StepExecutionResult,
} from "../types";

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc/i,
  /^fe80:/i,
  /^localhost$/i,
];

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_RANGES.some((re) => re.test(hostname));
}

export async function executeHttp(
  ctx: RunContext,
  config: HttpStepConfig,
): Promise<StepExecutionResult> {
  const url = interpolate(config.url, ctx.vars);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, output: null, error: `invalid URL "${url}"` };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      output: null,
      error: `unsupported protocol "${parsed.protocol}"`,
    };
  }
  if (isPrivateHost(parsed.hostname)) {
    return {
      ok: false,
      output: null,
      error: `private/loopback host blocked: ${parsed.hostname}`,
    };
  }

  // Interpolate headers + body
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(config.headers ?? {})) {
    headers[k] = interpolate(v, ctx.vars);
  }
  let body: string | undefined;
  if (config.body !== null && config.body !== undefined) {
    const interpolatedBody = interpolateDeep(config.body, ctx.vars);
    body = JSON.stringify(interpolatedBody);
    if (!headers["content-type"] && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  const timeoutMs = Math.min(Math.max(config.timeoutMs ?? 60_000, 1000), 120_000);

  // pay.sh wrap — settle a chain-enforced $0.001 USDC payment via
  // serverVaultPay (so the policy program gates the API spend), then
  // shell out to the pay binary which handles the x402 paid call.
  // Same path /api/atlas/probe-paysh uses.
  //
  // The chain-enforcement story: every pay.sh call passes through
  // PpmZ…MSqc first. Cap exceeded → chain refusal before pay.sh
  // is invoked at all. This is the differentiator vs raw pay.sh.
  if (config.payShWrap) {
    return executePayShWrap(ctx, parsed.toString(), timeoutMs);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      method: config.method,
      headers,
      body,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      output: null,
      error: msg.includes("aborted") ? `request timed out after ${timeoutMs}ms` : msg,
    };
  }
  clearTimeout(timer);

  if (config.expectStatus !== undefined && response.status !== config.expectStatus) {
    // Still capture body for debugging
    const bodyText = await response.text().catch(() => "");
    return {
      ok: false,
      output: { status: response.status, body: bodyText.slice(0, 4096) },
      error: `expected status ${config.expectStatus} got ${response.status}`,
    };
  }

  // Cap body size
  const reader = response.body?.getReader();
  let total = 0;
  const chunks: Uint8Array[] = [];
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        return {
          ok: false,
          output: null,
          error: `response_too_large (>${MAX_RESPONSE_BYTES} bytes)`,
        };
      }
      chunks.push(value);
    }
  }
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  const ct = response.headers.get("content-type") ?? "";
  let parsedBody: unknown = buf.toString("utf8");
  if (ct.includes("application/json")) {
    try { parsedBody = JSON.parse(parsedBody as string); }
    catch { /* keep as text */ }
  }

  return {
    ok: true,
    output: {
      status: response.status,
      body: parsedBody,
      headers: Object.fromEntries(response.headers.entries()),
    },
  };
}

/* ─── pay.sh wrap (real x402 path) ───────────────────────────── */

// Atlas's owner wallet — stable platform-side recipient with a USDC
// ATA since 2026-04-20. The vault.pay routes here, the chain enforces
// the cap, then we shell out to the pay binary to do the actual
// x402 payment + fetch.
const PAYSH_RECIPIENT = "26H7uJfss352DnB8uWc1MTgg2Vuk2ZL9oEwV2i7sLTpp";
// Default amount per pay.sh call — small, well under typical caps.
const PAYSH_DEFAULT_USD = 0.001;

async function executePayShWrap(
  ctx: RunContext,
  url: string,
  timeoutMs: number,
): Promise<StepExecutionResult> {
  // Lazy-load to keep the bundle small for graphs that don't use
  // pay.sh.
  const [{ serverVaultPay }, { execFile }, { promisify }] = await Promise.all([
    import("@/lib/server-pay"),
    import("child_process"),
    import("util"),
  ]);
  const execFileAsync = promisify(execFile);

  // 1. Off-chain check + chain settle. The chain enforces the cap;
  //    if refused, pay.sh is never called.
  const fire = await serverVaultPay({
    vaultId: ctx.vaultId,
    merchant: "api.pay.sh",
    recipientPubkey: PAYSH_RECIPIENT,
    amountUsd: PAYSH_DEFAULT_USD,
    memo: `pay.sh wrap · ${new URL(url).host}`,
    logEvent: {
      eventType: "spending_sent",
      counterparty: "🛰️ Pay.sh",
      description: `pay.sh · ${new URL(url).host} · $${PAYSH_DEFAULT_USD.toFixed(3)}`,
    },
  });
  if (!fire.success) {
    return {
      ok: false,
      output: {
        reason: fire.reason ?? "vault.pay refused",
        blocked: !!fire.blocked,
        signature: fire.signature ?? null,
        explorerUrl: fire.explorerUrl ?? null,
      },
      error: fire.reason ?? "pay.sh wrap refused on-chain",
      signature: fire.signature ?? undefined,
      signatureStatus: "failed",
      costUsd: 0,
    };
  }

  // 2. Shell out to `pay --sandbox curl <url>`. Same path
  //    /api/atlas/probe-paysh uses. Sandbox flag means an ephemeral
  //    wallet is used at the pay.sh layer (no real money there).
  const PAY_BIN = process.env.PAY_BIN ?? "pay";
  let payOutput = "";
  try {
    const { stdout } = await execFileAsync(
      PAY_BIN,
      ["--sandbox", "curl", url],
      { timeout: timeoutMs, maxBuffer: 256 * 1024 },
    );
    payOutput = stdout;
  } catch (e) {
    return {
      ok: false,
      output: {
        chain_settled: true,
        signature: fire.signature,
        explorerUrl: fire.explorerUrl,
        pay_error: e instanceof Error ? e.message : String(e),
      },
      error: `pay binary error: ${e instanceof Error ? e.message : e}`,
      signature: fire.signature ?? undefined,
      signatureStatus: "success",
      costUsd: PAYSH_DEFAULT_USD,
    };
  }

  // 3. Parse pay output. The pay binary interleaves status events on
  //    stdout; the actual API response is the last JSON-looking line.
  const trimmed = payOutput.trim();
  const lines = trimmed.split("\n").filter((l) => l.trim().length > 0);
  let parsedPayBody: unknown = trimmed;
  for (let i = lines.length - 1; i >= 0; i--) {
    const c = lines[i].trim();
    if (c.startsWith("{") || c.startsWith("[")) {
      try { parsedPayBody = JSON.parse(c); break; } catch { /* keep raw */ }
    }
  }

  return {
    ok: true,
    output: {
      status: 200,
      body: parsedPayBody,
      paySh: {
        settled: true,
        signature: fire.signature,
        explorerUrl: fire.explorerUrl,
        amountUsd: PAYSH_DEFAULT_USD,
      },
    },
    signature: fire.signature ?? undefined,
    signatureStatus: "success",
    costUsd: PAYSH_DEFAULT_USD,
  };
}
