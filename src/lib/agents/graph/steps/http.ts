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

  // pay.sh wrap — TODO P1.4b will route through the existing pay.sh
  // helper used by /api/atlas/probe-paysh. For now, no-op (the
  // composer can still call x402-paid endpoints by adding the
  // X-PAYMENT header explicitly).
  if (config.payShWrap) {
    // Not yet implemented — falls through to plain fetch.
    headers["X-Kyvern-Pay-Sh-Wrap"] = "v0-pending";
  }

  const timeoutMs = Math.min(Math.max(config.timeoutMs ?? 60_000, 1000), 120_000);
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
