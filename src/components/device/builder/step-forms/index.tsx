"use client";

/**
 * StepForm — type-specific form for editing a step's config.
 *
 * One component, switching on step.type. Each variant calls
 * onChange with a fully-typed StepDef.
 *
 * Forms include lightweight hints about available variables
 * ({{step1.output.foo}}, {{trigger.payload.bar}}) — pulled from
 * priorSteps so the user can see what they can reference.
 */

import type {
  StepDef,
  LlmProvider,
  HttpStepConfig,
} from "@/lib/agents/graph/types";

interface Props {
  step: StepDef;
  onChange: (next: StepDef) => void;
  /** Steps that come before this one in the graph; used to suggest
   *  available variables. */
  priorSteps: StepDef[];
}

export function StepForm({ step, onChange, priorSteps }: Props) {
  const availableVars = priorSteps
    .filter((s) => "outputVar" in s && s.outputVar)
    .map((s) => (s as { outputVar: string }).outputVar);

  return (
    <div className="flex flex-col gap-2">
      {/* Common fields: label + outputVar */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Label">
          <input
            type="text"
            value={step.label}
            onChange={(e) => onChange({ ...step, label: e.target.value } as StepDef)}
            maxLength={120}
            className="px-2 py-1.5 rounded text-[12px]"
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(15,23,42,0.10)",
            }}
          />
        </Field>
        {step.type !== "log" && step.type !== "branch" && step.type !== "loop" && (
          <Field label="Output variable">
            <input
              type="text"
              value={(step as { outputVar?: string }).outputVar ?? ""}
              onChange={(e) =>
                onChange({
                  ...step,
                  outputVar: e.target.value || undefined,
                } as StepDef)
              }
              placeholder="e.g. summary"
              maxLength={64}
              className="px-2 py-1.5 rounded text-[12px] font-mono"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(15,23,42,0.10)",
              }}
            />
          </Field>
        )}
      </div>

      {/* Variable hint */}
      {availableVars.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-[10.5px]" style={{ color: "rgba(15,23,42,0.55)" }}>
          <span className="font-mono uppercase tracking-[0.10em]" style={{ fontSize: 9, color: "#9CA3AF" }}>
            available
          </span>
          {availableVars.map((v) => (
            <code
              key={v}
              className="px-1.5 py-0.5 rounded font-mono"
              style={{
                background: "rgba(15,23,42,0.04)",
                fontSize: 9.5,
                color: "#0A0A0A",
              }}
            >
              {`{{${v}.text || ${v}.body | … }}`.slice(0, 40)}
            </code>
          ))}
          <code
            className="px-1.5 py-0.5 rounded font-mono"
            style={{
              background: "rgba(15,23,42,0.04)",
              fontSize: 9.5,
              color: "#0A0A0A",
            }}
          >
            {`{{trigger.payload.foo}}`}
          </code>
        </div>
      )}

      {/* Type-specific body */}
      {step.type === "llm" && <LlmFields step={step} onChange={onChange} />}
      {step.type === "http" && <HttpFields step={step} onChange={onChange} />}
      {step.type === "vault.pay" && <VaultPayFields step={step} onChange={onChange} />}
      {step.type === "transfer.usdc" && <TransferUsdcFields step={step} onChange={onChange} />}
      {step.type === "log" && <LogFields step={step} onChange={onChange} />}
      {step.type === "signal" && <SignalFields step={step} onChange={onChange} />}
      {step.type === "branch" && <BranchFields step={step} onChange={onChange} priorSteps={priorSteps} />}
      {step.type === "loop" && <LoopFields step={step} onChange={onChange} priorSteps={priorSteps} />}
    </div>
  );
}

/* ─── Shared field wrapper ───────────────────────────────────── */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span
        className="font-mono uppercase tracking-[0.10em]"
        style={{ fontSize: 9, color: "#9CA3AF" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const TEXT_INPUT_STYLE: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid rgba(15,23,42,0.10)",
};

/* ─── LLM ────────────────────────────────────────────────────── */

const LLM_MODELS: Record<LlmProvider, string[]> = {
  anthropic: ["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-7"],
  openai: ["gpt-4o", "gpt-4o-mini"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  commonstack: ["openai/gpt-oss-120b", "deepseek-ai/DeepSeek-V3.2-Exp"],
};

function LlmFields({
  step,
  onChange,
}: {
  step: Extract<StepDef, { type: "llm" }>;
  onChange: (next: StepDef) => void;
}) {
  const setConfig = (patch: Partial<typeof step.config>) =>
    onChange({ ...step, config: { ...step.config, ...patch } });

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Provider">
          <select
            value={step.config.provider}
            onChange={(e) =>
              setConfig({
                provider: e.target.value as LlmProvider,
                model: LLM_MODELS[e.target.value as LlmProvider][0],
              })
            }
            className="px-2 py-1.5 rounded text-[12px]"
            style={TEXT_INPUT_STYLE}
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="deepseek">DeepSeek</option>
            <option value="commonstack">Commonstack</option>
          </select>
        </Field>
        <Field label="Model">
          <input
            type="text"
            list={`llm-models-${step.id}`}
            value={step.config.model}
            onChange={(e) => setConfig({ model: e.target.value })}
            className="px-2 py-1.5 rounded text-[12px] font-mono"
            style={TEXT_INPUT_STYLE}
          />
          <datalist id={`llm-models-${step.id}`}>
            {LLM_MODELS[step.config.provider].map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>
      </div>
      <Field label="System prompt">
        <textarea
          value={step.config.system}
          onChange={(e) => setConfig({ system: e.target.value })}
          rows={2}
          className="px-2 py-1.5 rounded text-[12px] resize-y"
          style={TEXT_INPUT_STYLE}
        />
      </Field>
      <Field label="Prompt">
        <textarea
          value={step.config.prompt}
          onChange={(e) => setConfig({ prompt: e.target.value })}
          rows={4}
          placeholder="What should the LLM do? Use {{var}} for dynamic values."
          className="px-2 py-1.5 rounded text-[12px] resize-y"
          style={TEXT_INPUT_STYLE}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Max tokens">
          <input
            type="number"
            min={1}
            max={8192}
            value={step.config.maxTokens}
            onChange={(e) => setConfig({ maxTokens: Number(e.target.value) || 0 })}
            className="px-2 py-1.5 rounded text-[12px] font-mono"
            style={TEXT_INPUT_STYLE}
          />
        </Field>
        <Field label="Temperature (0–2)">
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={step.config.temperature}
            onChange={(e) => setConfig({ temperature: Number(e.target.value) || 0 })}
            className="px-2 py-1.5 rounded text-[12px] font-mono"
            style={TEXT_INPUT_STYLE}
          />
        </Field>
      </div>
    </div>
  );
}

/* ─── HTTP ───────────────────────────────────────────────────── */

function HttpFields({
  step,
  onChange,
}: {
  step: Extract<StepDef, { type: "http" }>;
  onChange: (next: StepDef) => void;
}) {
  const setConfig = (patch: Partial<HttpStepConfig>) =>
    onChange({ ...step, config: { ...step.config, ...patch } });

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[100px_1fr] gap-2">
        <Field label="Method">
          <select
            value={step.config.method}
            onChange={(e) => setConfig({ method: e.target.value as HttpStepConfig["method"] })}
            className="px-2 py-1.5 rounded text-[12px]"
            style={TEXT_INPUT_STYLE}
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
            <option>PATCH</option>
          </select>
        </Field>
        <Field label="URL">
          <input
            type="text"
            value={step.config.url}
            onChange={(e) => setConfig({ url: e.target.value })}
            placeholder="https://api.example.com/path"
            className="px-2 py-1.5 rounded text-[12px] font-mono"
            style={TEXT_INPUT_STYLE}
          />
        </Field>
      </div>
      <Field label="Headers (JSON)">
        <textarea
          value={JSON.stringify(step.config.headers, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                setConfig({ headers: parsed as Record<string, string> });
              }
            } catch {
              /* keep typing — invalid JSON won't update state */
            }
          }}
          rows={3}
          className="px-2 py-1.5 rounded text-[11.5px] font-mono resize-y"
          style={TEXT_INPUT_STYLE}
          placeholder='{"Authorization": "Bearer …"}'
        />
      </Field>
      {(step.config.method === "POST" || step.config.method === "PUT" || step.config.method === "PATCH") && (
        <Field label="Body (JSON)">
          <textarea
            value={step.config.body ? JSON.stringify(step.config.body, null, 2) : ""}
            onChange={(e) => {
              if (!e.target.value.trim()) {
                setConfig({ body: null });
                return;
              }
              try {
                const parsed = JSON.parse(e.target.value);
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                  setConfig({ body: parsed as Record<string, unknown> });
                }
              } catch {
                /* keep typing */
              }
            }}
            rows={4}
            className="px-2 py-1.5 rounded text-[11.5px] font-mono resize-y"
            style={TEXT_INPUT_STYLE}
            placeholder='{"key": "{{var}}"}'
          />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2 text-[11.5px]">
          <input
            type="checkbox"
            checked={step.config.payShWrap}
            onChange={(e) => setConfig({ payShWrap: e.target.checked })}
          />
          <span>Wrap in pay.sh (x402)</span>
        </label>
        <Field label="Timeout (ms)">
          <input
            type="number"
            min={1000}
            max={120_000}
            value={step.config.timeoutMs}
            onChange={(e) => setConfig({ timeoutMs: Number(e.target.value) || 60_000 })}
            className="px-2 py-1.5 rounded text-[11.5px] font-mono"
            style={TEXT_INPUT_STYLE}
          />
        </Field>
      </div>
    </div>
  );
}

/* ─── vault.pay ──────────────────────────────────────────────── */

function VaultPayFields({
  step,
  onChange,
}: {
  step: Extract<StepDef, { type: "vault.pay" }>;
  onChange: (next: StepDef) => void;
}) {
  const setConfig = (patch: Partial<typeof step.config>) =>
    onChange({ ...step, config: { ...step.config, ...patch } });
  return (
    <div className="flex flex-col gap-2">
      <Field label="Merchant (must be allowlisted)">
        <input
          type="text"
          value={step.config.merchant}
          onChange={(e) => setConfig({ merchant: e.target.value })}
          placeholder="api.openai.com"
          className="px-2 py-1.5 rounded text-[12px] font-mono"
          style={TEXT_INPUT_STYLE}
        />
      </Field>
      <Field label="To (Solana pubkey)">
        <input
          type="text"
          value={step.config.to}
          onChange={(e) => setConfig({ to: e.target.value })}
          placeholder="Pubkey of the recipient ATA owner"
          className="px-2 py-1.5 rounded text-[12px] font-mono"
          style={TEXT_INPUT_STYLE}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Amount (USDC)">
          <input
            type="text"
            value={String(step.config.amount)}
            onChange={(e) => {
              const v = e.target.value;
              const n = Number(v);
              setConfig({ amount: Number.isFinite(n) && !v.includes("{") ? n : v });
            }}
            placeholder="0.05 or {{var}}"
            className="px-2 py-1.5 rounded text-[12px] font-mono"
            style={TEXT_INPUT_STYLE}
          />
        </Field>
        <Field label="Memo">
          <input
            type="text"
            value={step.config.memo}
            onChange={(e) => setConfig({ memo: e.target.value })}
            maxLength={256}
            className="px-2 py-1.5 rounded text-[12px]"
            style={TEXT_INPUT_STYLE}
          />
        </Field>
      </div>
    </div>
  );
}

/* ─── transfer.usdc ──────────────────────────────────────────── */

function TransferUsdcFields({
  step,
  onChange,
}: {
  step: Extract<StepDef, { type: "transfer.usdc" }>;
  onChange: (next: StepDef) => void;
}) {
  const setConfig = (patch: Partial<typeof step.config>) =>
    onChange({ ...step, config: { ...step.config, ...patch } });
  return (
    <div className="flex flex-col gap-2">
      <Field label="To (allowlisted Solana pubkey)">
        <input
          type="text"
          value={step.config.to}
          onChange={(e) => setConfig({ to: e.target.value })}
          placeholder="Your MY_KAST address or another allowlisted recipient"
          className="px-2 py-1.5 rounded text-[12px] font-mono"
          style={TEXT_INPUT_STYLE}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Amount (USDC)">
          <input
            type="text"
            value={String(step.config.amount)}
            onChange={(e) => {
              const v = e.target.value;
              const n = Number(v);
              setConfig({ amount: Number.isFinite(n) && !v.includes("{") ? n : v });
            }}
            className="px-2 py-1.5 rounded text-[12px] font-mono"
            style={TEXT_INPUT_STYLE}
          />
        </Field>
        <Field label="Memo">
          <input
            type="text"
            value={step.config.memo}
            onChange={(e) => setConfig({ memo: e.target.value })}
            maxLength={256}
            className="px-2 py-1.5 rounded text-[12px]"
            style={TEXT_INPUT_STYLE}
          />
        </Field>
      </div>
    </div>
  );
}

/* ─── log ────────────────────────────────────────────────────── */

function LogFields({
  step,
  onChange,
}: {
  step: Extract<StepDef, { type: "log" }>;
  onChange: (next: StepDef) => void;
}) {
  const setConfig = (patch: Partial<typeof step.config>) =>
    onChange({ ...step, config: { ...step.config, ...patch } });
  return (
    <div className="flex flex-col gap-2">
      <Field label="Message (interpolated)">
        <input
          type="text"
          value={step.config.message}
          onChange={(e) => setConfig({ message: e.target.value })}
          placeholder="Daily price update: {{summary.text}}"
          maxLength={2000}
          className="px-2 py-1.5 rounded text-[12px]"
          style={TEXT_INPUT_STYLE}
        />
      </Field>
      <Field label="Level">
        <select
          value={step.config.level}
          onChange={(e) =>
            setConfig({ level: e.target.value as "info" | "warn" | "error" })
          }
          className="px-2 py-1.5 rounded text-[12px]"
          style={TEXT_INPUT_STYLE}
        >
          <option>info</option>
          <option>warn</option>
          <option>error</option>
        </select>
      </Field>
    </div>
  );
}

/* ─── signal ─────────────────────────────────────────────────── */

function SignalFields({
  step,
  onChange,
}: {
  step: Extract<StepDef, { type: "signal" }>;
  onChange: (next: StepDef) => void;
}) {
  const setConfig = (patch: Partial<typeof step.config>) =>
    onChange({ ...step, config: { ...step.config, ...patch } });
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Kind">
          <input
            type="text"
            value={step.config.kind}
            onChange={(e) => setConfig({ kind: e.target.value })}
            placeholder="alert, info, trigger_fired …"
            maxLength={64}
            className="px-2 py-1.5 rounded text-[12px] font-mono"
            style={TEXT_INPUT_STYLE}
          />
        </Field>
        <Field label="Source URL (optional)">
          <input
            type="text"
            value={step.config.sourceUrl}
            onChange={(e) => setConfig({ sourceUrl: e.target.value })}
            placeholder="https://… (Explorer, Helius, etc)"
            maxLength={500}
            className="px-2 py-1.5 rounded text-[12px] font-mono"
            style={TEXT_INPUT_STYLE}
          />
        </Field>
      </div>
      <Field label="Subject (1-line title for the inbox card)">
        <input
          type="text"
          value={step.config.subject}
          onChange={(e) => setConfig({ subject: e.target.value })}
          placeholder="SOL crossed your $90 trigger"
          maxLength={256}
          className="px-2 py-1.5 rounded text-[12px]"
          style={TEXT_INPUT_STYLE}
        />
      </Field>
      <Field label="Evidence (one bullet per line, up to 8)">
        <textarea
          value={step.config.evidence}
          onChange={(e) => setConfig({ evidence: e.target.value })}
          rows={4}
          placeholder={"Price: ${{price}}\nTrigger: < $90\nVolume: {{volume}}"}
          className="px-2 py-1.5 rounded text-[12px] resize-y"
          style={TEXT_INPUT_STYLE}
        />
      </Field>
      <Field label="Suggestion (optional)">
        <input
          type="text"
          value={step.config.suggestion}
          onChange={(e) => setConfig({ suggestion: e.target.value })}
          placeholder="Mirror to Pulse / archive / take action"
          maxLength={500}
          className="px-2 py-1.5 rounded text-[12px]"
          style={TEXT_INPUT_STYLE}
        />
      </Field>
    </div>
  );
}

/* ─── branch ─────────────────────────────────────────────────── */

function BranchFields({
  step,
  onChange,
  priorSteps,
}: {
  step: Extract<StepDef, { type: "branch" }>;
  onChange: (next: StepDef) => void;
  priorSteps: StepDef[];
}) {
  void priorSteps; // sub-step editor is a v1.5 feature
  const setConfig = (patch: Partial<typeof step.config>) =>
    onChange({ ...step, config: { ...step.config, ...patch } });
  return (
    <div className="flex flex-col gap-2">
      <Field label="Condition (e.g. summary.length > 0)">
        <input
          type="text"
          value={step.config.condition}
          onChange={(e) => setConfig({ condition: e.target.value })}
          placeholder='price < 90 && status == "ok"'
          className="px-2 py-1.5 rounded text-[12px] font-mono"
          style={TEXT_INPUT_STYLE}
        />
      </Field>
      <p className="text-[10.5px]" style={{ color: "rgba(15,23,42,0.55)" }}>
        Branch sub-step editing in v1 is via JSON. Compose the then/else
        branches as nested step lists; UI for nested editing lands in v1.5.
      </p>
      <Field label="then[] (JSON)">
        <textarea
          value={JSON.stringify(step.config.then, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              if (Array.isArray(parsed)) setConfig({ then: parsed });
            } catch { /* keep typing */ }
          }}
          rows={3}
          className="px-2 py-1.5 rounded text-[10.5px] font-mono resize-y"
          style={TEXT_INPUT_STYLE}
        />
      </Field>
      <Field label="else[] (JSON)">
        <textarea
          value={JSON.stringify(step.config.else, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              if (Array.isArray(parsed)) setConfig({ else: parsed });
            } catch { /* keep typing */ }
          }}
          rows={3}
          className="px-2 py-1.5 rounded text-[10.5px] font-mono resize-y"
          style={TEXT_INPUT_STYLE}
        />
      </Field>
    </div>
  );
}

/* ─── loop ───────────────────────────────────────────────────── */

function LoopFields({
  step,
  onChange,
  priorSteps,
}: {
  step: Extract<StepDef, { type: "loop" }>;
  onChange: (next: StepDef) => void;
  priorSteps: StepDef[];
}) {
  void priorSteps;
  const setConfig = (patch: Partial<typeof step.config>) =>
    onChange({ ...step, config: { ...step.config, ...patch } });
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Items (variable path)">
          <input
            type="text"
            value={step.config.items}
            onChange={(e) => setConfig({ items: e.target.value })}
            placeholder="trigger.payload.recipients"
            className="px-2 py-1.5 rounded text-[12px] font-mono"
            style={TEXT_INPUT_STYLE}
          />
        </Field>
        <Field label="Item variable name">
          <input
            type="text"
            value={step.config.itemVar}
            onChange={(e) => setConfig({ itemVar: e.target.value })}
            placeholder="recipient"
            className="px-2 py-1.5 rounded text-[12px] font-mono"
            style={TEXT_INPUT_STYLE}
          />
        </Field>
      </div>
      <Field label="Max iterations (1–1000)">
        <input
          type="number"
          min={1}
          max={1000}
          value={step.config.maxIterations}
          onChange={(e) => setConfig({ maxIterations: Number(e.target.value) || 10 })}
          className="px-2 py-1.5 rounded text-[12px] font-mono"
          style={TEXT_INPUT_STYLE}
        />
      </Field>
      <Field label="body[] (JSON)">
        <textarea
          value={JSON.stringify(step.config.body, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              if (Array.isArray(parsed)) setConfig({ body: parsed });
            } catch { /* keep typing */ }
          }}
          rows={4}
          className="px-2 py-1.5 rounded text-[10.5px] font-mono resize-y"
          style={TEXT_INPUT_STYLE}
        />
      </Field>
    </div>
  );
}
