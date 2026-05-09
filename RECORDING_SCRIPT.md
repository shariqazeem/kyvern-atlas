# RECORDING_SCRIPT.md — Frontier + Kast Pakistan demo

> 2:00 hard cap. Same video for both submissions; only the open/close
> 10 seconds change for Kast Pakistan flavor.

The structure is hybrid: founder hook → code-first credibility beat
(judges see the SDK actually working) → device differentiator (per-user
event feed) → on-chain proof → CTA. Code-first because infra judges
want to see the product run; chassis because it's what no other
submission has.

---

## Pre-record state (do this once, ~20 min before record)

- [ ] **Test wallet ready**: a fresh Privy account NOT signed-in yet.
      Credentials saved in browser password manager so the auth modal
      is one click on camera.
- [ ] **Fee payer USDC ≥ 5 USDC** at https://faucet.circle.com
      (paste `GZCnHuFtswvsJftSDmtoHEve8amqNLzAAPvYy8NU3ZNZ`). Each
      fresh vault burns 1 USDC of this pool to seed Test Payout.
- [ ] **`~/demo-agent/` ready**: `npx create-kyvern-agent demo-agent`
      already run, `npm install` done, `agent.ts` open in editor with
      a small font (judges have to read it).
- [ ] **Tabs in order** in your demo browser profile (all logged out):
      1. `kyvernlabs.com` (landing)
      2. `solscan.io` (Explorer fallback)
      3. `solscan.io/account/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet`
         (Kyvern Anchor program — pre-loaded for the proof beat)
- [ ] **Window layout**: editor + terminal on the right half, browser
      on the left half. Both 50/50. Hold this through the whole take.
- [ ] **Disable notifications** (Mac Focus mode), close unrelated apps,
      hide bookmarks bar, hide tab strip on the browser.
- [ ] **Mic check**: 30s throwaway take. Verify levels.

If the airdrop fee payer balance hits zero mid-take, vaults will still
provision but Test Payout fails — re-check before record.

---

## The script (2:00 cap)

Beat times are guidelines. Don't read word-for-word — paraphrase
naturally. The square brackets are screen actions.

### 0:00–0:10 · Founder hook

[Browser at https://kyvernlabs.com/]

> "I'm Shariq. I built Kyvern for solo Pakistani builders who want
> AI agents to spend stablecoins for them — without giving the agent
> a private key. Watch the SDK in 90 seconds, then I'll show you the
> chain refusing a real attack."

### 0:10–0:55 · Code-first credibility (the DeepSeek beat)

[Cut to terminal split-screen — editor left, terminal right]

```bash
$ npx create-kyvern-agent demo-agent
$ cd demo-agent && npm install
```

[`agent.ts` visible — emphasize the 3 lines that matter]

```ts
import { Vault } from "@kyvernlabs/sdk";
const vault = new Vault({ key: process.env.KYVERN_KEY! });
await vault.pay({ merchant: "api.openai.com", amount: 5 });
```

> "Five dollars to OpenAI. Run it."

```bash
$ npm start
❌ BLOCKED — AmountExceedsPerTxMax (Kyvern error 12002)
```

> "Refused on-chain. Five dollars is over my per-transaction cap."

[Edit `amount: 5` → `amount: 0.05`. Save. Re-run.]

```bash
✅ ALLOWED — tx 4vWS…Au84
```

[Click the tx hash → Solana Explorer opens, real settled USDC transfer]

> "Real on-chain transfer through Squads multisig. Same merchant.
> Different amount. The chain decided."

[Edit `merchant: "api.openai.com"` → `merchant: "randomscam.xyz"`.
Save. Re-run.]

```bash
❌ BLOCKED — MerchantNotAllowlisted (Kyvern error 12003)
```

> "Different rule. Same enforcement. Every refusal is a real failed
> Solana tx — click any error code and you'll find it on Explorer
> with my Anchor program in the trace."

### 0:55–1:30 · The device differentiator (per-user feed)

[Switch to https://kyvernlabs.com/app — already signed in]

> "And every one of those calls just hit my device. This is the
> integration console — every user gets one."

[Point to the right column event feed — three rows are live: the two
blocks and the one allow]

> "Your code runs anywhere. The events land here in three seconds.
> Click any row…"

[Click the over-cap blocked row → expand → click Explorer link]

> "…real failed Solana tx, finalized, with the Kyvern program right
> in the instruction trace. The chain made the call. Not my server."

### 1:30–1:50 · Anchor program proof

[Switch to the pre-loaded Solscan tab for `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`]

> "Here's the program. Five enforcement rules. Custom error codes
> 12000 to 12005. Deployed on Solana devnet, live for 19 days.
> Atlas — our reference agent — has been running on it the whole
> time. Eight thousand cycles. Three thousand attacks blocked.
> Zero funds lost."

### 1:50–2:00 · CTA

[Cut to face cam OR landing-page hero]

> "Built solo, in Pakistan, for solo builders everywhere. SDK on
> npm — `npx create-kyvern-agent`. Let your AI agents run free."

[End card: KV mark + kyvernlabs.com + GitHub URL]

---

## Kast Pakistan flavor (replace 0:00–0:10 + 1:50–2:00)

**0:00–0:10:**
> "I'm Shariq, building from Lahore. Pakistani freelancers earn from
> AI agents but can't spend stablecoins. KAST fixes the spend side.
> Kyvern fixes the safety side. Watch."

**1:50–2:00:**
> "USDC out of the vault flows directly into a KAST card. One
> hundred dollars is twenty-eight thousand rupees. That's a
> meaningful month. It deserves a real safety primitive. KAST
> compatible — sign up at go.kast.xyz/VqVO/STPAK."

---

## Recording rules

1. **One take.** Don't re-edit unless something visibly fails.
   The product's premise is *things fail safely*. A live failed call
   is more compelling than a re-shoot.
2. **Slow the cursor.** Judges follow your hand. Don't zip.
3. **If a real call takes >5s on camera, keep talking.** "While
   that confirms — note the on-chain rules…" Fill the dead air.
4. **Cut and reset, don't repair on camera.** If anything 500s or
   the wizard hangs >10s, stop the take, restart pm2 if needed,
   re-record from the last clean beat.
5. **Two takes minimum, ship the second.** Always.

---

## Failure-mode contingencies

| If this happens | Do this |
|---|---|
| `npm install` slow on camera | Pre-run, just hit ↑ to show the recent command |
| Test Payout fails "no record of prior credit" | Fee payer USDC is empty → top up at faucet.circle.com, restart take |
| The blocked tx takes >8s to land in feed | Keep talking, then cut and try the over-cap button — different code path, often faster |
| Solana Explorer slow | Switch to the pre-loaded Solscan tab (always faster) |
| Privy modal hangs | Cut. Sign in beforehand for take 2. Either way works on camera |
| Anchor program tab errors | Pre-screenshot the program page, drop in as static cut |

---

## After-record polish

- [ ] Trim hard — under 2:00 sharp. Frontier values brevity.
- [ ] **Captions burned in** (not auto-generated). Most viewers watch
      muted on first scroll.
- [ ] Music: subtle, ambient. -22 dB so voice sits clearly above.
- [ ] Color grade: lift shadows slightly, sharpen midtones. The UI is
      white/black/green — keep it clean.
- [ ] Export 1920×1080 horizontal. Upload to YouTube **unlisted** for
      the portal URL + native upload to X for the launch thread.
- [ ] Test the YouTube link from a different device before submitting.
      Broken video = lost demo.

---

## Why this video wins

- **Code-first credibility.** Most submissions show a slick UI and tell
  you it's "powered by AI." This one shows the SDK actually running,
  the chain actually refusing, the Explorer actually opening.
- **Per-user device feed.** Almost no other submission has the
  user-level surface. It's not a general dashboard — it's *your*
  device, with *your* events, in *your* feed. That moment is what
  makes a judge stop scrolling.
- **Real on-chain artifacts.** Every refusal and every allow is a
  real Solana tx. A judge can click any signature and verify.
- **Solo Pakistani founder, on camera.** That story is the
  differentiator vs. teams of four with VCs.

Two takes, ship the second.
