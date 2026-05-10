"use client";

/**
 * TestRunPanel — surfaces the result of a "Test run" button click.
 *
 * Shows each step's status (✓ / ✗ / skipped), output preview, and
 * a chain-tx Explorer link for any vault.pay / transfer.usdc steps.
 * Total cost + total wall-clock at the bottom.
 */

import { X, ExternalLink } from "lucide-react";
import type { AgentRun, StepOutput } from "@/lib/agents/graph/types";

export interface TestRunResult {
  ok: boolean;
  run?: AgentRun;
  error?: string;
}

interface Props {
  result: TestRunResult;
  onClose: () => void;
}

export function TestRunPanel({ result, onClose }: Props) {
  const run = result.run;
  return (
    <div
      className="rounded-[12px] p-3 flex flex-col gap-2"
      style={{
        background: result.ok ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)",
        border: `1px solid ${result.ok ? "rgba(34,197,94,0.30)" : "rgba(239,68,68,0.30)"}`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{
              fontSize: 9,
              color: result.ok ? "#15803D" : "#B91C1C",
            }}
          >
            {result.ok ? "Test run · " + run?.status : "Failed"}
          </span>
          {run && (
            <span
              className="font-mono"
              style={{ fontSize: 10, color: "#9CA3AF" }}
            >
              ${run.totalCostUsd.toFixed(4)} ·{" "}
              {run.finishedAt && run.startedAt
                ? `${run.finishedAt - run.startedAt}ms`
                : ""}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100"
          style={{ color: "#9CA3AF" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {result.error && !run && (
        <p className="text-[12px] font-mono" style={{ color: "#B91C1C" }}>
          {result.error}
        </p>
      )}

      {run && (
        <div className="flex flex-col gap-1.5">
          {run.stepOutputs.length === 0 && (
            <p className="text-[11.5px]" style={{ color: "rgba(15,23,42,0.55)" }}>
              No step outputs.
            </p>
          )}
          {run.stepOutputs.map((s, i) => (
            <StepRow key={`${s.stepId}-${i}`} output={s} />
          ))}
          {run.errorMessage && (
            <p
              className="text-[11.5px] font-mono mt-1"
              style={{ color: "#B91C1C" }}
            >
              {run.errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StepRow({ output }: { output: StepOutput }) {
  const explorerUrl = output.signature
    ? `https://explorer.solana.com/tx/${output.signature}?cluster=devnet`
    : null;

  return (
    <div
      className="rounded-[8px] p-2"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.08)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          style={{
            color:
              output.status === "succeeded" ? "#15803D"
              : output.status === "failed" ? "#B91C1C"
              : "#9CA3AF",
          }}
        >
          {output.status === "succeeded" ? "✓" : output.status === "failed" ? "✗" : "—"}
        </span>
        <span
          className="font-mono uppercase tracking-[0.10em]"
          style={{ fontSize: 8.5, color: "#9CA3AF" }}
        >
          {output.type}
        </span>
        <span
          className="text-[11.5px] font-medium truncate"
          style={{ color: "#0A0A0A" }}
        >
          {output.label}
        </span>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-0.5 text-[10.5px] font-mono hover:underline"
            style={{ color: "#0A0A0A" }}
          >
            Explorer <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
        <span className="font-mono ml-auto" style={{ fontSize: 9.5, color: "#9CA3AF" }}>
          {output.finishedAt - output.startedAt}ms
        </span>
      </div>
      {output.error && (
        <p className="mt-1 text-[10.5px] font-mono" style={{ color: "#B91C1C" }}>
          {output.error}
        </p>
      )}
      {output.status === "succeeded" && output.output !== null && (
        <pre
          className="mt-1 text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-words"
          style={{ color: "rgba(15,23,42,0.65)", maxHeight: 80 }}
        >
          {previewOutput(output.output)}
        </pre>
      )}
    </div>
  );
}

function previewOutput(output: unknown): string {
  if (output === null || output === undefined) return "null";
  if (typeof output === "string") return output.slice(0, 200);
  try {
    const json = JSON.stringify(output, null, 2);
    return json.length > 400 ? json.slice(0, 400) + "…" : json;
  } catch {
    return String(output);
  }
}
