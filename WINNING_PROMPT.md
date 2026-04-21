# Mission: Win the Solana Frontier Hackathon with Kyvern Vault

You are taking over a hackathon project that **must** win. Read this entire brief, then audit, transform, and execute. You have full authority to change positioning, narrative, scope, or even the product itself if you can prove a higher-conviction path to winning. The only non-negotiable: ship something that wins.

---

## 1. The Hackathon

**Solana Frontier Hackathon.** Judged by Solana Foundation, Squads, Helius, and ecosystem leads.

Tracks reward production-ready primitives that move SOL / USDC volume on Solana — ideally leveraging:
- **Squads Protocol v4** (multisigs / smart accounts / spending limits)
- **Token-2022 / token extensions**
- **Solana's signing model** used in novel ways
- **Agent commerce / x402-style** primitives

Judges weight, in order:
1. Actually works on-chain — judges click the explorer link
2. Clear, durable use case (not a toy)
3. Real distribution potential (devs would pick this up tomorrow)
4. Technical depth (uses Solana's specific powers, not "could be on any chain")
5. Demo clarity in 90 seconds

---

## 2. What We Are Building

**Kyvern Vault — "Give your AI agent a Visa with a daily cap. One import. Enforced on-chain by Squads v4 on Solana."**

The user creates a Squads multisig + on-chain spending limit for an agent in ~60 seconds. The agent receives a bearer key that maps to a Solana delegate. Our SDK (`@kyvernlabs/sdk`) wraps payments — over-budget or off-allowlist transfers are blocked **before they sign**. No runtime, no proxy, no policy engine to host. The chain is the policy engine.

Why it matters: every "agent that can spend money" demo today either (a) gives the agent a hot wallet (rugged in 24h), (b) routes through a custodial credit primitive (slow, KYC heavy), or (c) builds a custom policy engine (engineering debt). Kyvern uses Squads' native spending limits as the primitive — the bound is in consensus, not in our code.

### Stack
- Next.js 14 + TypeScript + Tailwind + Framer Motion (white/light premium theme — Linear / Stripe / Vercel feel)
- `@sqds/multisig` v2.1.4 (`multisigCreateV2`, `multisigAddSpendingLimit`, `spendingLimitUse`)
- Solana web3.js v1.98.4, SPL-token v0.4.14
- USDC devnet mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (6 decimals)
- Privy for wallet auth
- SQLite (better-sqlite3) for vault metadata + analytics
- Server-side fee payer with auto-airdrop on devnet
- Oracle Cloud VM: `ubuntu@141.148.215.239` for production hosting; Vercel acceptable too

### Repo Layout
- `/src/app` — Next.js app router (landing, `/vault/new` wizard, `/vault/[id]` dashboard, API routes)
- `/src/lib/squads-v4.ts` — Squads integration (`createSmartAccount`, `setSpendingLimit`, `coSignPayment`)
- `/src/lib/db.ts` — SQLite vault + events tables
- `/packages/sdk` — `@kyvernlabs/sdk` (published to npm at v0.3.0)
- `/CLAUDE.md` — full product context (read this first)

---

## 3. Where It Stands Right Now

### Working
- Squads v4 multisig + spending-limit creation on devnet with proper confirmation (the earlier silent-failure bug from `skipPreflight: true` is fixed; PDAs now actually exist on Explorer)
- Vault creation wizard with on-chain proof rendered on the success step (Smart account, Vault PDA, Spending limit — all linked to Solana Explorer)
- Agent snippet card on the vault dashboard: copy-paste SDK snippet + live in-browser playground + Explorer chips
- SDK shipped at v0.3.0 with the Visa positioning
- Landing page hero + code snippet rebranded to the Visa positioning

### Not Done — Your Runway
- 5 stale "Agent CFO" string references: `src/app/page.tsx:11`, `src/components/landing/hero-vault.tsx:4`, `src/lib/db.ts:251`, `packages/sdk/src/index.ts:2`, plus 2 JSON-LD descriptions in `src/app/layout.tsx`
- Health badge on `/vault/[id]` dashboard showing real-vs-stub mode (data already on the API response — surface it)
- Full `tsc --noEmit` + `vitest run` clean pass
- Public production deployment (Oracle VM + Vercel) at a custom domain judges can click
- 90-second submission video (screen recording, captioned)
- Submission writeup (problem → solution → on-chain proof → wedge)
- A `My Vaults` index polish at `/vault/list`

---

## 4. The Critical Failure Mode We Already Fixed (Don't Reintroduce It)

The multisig PDA used to not exist on Explorer because:
1. The Squads txs used `skipPreflight: true` and never `await`ed `confirmTransaction`, so failed txs returned fake-success signatures.
2. `configAuthority` was `null` at creation but `feePayer.publicKey` for the spending-limit add — constraint mismatch.

Both fixed in `src/lib/squads-v4.ts` via a `confirmOrThrow` helper, removal of `skipPreflight`, and a unified `configAuthority: feePayer.publicKey`. **Re-verify by creating a fresh vault on devnet, clicking the Explorer link, and confirming both the smart account and the spending limit PDA actually exist.** If they don't, the demo dies. This is the single highest-leverage thing to verify before building anything new.

---

## 5. Your Permission Slip — Use It

You can transform anything if it raises win odds. Every change needs a defensible *"this raises win probability because…"* attached, but otherwise no permission needed:

- **Reposition.** If "Visa with a daily cap" doesn't land with Solana judges, pivot the narrative. Maybe it's "Stripe Atlas for AI agents on Solana." Maybe it's "the missing primitive between Squads and Eliza/LangGraph/Claude Agent SDK." Pick what wins.
- **Cut scope.** If a feature is half-built and dragging the demo down, delete it. A 30-second demo that lands beats a 90-second demo with a dead feature.
- **Add scope.** If there's a 4-hour feature that 10×'s perceived value (e.g., `npx create-kyvern-agent` that scaffolds a vault + sample agent in one command), build it.
- **Pivot the product.** If after auditing you believe a different product would win — e.g., focus on the analytics layer (Pulse from CLAUDE.md), or pivot to a Token-2022 transfer-hook variant — say so with evidence and pivot. Don't be precious.
- **Different protocol leverage.** If Token-2022 transfer hooks, ZK compression, or some other Solana-specific primitive would impress judges more than spending limits, evaluate and switch.
- **Rewrite the README, the landing page, the metadata** — anything narrative.

The only things you cannot do: lie about on-chain state, fake transactions, stage screenshots that don't reflect reality, or claim integrations that don't exist. Win on truth.

---

## 6. What "Winning" Looks Like

A judge opens the submission, watches a 90-second video, clicks the live URL, creates a vault, pastes the snippet into a sample script, runs it, watches an over-budget call get blocked on-chain with a Solana Explorer link as proof. They walk away thinking: *"this is the missing piece for agent commerce on Solana."*

### Concrete shippable artifacts
1. **Live deployment** at a custom domain (kyvernlabs.com or similar) — does not 500, loads in <2s
2. **One-click demo path:** landing → "Try it" → vault created in 60s → working snippet they can hit from their terminal
3. **Two devnet transactions** linked in the submission: one allowed, one blocked, both inspectable on Solana Explorer
4. **90-second demo video:** screen recording with voiceover or captions, ends on the blocked-tx Explorer page
5. **Submission writeup** opening with the problem (agents drain wallets; no native bound on agent spending) → the solution (Squads v4 spending limits as the primitive) → the wedge (one import, no runtime)
6. **Clean GitHub repo** with READMEs for app + SDK, one-command local setup, MIT license

---

## 7. Winning Tactics — Use These

- **Lead with the on-chain proof.** Judges have seen 100 agent demos. The first frame of the video should be a Solana Explorer link showing a real spending limit PDA. That's the moat.
- **Steal Squads' thunder respectfully.** Tag @SquadsProtocol on submission tweet. Frame Kyvern as *"the developer surface for Squads v4 spending limits."* Get a retweet → judge attention.
- **Pre-record the demo.** Live demos die on Wi-Fi. Record once, perfect, MP4. Submit the file, not a livestream link.
- **Ship `npx create-kyvern-agent`** if time allows — one command scaffolds a vault + sample agent script. Devs love this; judges remember it.
- **Two-line npm install in the README.** A judge must get from "I see the repo" to "I made a payment get blocked" in under 5 minutes.
- **Distribution proof in the writeup.** Even one external developer using it (DM screenshot, GitHub star, tweet quote) signals traction.
- **Mention the founder's track record.** 5 prior hackathon wins, 3 prior x402 projects shipped. Judges trust shippers.

---

## 8. How To Operate

1. **Audit first, code second.** First 30 minutes: read `/CLAUDE.md`, `src/lib/squads-v4.ts`, `src/app/vault/new/page.tsx`, and create a fresh vault on devnet end-to-end. Confirm on-chain proof works. Note every gap.
2. **Lock the narrative.** Pick the positioning in one sentence before writing any code. Test it: would a Solana judge nod or tilt their head?
3. **Cut, then build.** Trim anything that doesn't serve the 90-second demo. Then add only what raises perceived value.
4. **Verify constantly.** After every meaningful change run:
   - `node node_modules/typescript/bin/tsc --noEmit` (the global `tsc` alias is broken — use this exact path)
   - `node node_modules/vitest/vitest.mjs run` (don't pass `--reporter=basic` — vitest rejects it)
   - `npx next build` will SIGTERM in the sandbox due to better-sqlite3 native bindings; build on the Oracle VM instead.
5. **Deploy early.** Get a public URL up before polishing UI. Live with rough edges beats perfect on localhost.
6. **Write the demo script before building.** If a feature isn't in the script, don't build it.

---

## 9. Founder Profile

**Shariq Azeem** (@shariqshkt) — 5 hackathon wins ($4,250 total), built 3 prior x402 projects (ParallaxPay won $1,500), deep Squads / Solana / x402 knowledge. Strengths: Next.js, Tailwind, Framer Motion, fast UI shipping. Pattern weakness: over-engineering, scope sprawl, hitting too many tracks at once. **Counter that.** One product, one problem, devastatingly well.

Email: shariqshaukat786@gmail.com

---

## 10. Final Word

Win at any cost — legally, ethically, on-chain truthfully. If something I told you above is wrong or suboptimal, override it. The only metric is the prize.

The brief is loaded. Audit, decide, ship.

**Now go win.**
