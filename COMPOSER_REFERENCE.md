# Composer step reference — every step type, every field, what runs

Field-by-field reference for every step the composer can place, the
backend executor it maps to, and the output it produces.

> Last updated: 2026-05-10 (v1.1 / commit `cf6a507`).

---

## Table of contents

1. [Anatomy of every step](#1-anatomy-of-every-step)
2. [Variable interpolation cheat sheet](#2-variable-interpolation-cheat-sheet)
3. [Trigger types](#3-trigger-types)
4. [Step type reference](#4-step-type-reference)
   - [4.1 `llm`](#41-llm--multi-provider-byok-language-model-call)
   - [4.2 `http`](#42-http--ssrf-safe-fetch-with-optional-paysh-wrap)
   - [4.3 `vault.pay`](#43-vaultpay--chain-enforced-merchant-payment)
   - [4.4 `transfer.usdc`](#44-transferusdc--chain-enforced-self-transfer)
   - [4.5 `log`](#45-log--write-to-event-feed)
   - [4.6 `signal`](#46-signal--emit-finding-to-inbox)
   - [4.7 `branch`](#47-branch--ifelse-on-a-condition)
   - [4.8 `loop`](#48-loop--iterate-over-an-array)
5. [Run lifecycle (where steps fit in)](#5-run-lifecycle-where-steps-fit-in)
6. [Common gotchas](#6-common-gotchas)

---

## 1. Anatomy of every step

Every step in the composer has these **shared fields** (top of the
form, type-agnostic):

| Field | What it is | Where it shows up |
|---|---|---|
| `id` | Auto-generated short uuid (`step_a1b2c3d4`) | Hidden from UI, used by run history |
| `type` | One of `llm` / `http` / `vault.pay` / `transfer.usdc` / `log` / `signal` / `branch` / `loop` | Type pill in the tile + step picker |
| `label` | Free-form name (e.g. "Generate brief") | Shown on the tile + run history |
| `outputVar` | Name to bind this step's output (only for steps that produce data — not `log`/`signal`/`branch`/`loop`) | Bottom-right corner tag of the tile |
| `onError` | `fail` (default) / `skip` / `continue` | Currently not exposed in form (planned v1.5) |

**Variable interpolation** — every text field in every step's config
supports `{{var}}` substitution. See section 2.

**Output binding** — when a step has `outputVar` set and succeeds,
its output is bound into the run context as `vars[outputVar]`. Later
steps can reference it with `{{outputVar.field}}`.

**Validation** — every config field has a Zod schema. Validation
fires twice: at write time (`POST /api/agents/spawn-graph` rejects
malformed graphs with 400) and at read time (the executor's
`safeParseGraph` rejects DB rows that fail validation, falling back
gracefully).

---

## 2. Variable interpolation cheat sheet

```
{{step1.text}}                  ← reference a prior step's output (by outputVar)
{{trigger.payload.amount}}      ← values passed in from the trigger
{{vault.id}}                    ← the user's vault id
{{vault.ownerWallet}}           ← the user's Solana pubkey
{{items[0].id}}                 ← array indexing
{{?optional.path}}              ← leading ? = empty string on miss (vs throw)
```

The interpolation engine lives at `src/lib/agents/graph/interpolate.ts`.
For HTTP body / headers (objects, not strings), use
`interpolateDeep` semantics — every string leaf in the JSON gets
substituted.

**Reserved top-level paths in `RunContext.vars`:**
- `trigger` → `{ kind, payload }`
- `vault` → `{ id, ownerWallet }`

Plus whatever each step has bound via `outputVar`.

---

## 3. Trigger types

The composer's **trigger picker** (top of the composer modal) sets
when the agent fires. Backend wiring lives at
`src/lib/agents/graph/scheduler.ts` for cron/interval, plus dedicated
endpoints for manual + webhook.

| Kind | Form fields | Backend |
|---|---|---|
| `manual` | none | Only fires from `POST /api/agents/[id]/run` (Run now button on detail page, or the composer's Test Run if the agent is already saved) |
| `interval` | `ms` (60_000–86_400_000) — 5 presets (5m / 15m / 1h / 6h / 24h) + custom field | `agent-pool` ticker every 10s checks `now - lastRunStartedAt >= ms` and dispatches |
| `cron` | `expr` (5-field UTC cron, validated min 1 max 120 chars) — 4 presets (Hourly / Daily 9am / Mon noon / Monthly 1st) + custom field | `cron-parser` lib, fires when `prev() > lastRunStartedAt` |
| `webhook` | Auto-generates `secret` (32-char hex), shows the resulting URL with copy button + rotate-secret action | `POST /api/agents/[id]/webhook/[secret]` accepts a JSON body (cap 1MB), 60 req/min/agent rate limit. Body becomes `trigger.payload` |

---

## 4. Step type reference

### 4.1 `llm` — multi-provider BYOK language model call

**What it does.** Calls a language model via the user's BYOK key for
that provider. Reads `content` field from the response, falls back to
`reasoning_content` for reasoning models like `gpt-oss-120b` that put
their answer there when `content` is empty.

**Form fields** (`src/components/device/builder/step-forms/index.tsx` →
`LlmFields`):

| Field | Type | Notes |
|---|---|---|
| Provider | dropdown: `anthropic` / `openai` / `deepseek` / `commonstack` | Picks which BYOK key to load. If no key for that provider is configured, step fails with `provider_unavailable` |
| Model | text + datalist suggestions | Free-form. Datalist has Claude Haiku/Sonnet/Opus 4 for Anthropic, gpt-4o/gpt-4o-mini for OpenAI, deepseek-chat/reasoner for DeepSeek, openai/gpt-oss-120b + DeepSeek-V3.2-Exp for Commonstack |
| System prompt | textarea (max 20_000 chars) | Interpolated. Goes into Anthropic's `system` param OR OpenAI's `messages[0].role=system` |
| Prompt | textarea (max 20_000 chars) | Interpolated. The user message |
| Max tokens | number (1–8192) | Reasoning models need 1500+ to leave room for hidden thinking. Recipes default to 2000 |
| Temperature | number (0–2, step 0.1) | 0 for deterministic picks, 0.7 for creative |

**Config type:**
```ts
interface LlmStepConfig {
  provider: "anthropic" | "openai" | "deepseek" | "commonstack";
  model: string;
  system: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
}
```

**Backend** (`src/lib/agents/graph/steps/llm.ts`):
1. Load BYOK key via `loadKeyForUse(ownerWallet, provider)` —
   plaintext lives in function scope, never logged.
2. For Anthropic: POST `https://api.anthropic.com/v1/messages` with
   `x-api-key` header.
3. For OpenAI / DeepSeek / Commonstack: POST OpenAI-compat
   `/v1/chat/completions` with `Authorization: Bearer …`.
4. 60s timeout per call. AbortController on hit.
5. Parse response: read `choices[0].message.content`; fall back to
   `reasoning_content` if content is empty (this is how
   gpt-oss-120b emits when reasoning is the bulk of output).
6. Compute `costUsd` from token counts × per-provider pricing tier.

**Output:** `{ text, tokens: { input, output }, provider, model }`.

**Cost ballpark per call** (rates per 1M tokens):
| Provider | Input | Output |
|---|---|---|
| Anthropic Claude Haiku 4.5 | $1.00 | $5.00 |
| OpenAI gpt-4o-mini | $0.15 | $0.60 |
| DeepSeek-chat | $0.27 | $1.10 |
| Commonstack gpt-oss-120b | $0.05 | $0.25 |

Recipes default to Commonstack for cheap demo runs.

---

### 4.2 `http` — SSRF-safe fetch with optional pay.sh wrap

**What it does.** Makes an HTTP request to any public URL, returns
the response. Used for fetching real-world data into the agent
(prices, wallets, RPC results, x402-paid endpoints).

**Form fields** (`HttpFields`):

| Field | Type | Notes |
|---|---|---|
| Method | dropdown: GET / POST / PUT / DELETE / PATCH | |
| URL | text | Interpolated. SSRF-protected: rejects localhost, link-local, RFC1918 ranges, and IP literals matching private CIDRs. Must be http(s) |
| Headers | textarea (JSON) | Object map. Values interpolated, keys not. Auto-parsed, invalid JSON keeps the form open without saving |
| Body | textarea (JSON, only for POST/PUT/PATCH) | Object body. Interpolated *deeply* (every string leaf). `Content-Type: application/json` auto-added if not set |
| pay.sh wrap | checkbox | When true, adds `X-Kyvern-Pay-Sh-Wrap: v0-pending` header. Real pay.sh routing is a P1.4b TODO — currently no-op pass-through |
| Timeout (ms) | number (1000–120_000) | Default 60_000. AbortController fires at deadline |
| Expect status | optional number | If set and response doesn't match, step fails with the actual status + truncated body |

**Config type:**
```ts
interface HttpStepConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | null;
  payShWrap: boolean;
  timeoutMs: number;
  expectStatus?: number;
}
```

**Backend** (`src/lib/agents/graph/steps/http.ts`):
1. Interpolate URL, validate `URL` constructor + protocol + private-IP check.
2. Interpolate headers (each value), interpolate-deep body.
3. Stream response with a 5MB cap; abort + fail step if exceeded.
4. Auto-parse JSON when `Content-Type` includes `application/json`.

**Output:** `{ status, body, headers }`. `body` is the parsed value
(JSON-decoded if response was JSON, plain string otherwise).

**Common use:** wallet watcher recipe fetches Solana RPC
`getSignaturesForAddress`, then a downstream LLM step assesses the
signatures.

---

### 4.3 `vault.pay` — chain-enforced merchant payment

**What it does.** Routes a USDC payment through the on-chain Kyvern
policy program at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`. The
chain decides allow/refuse. Refused payments produce real failed
Solana txs that judges can verify on Explorer.

**Form fields** (`VaultPayFields`):

| Field | Type | Notes |
|---|---|---|
| Merchant | text | Interpolated. The rule-check label (e.g. `api.openai.com`). Must be on the vault's allowlist or the chain rejects with error code `12005 MerchantNotAllowlisted` |
| To (Solana pubkey) | text | Interpolated. The recipient's pubkey (base58, ~44 chars) |
| Amount (USDC) | text | Number (`0.05`) OR templated string (`{{step1.amount}}`). `resolveNumber` parses at execute time |
| Memo | text (max 256 chars) | Interpolated. Written into the on-chain memo |

**Config type:**
```ts
interface VaultPayStepConfig {
  merchant: string;
  to: string;            // base58 Solana pubkey
  amount: number | string;  // literal or templated
  memo: string;
}
```

**Backend** (`src/lib/agents/graph/steps/pay.ts → executeVaultPay`):
1. Interpolate merchant, to, memo. Resolve amount via `resolveNumber`.
2. Validate amount > 0, merchant non-empty, to non-empty.
3. Call `serverVaultPay({ vaultId, merchant, recipientPubkey: to, amountUsd, memo })`.
4. `serverVaultPay` runs the off-chain pre-check via
   `policy-engine.ts`:
   - If allowed: signs Squads `spendingLimitUse` instruction with the
     agent's keypair, submits to chain, awaits confirmation.
   - If blocked AND violation is Squads-enforceable (per-tx, daily,
     weekly cap): submits anyway with `skipPreflight=true` so the
     chain produces a real failed-tx signature.
   - If blocked on Kyvern-only rules (allowlist, memo, paused): no
     chain submission; returns `blocked: true` with no signature.
5. Records the payment via `recordPayment()` and writes a thought row
   to `agent_thoughts` (so the per-vault event feed surfaces it).

**Output (success):**
```ts
{ signature, explorerUrl, amountUsd, merchant, to }
```

**Output (failure):**
```ts
{ reason, blocked, signature?, explorerUrl? }
```

**Cost:** the `amountUsd` value itself counts toward
`graph.config.maxCostPerRunUsd`. Solana tx fee (~5000 lamports ≈
$0.0005) is paid by the server fee payer, not deducted from user.

**Custom error codes the chain returns:**
| Code | Name |
|---|---|
| 12000 | InvalidPolicy |
| 12001 | PolicyAlreadyInitialized |
| 12002 | AmountExceedsPerTxMax |
| 12003 | AmountExceedsDailyCap |
| 12004 | AmountExceedsWeeklyCap |
| 12005 | MerchantNotAllowlisted |
| 12006 | MissingMemo |
| 12007 | VaultPaused |
| 12008 | InvalidAuthority |

---

### 4.4 `transfer.usdc` — chain-enforced self-transfer

**What it does.** Sugar around `vault.pay` with a synthetic merchant
label (`self_transfer`). Used for transfers to allowlisted self-owned
addresses — KAST card top-ups, treasury rebalances, etc.

**Form fields** (`TransferUsdcFields`):

| Field | Type | Notes |
|---|---|---|
| To (allowlisted Solana pubkey) | text | Interpolated |
| Amount (USDC) | text | Number or templated string |
| Memo | text (max 256) | Interpolated |

**Config type:**
```ts
interface TransferUsdcStepConfig {
  to: string;
  amount: number | string;
  memo: string;
}
```

**Backend** (`src/lib/agents/graph/steps/pay.ts → executeTransferUsdc`):
Delegates to `executeVaultPay` with `merchant: "self_transfer"`. Same
chain enforcement, same Squads `spendingLimitUse` path. The
`self_transfer` label distinguishes it in the event feed and audit
log so users can spot self-vs-merchant flows at a glance.

**Output:** Same shape as `vault.pay`.

---

### 4.5 `log` — write to event feed

**What it does.** Inserts a row into `agent_thoughts` with the
interpolated message. Surfaces in the per-vault event feed (right
column of `/app` AliveConsole). No network, no chain, very cheap.

**Form fields** (`LogFields`):

| Field | Type | Notes |
|---|---|---|
| Message | text (max 2000) | Interpolated. Decorated with prefix per level on write: `›` for info, `⚠` for warn, `✗` for error |
| Level | dropdown: info / warn / error | |

**Config type:**
```ts
interface LogStepConfig {
  message: string;
  level: "info" | "warn" | "error";
}
```

**Backend** (`src/lib/agents/graph/steps/log.ts`):
1. Interpolate message.
2. Insert row into `agent_thoughts` with `mode='scripted'`,
   `decision_json={ action: 'observe', source: 'graph.log', level }`.
3. The per-vault event feed (`/api/vault/[id]/events`) reads from
   this table.

**Output:** `{ message, level }`.

**Note:** `log` has no `outputVar` field — it doesn't produce data
that later steps need to read. If you need the message text in a
later step, just interpolate the same value directly there.

---

### 4.6 `signal` — emit finding to inbox

**What it does.** Inserts a row into the `signals` table. Shows up
in `/app/inbox`. Same surface that legacy worker findings (Atlas's
opportunity signals, Pulse's wallet alerts) write to.

**Form fields** (`SignalFields`):

| Field | Type | Notes |
|---|---|---|
| Kind | text | Interpolated. Free-form (e.g. `daily_brief`, `wallet_alert`, `trigger_fired`). Drives icon/color/label in the inbox card; unknown kinds get default Sparkles + grey + `SIGNAL` label |
| Source URL (optional) | text (max 500) | Interpolated. Anchor link on the inbox card (Explorer tx, Helius, etc) |
| Subject | text (max 256) | Interpolated. The 1-line title on the inbox card |
| Evidence | textarea (max 2000) | Interpolated. One bullet per line, max 8 bullets |
| Suggestion (optional) | text (max 500) | Interpolated. One-line action recommendation |

**Config type:**
```ts
interface SignalStepConfig {
  kind: string;
  subject: string;
  evidence: string;       // newline-separated bullets
  suggestion: string;
  sourceUrl: string;
}
```

**Backend** (`src/lib/agents/graph/steps/signal.ts`):
1. Interpolate every field.
2. Look up `device_id` from the `agents` table (so the inbox query
   can filter by device without joins).
3. Split `evidence` on `\n`, trim, drop blanks, slice to 8 bullets.
4. Insert into `signals` with status `unread`.

**Output:** `{ id, kind, subject, evidenceCount }`.

**Note:** also no `outputVar` — signals are user-facing terminal
output, not data for further steps.

---

### 4.7 `branch` — if/else on a condition

**What it does.** Evaluates a boolean expression against the run's
variable context, executes either the `then` or `else` step list.

**Form fields** (`BranchFields`):

| Field | Type | Notes |
|---|---|---|
| Condition | text (max 500) | NOT interpolated — uses a custom safe expression evaluator. Examples: `price < 90`, `summary != ""`, `count > 5 && active`, `status == "ok" \|\| retries > 3` |
| then[] | textarea (JSON array of StepDef) | Currently raw JSON for v1; nested drag-drop is v1.5 |
| else[] | textarea (JSON array of StepDef) | Same |

**Config type:**
```ts
interface BranchStepConfig {
  condition: string;
  then: StepDef[];
  else: StepDef[];
}
```

**Expression grammar** (`src/lib/agents/graph/expression.ts`):
```
expr       = or_expr
or_expr    = and_expr ('||' and_expr)*
and_expr   = not_expr ('&&' not_expr)*
not_expr   = '!' not_expr | comparison
comparison = primary (cmp_op primary)?
cmp_op     = '==' | '!=' | '<' | '<=' | '>' | '>='
primary    = number | string | 'true' | 'false' | 'null' |
             ident | '(' expr ')'
ident      = name ('.' name)* ('[' integer ']')*
```

NO `eval()`, NO `new Function()`. Hand-rolled tokenizer + recursive
descent parser + tree-walk evaluator. Identifiers resolve via
`resolvePath()` against the run's vars. Missing identifiers return
`undefined`; comparing undefined to anything returns false.

**Backend** (`src/lib/agents/graph/executor.ts → runBranchStep`):
1. Tokenize + parse + evaluate the condition.
2. If true: recursively run `then` steps. Else: run `else` steps.
3. If condition fails to parse, fall back to `else` branch (don't
   crash the run).
4. Push a `StepOutput` row with `output: { chosen: 'then'|'else', condition }`.

**Canvas treatment** (v1): the branch tile is opaque — its nested
children aren't drawn. Tile shows an `if/else · N+M nested` pill in
the bottom-left corner. If any nested step is a money step, the
branch tile gets its own dashed green money edge to the chain glyph
(via `subtreeHasMoneyStep` recursion).

---

### 4.8 `loop` — iterate over an array

**What it does.** Resolves an array from a variable path, iterates
the body for each item up to `maxIterations`.

**Form fields** (`LoopFields`):

| Field | Type | Notes |
|---|---|---|
| Items (variable path) | text | NOT interpolated — directly fed to `resolvePath`. Example: `trigger.payload.recipients` |
| Item variable name | text (regex `^[a-zA-Z_][a-zA-Z0-9_]*$`) | Each iteration binds this to the current item |
| Max iterations | number (1–1000) | Hard cap to prevent runaway loops |
| body[] | textarea (JSON array of StepDef) | Same v1 limitation as branch — raw JSON for now |

**Config type:**
```ts
interface LoopStepConfig {
  items: string;        // variable path
  itemVar: string;      // name to bind
  body: StepDef[];
  maxIterations: number;
}
```

**Backend** (`src/lib/agents/graph/executor.ts → runLoopStep`):
1. Resolve `items` via `resolvePath`. If not an array, fail step.
2. Cap at `min(maxIterations, items.length)`.
3. For each item:
   - Save existing `vars[itemVar]` + `vars[itemVar_index]` for restoration.
   - Bind `vars[itemVar] = item`, `vars[itemVar_index] = i`.
   - Recursively run body.
4. After the loop, restore `vars[itemVar]` + `vars[itemVar_index]` to
   their prior values (loop scope is local).
5. Emit `StepOutput` with `output: { iterations, capped }`.

**Canvas treatment**: same as branch — opaque tile with `loop · N
nested` pill, money fan-in via `subtreeHasMoneyStep`.

---

## 5. Run lifecycle (where steps fit in)

```
trigger fires
   │
   ▼
dispatchRun()  ← src/lib/agents/graph/dispatcher.ts
   │
   ├─ load agent row, parse graph, load vault row
   ├─ check concurrency caps (per-vault 3, global 30)
   ├─ check daily cap (graph.config.maxRunsPerDay, UTC day window)
   ├─ insert agent_runs row (status='queued')
   ├─ markRunRunning
   │
   ▼
runGraph(input)  ← src/lib/agents/graph/executor.ts
   │
   ├─ build RunContext { vars: { trigger, vault }, outputs: [], costUsd: 0 }
   │
   ├─ for each step:
   │   ├─ check graph.config.maxCostPerRunUsd ceiling → abort if hit
   │   ├─ if branch: evaluate condition, recurse
   │   ├─ if loop: resolve items, iterate body
   │   ├─ else (leaf): dispatchLeaf
   │   │   ├─ interpolate config strings
   │   │   ├─ call provider/RPC/DB/etc
   │   │   ├─ return { ok, output, signature?, costUsd? }
   │   │
   │   ├─ push StepOutput → ctx.outputs
   │   ├─ ctx.costUsd += step.costUsd
   │   ├─ if step has outputVar AND ok: bind ctx.vars[outputVar] = output
   │   ├─ if !ok: apply onError policy (fail | skip | continue)
   │
   ▼
finalizeRun(runId, ctx)
   │
   ├─ status = ctx.abortReason ?? 'succeeded'
   ├─ step_outputs_json = JSON.stringify(ctx.outputs)
   ├─ total_cost_usd = ctx.costUsd
   ├─ error_message = first failed step's error or 'run aborted'
   │
   ▼
agent_runs row finalized — runs tab on detail page polls + repaints
```

**Where each step type's output ends up:**

| Step type | Where the user sees it | Surface |
|---|---|---|
| llm | Inline preview in run detail (capped 600 chars + show-full toggle) | Runs tab → expanded run |
| http | Status + body excerpt in run detail | Runs tab → expanded run |
| vault.pay / transfer.usdc | "chain settled" / "chain refused" pill on step row + Explorer link | Runs tab → expanded run, plus per-vault event feed (right column of `/app`) |
| log | Per-vault event feed (right column of `/app`) | AliveConsole |
| signal | Inbox card | `/app/inbox` |
| branch / loop | Choose-branch or iter-count summary | Runs tab → expanded run |

---

## 6. Common gotchas

**LLM step returns empty output.** Reasoning models (gpt-oss-120b,
DeepSeek-R1) put hidden thinking in `reasoning_content`. Bumped
recipe `maxTokens` to 2000 so the model has room to finish. If the
output is still empty, raise to 4000.

**LLM step fails with `provider_unavailable`.** The provider's BYOK
key isn't configured. Open `/app` → Keys chip → add a key for that
provider. Test before saving the agent.

**`vault.pay` succeeds but `chain refused`.** Off-chain pre-check
caught a Kyvern-only rule (allowlist / memo / paused). No chain
submission, no signature. Fix: add the merchant to the vault's
allowlist via wizard step 5, or update the memo, or unpause.

**`vault.pay` fails simulation with "no record of prior credit".**
The vault has $0 USDC. Top up via `/api/vault/[id]/test-payout` —
or for fresh vaults, wait for the auto-airdrop in `/api/vault/create`
(seeds 1 USDC if the fee payer has any).

**Branch/loop nested money steps don't show in canvas.** v1
treats branch + loop as opaque tiles. Their fan-in to the chain glyph
is correct (via `subtreeHasMoneyStep`), but the nested children
aren't drawn. Use the SDK preview footer for full nested visibility.

**Variable interpolation fails silently.** Strict mode throws on
missing path. Use `{{?optional.path}}` for soft-fail (returns "").

**HTTP step rejects with `private/loopback host blocked`.** SSRF
protection — can't fetch localhost / `10.x.x.x` / `192.168.x.x` /
link-local. Use a public URL.

**Webhook URL says `<save-first-to-get-the-url>`.** The webhook URL
includes the agent's id, which doesn't exist until the first deploy.
Save the agent once, then the URL appears in the trigger form on edit.

**Test Run button disabled.** It runs a saved agent's graph —
unsaved drafts can't be tested. Click Deploy first; then the Test
Run becomes available either in the composer (when reopened to edit)
or via "Run now" on the detail page.

---

## File map (where each step lives in code)

```
src/lib/agents/graph/
  types.ts                       ← StepDef union, all *StepConfig interfaces
  schemas.ts                     ← Zod for all step types + recursive StepDefSchema
  executor.ts                    ← runGraph + dispatchLeaf + runBranchStep + runLoopStep
  dispatcher.ts                  ← dispatchRun (chokepoint)
  scheduler.ts                   ← interval/cron eligibility check
  expression.ts                  ← branch condition parser
  interpolate.ts                 ← {{var}} substitution
  steps/
    llm.ts                       ← multi-provider LLM call
    http.ts                      ← SSRF-safe fetch
    pay.ts                       ← vault.pay + transfer.usdc
    log.ts                       ← writes to agent_thoughts
    signal.ts                    ← writes to signals

src/components/device/builder/
  step-forms/index.tsx           ← all type-specific forms (Llm/Http/VaultPay/...)
  composer.tsx                   ← step list editor, Step factory (makeStep)
  trigger-form.tsx               ← manual/interval/cron/webhook
  recipe-gallery.tsx             ← 8 starter recipes
  test-run-panel.tsx             ← test-run results
  modal.tsx                      ← outer shell (pick → edit)

src/components/device/agent/
  graph-flow-view.tsx            ← React Flow canvas (read-only graph + playback)
  graph-detail.tsx               ← agent detail page (runs/graph/settings tabs)

src/components/device/graph-canvas/
  canvas.tsx                     ← /app home canvas (vault + agent tiles)
  tile.tsx, add-tile.tsx         ← tile renderers
```
