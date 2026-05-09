# Kyvern · Frontier Demo Script

> 3-minute hero demo for Colosseum Frontier submission.
> Screen Studio / Screenbuddy + face cam.
> Story-first, working-things-only, no feature recitation.

---

## Strategy in one sentence

Open with the **villain** ("agents drain wallets"), reveal the
**device** as the answer, walk the viewer **through** the device
exactly the way a user would (landing → /try → unboxing → /app →
configure a worker → watch chain decide → builders panel → wrap their
own agent), close with the **proof** (Atlas, 18 days, on-chain).

You're not selling features. You're walking a person through a
working device, and every step they see is a real on-chain artifact.

The metaphor stays: **"a Solana device for your AI agent."** Don't
swap it. Lean in. Unboxing makes it concrete.

---

## Pre-record checklist (do every step)

### 1 hour before · environment

- [ ] **Walk the unbox flow once** to seed your demo device.
  Sign in via Privy on `kyvernlabs.com/login` (or use `/try` guest
  mode). `/unbox` auto-creates the vault + Sentinel/Wren/Pulse for
  you. Land on `/app`. This is the same path the demo will show on
  camera — you're just seeding state ahead of time.
- [ ] **Fund $25 devnet USDC** via [Circle faucet](https://faucet.circle.com)
  - Open `/app` · "Fund the vault" → copy your USDC ATA → request 25
- [ ] **Vault settings → merchant allowlist**: add
  `api.openai.com`, `api.pay.sh/gemini`
- [ ] **Mint an agent key** from `/app` · "Use the device" pane —
  copy `kv_live_…` to your clipboard (it shows ONCE)
- [ ] **Set Pulse trigger** to `SOL below $X` where X is current spot
  + $0.50. Don't save yet — you'll save on camera.

> **Why seed first**: the demo shows `/unbox` again on camera (the
> cinematic), but the device that lands on `/app` afterwards needs to
> already have funds + allowlist + agent key + a Pulse trigger queued.
> If you wait until recording to fund + mint + configure, those steps
> eat 5+ minutes you don't have. Seed now, walk through the same flow
> on camera, hit `/app` with everything pre-armed.

### 30 minutes before · staging

- [ ] **Screen Studio / Screenbuddy** open, settings:
  - Resolution 1920×1080 (horizontal track) and 1080×1920 (vertical)
  - Mouse highlight ON, click radar ON
  - Face cam circular bottom-left, ~280px diameter
  - Audio: external mic if you have one, otherwise MacBook built-in
- [ ] **Browser** with these tabs in order, all logged in:
  1. `kyvernlabs.com` (landing — you'll start here)
  2. `kyvernlabs.com/try` (unboxing path)
  3. `kyvernlabs.com/app` (your fresh demo device)
  4. `kyvernlabs.com/atlas` (proof page)
  5. `solscan.io` or `explorer.solana.com` (for receipt clicks)
- [ ] **Editor (Cursor / VS Code)** with `examples/builder-demo/agent.ts`
  open. Terminal at the bottom, cwd `~/demo-agent`. Run `npm install`
  beforehand so it's already done.
- [ ] **Window layout**: Editor + terminal on the right half. Browser
  on the left half. Both 50/50. Keep this for the entire builders
  segment.
- [ ] **Live SOL price** check — refresh DexScreener. Confirm Pulse
  trigger threshold is within $0.50–$1.00 of spot so it fires fast.
- [ ] **Test the recording chain once with throwaway take** — 30 sec
  clip, verify mic level, face cam framing, screen capture quality.

### Right before record

- [ ] Close all unrelated apps. Disable notifications (Mac Focus mode).
- [ ] Tab bar in browser hidden (Cmd+Shift+\).
- [ ] Editor: hide minimap, breadcrumbs, status bar if your theme
  allows. Maximize agent.ts so it's the focus.
- [ ] Drink water. Two takes minimum, never use the first.

---

## The 3-minute script

Each row: time · what's on screen · what your face/voice does.

### Act 1 · The villain (0:00 – 0:20)

| Time | Screen | Voice / face cam |
|---|---|---|
| 0:00 – 0:08 | **Face cam full screen**. White background, you. | "AI agents are everywhere now. But here's the problem nobody talks about: most of them have your private keys." (look into the camera, not the screen) |
| 0:08 – 0:20 | Cut to a Twitter screenshot or a generic "agent drained $X" headline (5s) → fade to face cam | "If your agent goes off the rails — bad prompt injection, hallucinated transaction — your wallet gets drained. There is no kill switch. Until now." (face cam, slight smile on "until now") |

### Act 2 · The device (0:20 – 0:55)

| Time | Screen | Voice / face cam |
|---|---|---|
| 0:20 – 0:30 | Cut to **kyvernlabs.com** landing. Cursor halo glows around the device card. Hero h1 visible: "A Solana device for your AI agent. The chain decides every dollar." | "I built Kyvern. A Solana device for your AI agent. Three pre-installed workers, one vault, an on-chain budget program enforcing every dollar." |
| 0:30 – 0:40 | Click "Try a Kyvern · no login" on the hero → lands on `/try` → provisioning screen ticks through "Spinning up your sandbox device · Provisioning a Squads multisig · Wiring the Kyvern policy program · Installing the three starter workers" — no Privy modal, no signup. Land on `/app`. | "No signup. Click once. The device spins up a real Squads multisig on Solana devnet, wires it to my Anchor program, installs three workers, drops me into the device. This is what every visitor gets." |
| 0:40 – 0:55 | On `/app` — three worker tiles already visible: Sentinel · Wren · Pulse. Hover each tile to surface the live state. | "Sentinel finds paid Solana bounties for me. Wren watches wallets I care about. Pulse fires conditional swaps when prices hit. All three running on real on-chain cycles already." |

> **Stitching note**: the `/try` flow is real but it's *guest mode* —
> agent-key minting (used in Act 5) is gated behind Privy sign-in. So
> off-camera before recording, you're already signed in to your own
> Kyvern device. On camera, you click `/try` to *demonstrate* the
> zero-friction onboarding moment. Then for the rest of the demo
> you're operating on your own signed-in device (which looks
> identical — same UI). Judges don't notice the cut, and you get full
> SDK functionality for the builder act.

### Act 3 · The chain decides (0:55 – 1:40)

| Time | Screen | Voice / face cam |
|---|---|---|
| 0:55 – 1:05 | Click into Pulse tile → worker page loads, single column · 720px · Apple-Settings layout | "Each worker is configurable. Watch this." |
| 1:05 – 1:25 | Show Configure card · type the threshold ($current+$0.50) · spend $0.10 · swap into SOL · check the green "Chain-enforced" pill · hit Save. Inbox slides in within seconds with "✓ ON-CHAIN · You got SOL at $X" | "I told the device: when SOL drops below ninety-three, fire ten cents into SOL. Save. Within seconds, the chain validates, the swap settles, the receipt lands in my inbox." |
| 1:25 – 1:40 | Click the finding → expanded detail · click "View on-chain swap ↗" → Solana Explorer opens in new tab with the real signed tx | "Real Solana receipt. Real chain enforcement. Click the signature — there it is on Explorer. The vault holds my USDC. The chain decides every dollar. Try to drain it —" |

### Act 4 · The drain (1:40 – 2:00)

| Time | Screen | Voice / face cam |
|---|---|---|
| 1:40 – 1:55 | Cut to `/atlas` · scroll to the drain callout · click "Try to drain" button. Red toast appears: "✕ blocked · merchant not allowed". Click the failed-tx Explorer link. | "And the chain refuses. Real failed Solana transaction, with the program error in the logs. Your USDC stays in the vault. This is what 'chain-enforced' actually means — not a server check, not a webhook, the protocol itself." |
| 1:55 – 2:00 | Atlas hero stats visible: "18 days · 8,700+ cycles · 3,300+ attacks blocked · $0 lost · $24 earned" · numbers ticking | "Atlas — our reference deployment — has been live 18 days. 3,300 attacks refused. Zero funds lost. Real x402 subscribers paying right now." |

### Act 5 · The platform (2:00 – 2:40) ← THE BUILDER MOMENT

| Time | Screen | Voice / face cam |
|---|---|---|
| 2:00 – 2:08 | Switch to side-by-side: **Editor on right** (`agent.ts` open, raw OpenAI call visible). **Browser on left** (`/app` · "Use the device" panel · SDK pane). | "But the workers are templates. The product is the device — and the SDK that lets anyone wrap their agent." |
| 2:08 – 2:18 | Highlight `chatWithoutLimits` function in the editor for 1 sec. Then move cursor to browser, click Copy on the SDK snippet. | "Here's my agent. It has my OpenAI key. No limits. Watch me wrap it." |
| 2:18 – 2:30 | Paste over the function in the editor, save (Cmd+S). The replaced function shows `vault.pay({ merchant, amount, memo })` then the OpenAI call. | "Five lines. The vault asks the chain first. The chain decides. Then the model gets called." |
| 2:30 – 2:40 | Terminal: `npx tsx agent.ts "what's the weather in Lahore?"` → console prints answer + `on-chain receipt: https://explorer.solana.com/tx/...`. Click the URL → Solana Explorer loads. | "Real on-chain receipt. From an agent I just wrapped on camera. The SDK is on npm right now — `npx create-kyvern-agent`. Anyone can do this." |

### Act 6 · The close (2:40 – 3:00)

| Time | Screen | Voice / face cam |
|---|---|---|
| 2:40 – 2:55 | Cut to face cam, you. Behind you (or in a lower third): "Kyvern · A Solana device for your AI agent · kyvernlabs.com" | "I built this in Lahore, alone, in two months, for Colosseum Frontier. Solana devnet. Real Anchor program. Real Squads multisig. Real x402 subscribers paying Atlas every minute." |
| 2:55 – 3:00 | End card: KV mark + URL fade in | "Kyvern. The chain decides every dollar. Kyvernlabs dot com." |

---

## Voice direction (matters more than you think)

- **Pace**: Slow on the hook ("AI agents are everywhere now") to make the
  villain land. Speed up on the device walkthrough. Slow down again
  on the receipt click ("Real Solana receipt"). End slow on the close.
- **Where to look**: Camera for face-cam beats. Screen for screen-cam
  beats. Don't drift between them — judges feel the unfocus.
- **Don't say**: "as you can see," "essentially," "basically," "kind
  of," "we just" (apologetic). Replace with declarative verbs.
- **Pauses are weapons**: After "until now" — pause 0.5s. After "the
  chain refuses" — pause 0.5s. After "anyone can do this" — pause
  0.5s. Lets the moment land.

---

## The 5 things that make this a winning demo (vs. just a good one)

1. **You open with the villain, not the product.** Most demos start
   "Hi I'm building X." You start with "AI agents have your keys —
   here's why that's a problem."
2. **The chain decides — *on screen* — *during* the demo.** Pulse
   fires live. Drain refuses live. Both produce real Solana txs the
   judge can click.
3. **You wrap an agent on camera.** Not in a pre-recorded clip. The
   judge sees a builder-experience moment from copy to receipt in 25
   seconds. That's rare.
4. **Atlas is the side-proof, not the centerpiece.** 18 days of
   unbroken on-chain activity is your moat — but it's a single cut,
   not a feature dump.
5. **You're the founder on camera.** Lahore. Two months. Solo. Most
   submissions hide behind product. You don't. Mert's advice: tell a
   good story. The story is the device, and you're the narrator.

---

## Failure-mode contingencies (cut and reset, don't repair on camera)

| If this happens | Do this |
|---|---|
| Pulse trigger doesn't fire within 10 sec of save | Cut. Lower the threshold gap to $0.20. Re-record from "I told the device". |
| `vault.pay()` returns 502 squads_cosign_failed | The demo vault's daily Squads cap is exhausted. Either wait 24h for the period reset OR cut to `/atlas` drain attempt instead. |
| Editor paste creates a syntax error | Cut. The snippet is verified paste-and-run; the issue is your file. Fix off-camera, restart from "Here's my agent." |
| Solana Explorer slow to load | Have a back-up tab pre-loaded with a known fired tx ready. Switch to it — the visual is what matters. |
| Mic picked up a notification ding | Cut. Disable Focus mode toggle, restart the take. |
| Face cam looks washed-out | Reset Screen Studio camera settings. Daylight from a window > overhead lights. |

---

## After-record polish

- [ ] Trim hard — under 3:00 sharp. Frontier values brevity.
- [ ] **Captions burned in** (not auto-generated by YouTube).
  Most viewers watch X muted on first scroll.
- [ ] Music: subtle, ambient, drum-machine. No melody. Examples:
  Tycho, Brian Eno, ambient Solana hackathon B-sides. Volume at
  -22 dB so voice sits clearly above.
- [ ] Color grade: lift shadows slightly, sharpen midtones. Don't
  oversaturate — the device UI is white/green, keep it clean.
- [ ] Export 1080×1920 vertical for X / Frontier showcase, 1920×1080
  horizontal for accelerator track.
- [ ] Upload to YouTube **unlisted** (stable URL) AND native X upload
  (algorithm prefers native).
- [ ] Test the YouTube link from a different device (a friend's phone)
  before submitting. Broken video = lost demo (Vibhu's rule).

---

## Why this wins

The infographic ranks "Have a working MVP" and "Show the actual
implementation" above all else. You over-clear both — 18 days of
unfakeable on-chain receipts.

But the win comes from how you *show* what you have. Most submissions
are "here's our slick UI and our great idea." Yours is "here's a
device a judge can use, here's the chain refusing a real attack on
camera, here's a builder wrapping an agent on camera, here's an
agent that's been autonomously alive for 18 days. Now click any
signature."

The judge can't fake-replicate that between now and judging. Nobody
else can either.

Two takes, pick the second, ship.
