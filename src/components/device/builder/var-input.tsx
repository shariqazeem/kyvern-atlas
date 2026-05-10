"use client";

/**
 * VarInput — text input + textarea with `{{` autocomplete.
 *
 * Typing `{{` opens a floating dropdown anchored to the cursor that
 * lists available paths from the current run context: prior steps'
 * outputVars (with sensible field guesses per step type), plus
 * reserved paths (`trigger.payload.*`, `vault.id`).
 *
 *   • Arrow keys navigate
 *   • Enter / Tab inserts and closes
 *   • Escape dismisses without inserting
 *   • Click outside dismisses
 *
 * Drop-in replacement for <input> and <textarea> in step forms. The
 * caller supplies `priorSteps` so the suggestions stay scoped to
 * variables that exist by the time this step runs.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { StepDef } from "@/lib/agents/graph/types";

interface Suggestion {
  /** Fully-qualified path (e.g. `step1.text`, `trigger.payload.amount`). */
  path: string;
  /** Short type hint shown in dim text on the right of the row. */
  typeHint: string;
  /** Group label — "Prior steps" / "Trigger" / "Vault". */
  group: string;
}

interface VarInputProps {
  value: string;
  onChange: (next: string) => void;
  priorSteps: StepDef[];
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  style?: CSSProperties;
  font?: "default" | "mono";
}

export function VarInput({
  value,
  onChange,
  priorSteps,
  multiline = false,
  rows = 2,
  placeholder,
  maxLength,
  className,
  style,
  font = "default",
}: VarInputProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [filter, setFilter] = useState("");
  // Position relative to the input element
  const [anchor, setAnchor] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const allSuggestions = useMemo(
    () => buildSuggestions(priorSteps),
    [priorSteps],
  );
  const filtered = useMemo(() => {
    if (!filter) return allSuggestions;
    const q = filter.toLowerCase();
    return allSuggestions.filter((s) =>
      s.path.toLowerCase().includes(q),
    );
  }, [allSuggestions, filter]);

  /** When the user types `{{`, open the dropdown. Tracking via the
   *  most recent change to the input value — find the unclosed
   *  `{{` to the left of the cursor. */
  function checkOpen() {
    const el = inputRef.current;
    if (!el) {
      setOpen(false);
      return;
    }
    const cursor = el.selectionStart ?? 0;
    const before = el.value.slice(0, cursor);
    // Look for the most recent `{{` that isn't closed by a `}}`
    const lastOpen = before.lastIndexOf("{{");
    if (lastOpen < 0) {
      setOpen(false);
      return;
    }
    const slice = before.slice(lastOpen + 2);
    if (slice.includes("}}")) {
      setOpen(false);
      return;
    }
    // The slice is the partial path the user is typing
    setFilter(slice);
    setActive(0);
    setOpen(true);
    // Anchor the dropdown below the input. We don't need
    // pixel-perfect cursor tracking — input-bottom-left is fine.
    if (el.parentElement) {
      const rect = el.getBoundingClientRect();
      const parentRect = el.parentElement.getBoundingClientRect();
      setAnchor({
        top: rect.bottom - parentRect.top + 4,
        left: rect.left - parentRect.left,
      });
    }
  }

  function insertSuggestion(s: Suggestion) {
    const el = inputRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? 0;
    const before = el.value.slice(0, cursor);
    const after = el.value.slice(cursor);
    const lastOpen = before.lastIndexOf("{{");
    if (lastOpen < 0) {
      setOpen(false);
      return;
    }
    // Replace from `{{` to cursor with `{{path}}`
    const next = before.slice(0, lastOpen) + `{{${s.path}}}` + after;
    onChange(next);
    setOpen(false);
    // Defer focus + caret restore to next tick so the React state
    // catches up.
    setTimeout(() => {
      const elNow = inputRef.current;
      if (elNow) {
        const newPos = lastOpen + s.path.length + 4;
        elNow.focus();
        try {
          elNow.setSelectionRange(newPos, newPos);
        } catch {
          /* setSelectionRange isn't supported on all input types */
        }
      }
    }, 0);
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    onChange(e.target.value);
    // Defer the open-check until after onChange propagates
    setTimeout(checkOpen, 0);
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (filtered[active]) {
        e.preventDefault();
        insertSuggestion(filtered[active]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = inputRef.current;
      if (!el) return;
      const tgt = e.target as Node;
      if (el.contains(tgt)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const inputClassName = [
    "w-full",
    font === "mono" ? "font-mono" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={rows}
          placeholder={placeholder}
          maxLength={maxLength}
          className={inputClassName}
          style={style}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          className={inputClassName}
          style={style}
        />
      )}

      {open && filtered.length > 0 && (
        <div
          className="absolute z-50 rounded-[8px] overflow-hidden"
          style={{
            top: anchor.top,
            left: anchor.left,
            width: 320,
            background: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.10)",
            boxShadow: "0 16px 40px -12px rgba(15,23,42,0.25)",
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {groupSuggestions(filtered).map((group) => (
            <div key={group.label}>
              <div
                className="px-2.5 pt-1.5 pb-0.5 font-mono uppercase tracking-[0.12em]"
                style={{ fontSize: 9, color: "#9CA3AF" }}
              >
                {group.label}
              </div>
              {group.items.map((s, idx) => {
                const globalIdx = filtered.indexOf(s);
                const isActive = globalIdx === active;
                return (
                  <button
                    key={`${group.label}-${idx}-${s.path}`}
                    type="button"
                    onMouseDown={(e) => {
                      // mousedown so it fires before the input's blur
                      e.preventDefault();
                      insertSuggestion(s);
                    }}
                    onMouseEnter={() => setActive(globalIdx)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
                    style={{
                      background: isActive
                        ? "rgba(34,197,94,0.08)"
                        : "transparent",
                    }}
                  >
                    <code
                      className="font-mono flex-1 truncate"
                      style={{ fontSize: 11, color: "#0A0A0A" }}
                    >
                      {`{{${s.path}}}`}
                    </code>
                    <span
                      className="font-mono"
                      style={{ fontSize: 9.5, color: "#9CA3AF" }}
                    >
                      {s.typeHint}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Suggestion building ────────────────────────────────────── */

function buildSuggestions(priorSteps: StepDef[]): Suggestion[] {
  const out: Suggestion[] = [];

  // Prior steps with outputVars
  for (const step of priorSteps) {
    if (!("outputVar" in step) || !step.outputVar) continue;
    const v = step.outputVar;
    // Per-step-type field hints. The actual variable bag at runtime
    // contains whatever the step executor returns; these are the
    // common-case fields users want.
    if (step.type === "llm") {
      out.push(
        { path: v + ".text", typeHint: "string", group: "Prior steps" },
        { path: v + ".tokens.input", typeHint: "number", group: "Prior steps" },
        { path: v + ".tokens.output", typeHint: "number", group: "Prior steps" },
      );
    } else if (step.type === "http") {
      out.push(
        { path: v + ".status", typeHint: "number", group: "Prior steps" },
        { path: v + ".body", typeHint: "any", group: "Prior steps" },
      );
    } else if (step.type === "vault.pay" || step.type === "transfer.usdc") {
      out.push(
        { path: v + ".signature", typeHint: "string", group: "Prior steps" },
        { path: v + ".explorerUrl", typeHint: "string", group: "Prior steps" },
        { path: v + ".amountUsd", typeHint: "number", group: "Prior steps" },
      );
    } else {
      out.push({ path: v, typeHint: "any", group: "Prior steps" });
    }
  }

  // Trigger payload + reserved
  out.push(
    { path: "trigger.kind", typeHint: "string", group: "Trigger" },
    { path: "trigger.payload", typeHint: "object", group: "Trigger" },
    { path: "trigger.payload.amount", typeHint: "number?", group: "Trigger" },
    { path: "trigger.payload.to", typeHint: "string?", group: "Trigger" },
  );

  out.push(
    { path: "vault.id", typeHint: "string", group: "Vault" },
    { path: "vault.ownerWallet", typeHint: "string", group: "Vault" },
  );

  return out;
}

interface SuggestionGroup {
  label: string;
  items: Suggestion[];
}

function groupSuggestions(items: Suggestion[]): SuggestionGroup[] {
  const map = new Map<string, Suggestion[]>();
  const order: string[] = [];
  for (const s of items) {
    if (!map.has(s.group)) {
      map.set(s.group, []);
      order.push(s.group);
    }
    map.get(s.group)!.push(s);
  }
  return order.map((label) => ({ label, items: map.get(label)! }));
}
