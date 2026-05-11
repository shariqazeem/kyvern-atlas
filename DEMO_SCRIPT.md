# Kyvern · Demo video · 3:00 · live integration cut

You're going to install the SDK, wrap an agent, run it, and watch
the calls land on Kyvern's chain enforcement in real time. Reading
this aloud should feel like you're telling someone how it works
while you do it. Not like a script.

Three columns per step:
- **ON SCREEN** — what you click / what's visible
- **SAY** — read this verbatim, full sentences, the way you'd
  actually say it
- **HOLD** — silent beats

---

## Before you hit record (15 min setup)

**Numbers refresh — fill these in:**

```
DAYS    = ___   (Atlas uptime in days from /api/atlas/status)
PAID    = ___   (totalSettled)
BLOCKED = ___   (totalAttacksBlocked)
```

**Project folder — `~/demo-agent` on your laptop:**

```
demo-agent/
├── agent.ts            ← pre-written, see template below
├── package.json
├── tsconfig.json
└── node_modules/       ← npm install -y all deps EXCEPT @kyvernlabs/sdk
                          (so the "live install" step is fast/cached)
```

`agent.ts` template (paste this in before recording — already wrapped
so the integration is visible from the first frame):

```ts
import { Vault } from "@kyvernlabs/sdk";

const vault = new Vault({ agentKey: process.env.KYVERN_AGENT_KEY! });

async function run() {
  console.log("→ vault.pay() · api.openai.com · $0.001");
  const r1 = await vault.pay({
    merchant: "api.openai.com",
    amount: 0.001,
    memo: "chat-completion",
  });
  console.log(`  ${r1.decision} · ${r1.signature ?? "(no sig)"}\n`);

  console.log("→ vault.pay() · api.anthropic.com · $0.001");
  const r2 = await vault.pay({
    merchant: "api.anthropic.com",
    amount: 0.001,
    memo: "agent inference",
  });
  console.log(`  ${r2.decision} · ${r2.signature ?? "(no sig)"}\n`);

  console.log("done.");
}

run().catch(console.error);
```

**Vault prep:**
- Sign in to `/app`, fund your demo vault with **at least $0.05 devnet USDC** (the two calls cost $0.002 total but leave headroom)
- Make sure `api.openai.com` + `api.anthropic.com` are in your vault's allowlist (add them via /app's allowlist editor)
- Mint a key, copy it into `~/demo-agent/.env`:
  ```
  KYVERN_AGENT_KEY=kv_live_<your-key>
  ```

**Window layout — pin this BEFORE recording:**
- Left half of screen: Chrome with `kyvernlabs.com` loaded
- Right half: VS Code with `agent.ts` open + integrated terminal below it
- Browser zoom 110%, VS Code font 14pt minimum so the camera reads
- Solana Explorer pre-warmed in a sibling Chrome tab

**Dry run once silently before recording.** Run `node agent.ts` from
the project folder. Confirm both calls settle and signatures show.
This catches a missing allowlist entry or low SOL before you waste
a take.

---

## STEP 1 · Hook · 0:00 → 0:10

**ON SCREEN** — Full Chrome on `kyvernlabs.com`. Hero visible. Live trust bar ticking on the right.

**SAY**

> AI agents shouldn't hold private keys. They should have budgets.
>
> On Solana, we built that.

**HOLD** — 3 seconds.

---

## STEP 2 · Atlas, the live proof · 0:10 → 0:35

**ON SCREEN** — Click **Watch Atlas** in the top nav. The `/atlas` page loads. You see four hero stats at the top: alive, merchants paid, attacks blocked, funds lost.

**SAY**

> This is Atlas. Our reference agent. It's been running on Solana devnet for [DAYS] days, fully autonomous.
>
> [PAID] real on-chain payments. [BLOCKED] attack attempts refused by the policy engine. Zero dollars lost.

**ON SCREEN** — Scroll down past the "Atlas earned" earnings card. You see a list of recent settled payments, each with a short signature like `3kR8…mN4v` and an arrow icon. Click any row.

Solana Explorer opens in a new tab. A real on-chain transaction loads.

**HOLD** — 2 seconds.

**SAY**

> Every settled payment is a real Solana transaction. Anyone can click and verify.

---

## STEP 3 · Mint a key on /app · 0:35 → 1:05

**ON SCREEN** — Close the Explorer tab. Go to `https://app.kyvernlabs.com/app` (you're already signed in). The canvas loads.

**SAY**

> Now I'll show you how to put your own agent on it.

**ON SCREEN** — Scroll to the SDK card in the center column. Click the `.env` tab. Your agent key shows on screen, prefixed `kv_live_`.

**SAY**

> Mint a key. This `kv_live_…` is yours. Shows once, paste it into your env, never see it again.

**ON SCREEN** — Click the **Copy** button on the npm install row at the bottom of the SDK card.

**SAY**

> One npm install. Right there. Let me actually do it.

---

## STEP 4 · Install the SDK live · 1:05 → 1:25

**ON SCREEN** — Switch to VS Code. The integrated terminal is visible at the bottom. Type:

```
npm install @kyvernlabs/sdk
```

Hit enter. Because the cache is warm, it completes in 2–3 seconds with `added 1 package`.

**SAY**

> npm install at kyvern labs SDK. Done. One dependency. Zero peer dependencies.

**ON SCREEN** — Click the `agent.ts` tab in VS Code. The wrapped code shows: `import Vault`, `new Vault({ agentKey })`, two `vault.pay()` calls.

**SAY**

> Here's an agent. Six lines that matter. Import Vault. Pass your key. Call vault dot pay with the merchant, the amount, the memo.
>
> If the chain allows it, you get a signature. If it refuses, you get a reason.

---

## STEP 5 · Run the agent · 1:25 → 2:00

**ON SCREEN** — In the terminal, type:

```
node agent.ts
```

Hit enter. Two `vault.pay()` calls fire. The terminal logs:

```
→ vault.pay() · api.openai.com · $0.001
  settled · 4F2g…h7Kj
→ vault.pay() · api.anthropic.com · $0.001
  settled · 8mN3…pR4t
done.
```

**SAY**

> Two payments. Both routed through Kyvern. Both settled on Solana.
>
> Watch what happens on the dashboard.

**ON SCREEN** — Switch to the Chrome window with `/app` open. Scroll to **Recent SDK calls** in the center column. The two payments your agent just fired are landing in the list — same timestamps, same merchants, same signature prefixes.

**HOLD** — 3 seconds. Let the rows land visibly.

**SAY**

> Same agent. Same calls. Now they're on-chain artifacts you can audit.

---

## STEP 6 · Click through to Explorer · 2:00 → 2:25

**ON SCREEN** — In the Recent SDK calls list, click on one of the two fresh rows (the one with the most recent timestamp). It expands or opens Explorer with the signature.

**ON SCREEN** — Click the signature link. Solana Explorer opens with the real tx — your agent's pubkey as signer, the vault's USDC ATA as source, the merchant payment in the instructions.

**HOLD** — 3 seconds.

**SAY**

> Real Solana transaction. Real Squads spending-limit instruction. Real on-chain enforcement.
>
> If my agent had tried something the policy refuses, you'd see a failed tx here instead, with the error code in the program logs.

---

## STEP 7 · Watch the chain refuse · 2:25 → 2:45

**ON SCREEN** — Close the Explorer tab. Back on `/app`, scroll to the right column. Find the **Watch the chain refuse** card with three scenario buttons. Click **Try over-cap $5**.

**HOLD** — 3 seconds. No narration.

A red refused panel appears with error code 12002 and an Explorer link.

**SAY**

> Five-dollar payment. Per-tx cap is fifty cents. Refused on chain in three seconds. Error code twelve thousand two.

**ON SCREEN** — Click the Explorer link. The failed tx loads with `AmountExceedsPerTxMax` in the program logs.

**HOLD** — 2 seconds.

---

## STEP 8 · Close · 2:45 → 3:00

**ON SCREEN** — Cut back to the landing page one last time. The manifesto tagline is visible at the bottom.

**SAY**

> AI agents are going to spend trillions of dollars on their own.
>
> Kyvern is the authorization layer that makes that safe.
>
> Today, Atlas runs on it. Today, the SDK ships. We go to mainnet next month.

**HOLD** — Fade on the tagline: *"Agents shouldn't have keys. They should have budgets."*

**END** — 3:00 exactly.

---

## How to read this script while recording

- The script is on your **phone**, propped under the laptop camera lens. Looking at it = looking at camera.
- Every spoken line is a complete sentence. Read each one with a small pause at the end. Don't run them together.
- The "narration over action" beats (Step 4 install, Step 5 run) — the action is faster than the narration. Pace your sentence to finish *as* the terminal output appears.
- If you flub a line, breathe and restart that step. Editor splices.

---

## If something breaks on camera (graceful fallbacks)

| What happens | What to do |
|---|---|
| **`npm install` shows deprecation warnings** | Ignore. Just say "done" when the prompt returns. Deprecation noise is normal in real installs and judges know it. |
| **`node agent.ts` errors with "Cannot find module @kyvernlabs/sdk"** | The cache miss happened. Run `npm install --legacy-peer-deps @kyvernlabs/sdk` and retry. Take 2. |
| **First `vault.pay()` returns `refused · merchant_not_allowed`** | You skipped allowlist prep. Stop. Add `api.openai.com` and `api.anthropic.com` in /app's allowlist editor. Retry. |
| **First `vault.pay()` returns `refused · insufficient balance`** | Vault is below $0.01. Stop. Fund via the **Top up** FAB on /app. Retry. |
| **One or both calls take > 10 seconds** | Solana devnet is congested. Pause narration, let it finish, then continue. Don't restart the take — silence is fine; failure is not. |
| **Hard fail (RPC down, fee-payer empty, etc.)** | Cut to the **fallback path**: on `/app` click the **Run prediction agent** button on the "Bring your own agent" card. That fires the same kind of integration through the server. Skip the terminal entirely for that take, re-record the install/run sequence on take 2. |

The terminal beats are the strongest beats *if they work*. The
fallback is still strong — the BYOA button is the same proof,
just driven by a button instead of `node`.

---

## Take log

| Take | Started | Notes |
|------|---------|-------|
| 1    |         |       |
| 2    |         |       |
| 3    |         |       |
