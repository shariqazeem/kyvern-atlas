# Builder Demo Prep

Materials for the live "wrap any agent with Kyvern" segment of the
Frontier demo. Pre-stage these on your machine before you press record.

## What you have on screen

- **Left half**: `kyvernlabs.com/app` open in a browser. "Use the device"
  panel expanded, SDK pane selected. Your agent key visible.
- **Right half**: Editor (Cursor / VS Code) open with `agent.ts` from
  this folder. Terminal at the bottom of the editor, cwd in this folder.

## Prep checklist (15 minutes before record)

```bash
# 1. Make a clean working dir
mkdir ~/demo-agent && cd ~/demo-agent

# 2. Scaffold the project (this is the npx flow you'll narrate later)
npm init -y
npm install @kyvernlabs/sdk openai dotenv tsx
npm install --save-dev typescript @types/node

# 3. Drop the agent.ts file from this folder into ~/demo-agent/agent.ts
cp /path/to/kyvern-atlas/examples/builder-demo/agent.ts ./agent.ts

# 4. Set up env
cat > .env <<EOF
OPENAI_KEY=sk-…              # your real OpenAI key
KYVERN_AGENT_KEY=kv_live_…   # mint from /app · Use the device pane
EOF

# 5. Open editor side-by-side with browser
cursor ~/demo-agent
```

## Vault prep (separate, do this once)

You need a fresh demo vault that's NOT Atlas (Atlas's Squads spending
limit is exhausted by the runner cycle). Quick path:

1. `kyvernlabs.com/vault/new` → 60 seconds, follow the wizard
2. Fund with **$25 devnet USDC** via the Circle faucet
3. Add `api.openai.com` to the merchant allowlist
4. Mint an agent key from `/app` · "Use the device" pane (it shows once)
5. Paste it into `~/demo-agent/.env`

## The recording moment (≤25 seconds on camera)

| Beat | Action | Voice |
|---|---|---|
| 1 | Editor visible · `agent.ts` open · point to `chatWithoutLimits` | "Here's my agent. It has my OpenAI key. No limits." |
| 2 | Move to browser · /app · Use the device · SDK pane · Copy | "Five lines from my Kyvern device." |
| 3 | Paste over `chatWithoutLimits` (or just rename + paste below) | (silent — the paste happens fast) |
| 4 | Save · terminal: `npx tsx agent.ts "what's the weather in Lahore?"` | "Now my agent asks the chain first." |
| 5 | Console prints "on-chain receipt: https://explorer.solana.com/…" | "Real Solana receipt. Real chain enforcement. The same vault that runs my pre-installed workers." |
| 6 | Click the Explorer link · transaction loads | "Every dollar accounted for." |

## What to do if it fails on camera

- **`vault.pay()` returns `decision: "blocked"` with code
  `merchant_not_allowed`**: your demo vault's allowlist doesn't include
  `api.openai.com`. Add it from the vault settings page and rerun.
- **Returns 502 / `squads_cosign_failed`**: the demo vault's Squads
  spending limit is exhausted. Either wait until the period rolls
  (24h) or create a fresh vault.
- **OpenAI 401**: your `OPENAI_KEY` env var. Re-export and rerun.

The recording moment is **NOT** the place to debug. If anything goes
sideways, cut, fix, restart. Two takes minimum.

## Why this beat lands

It's the only moment in your 2-min demo where the judge sees a builder
*using* Kyvern (not just looking at the device UI). The reframe lands:
*"the workers are templates, the device is the product"* is now
literal — the judge watched a builder ship a 5-line wrap that produces
a real on-chain receipt. The SDK is real, the npm package is real, the
chain enforcement is real, all in 25 seconds of screen time.
