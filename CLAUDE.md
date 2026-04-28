# Kyvern — Agent policy program on Solana (Colosseum Frontier)

**This is the active hackathon codebase.** If you're reading this cold, orient yourself here before anything else.

**Stellar/Pulse has been retired (2026-04-28).** The old `~/kyvernlabs` directory and the stopped `kyvernlabs` pm2 process on the VM are dead weight — leave them alone, don't pull, don't restart. Both `kyvernlabs.com` AND `app.kyvernlabs.com` now serve **this** repo via the `kyvern-commerce` pm2 process on port 3001.

---

## What this product is, in one sentence

Kyvern gives every AI agent a Squads vault with an on-chain Kyvern policy program that enforces budgets, merchant allowlists, velocity caps, memo requirements, and a kill switch — *before* a single USDC lamport moves. The chain is the arbiter, not our server.

**Tagline:** *"Let your AI agents run free."*
**Manifesto:** *"Agents shouldn't have keys. They should have budgets."*

One product, one user (solo Solana agent builders), one SDK (`@kyvernlabs/sdk`), one on-chain program (`PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` on Solana devnet).

---

## What's live (verify before touching)

| URL | What it is |
|---|---|
| https://app.kyvernlabs.com/ | Landing — single-brand Kyvern, live Atlas observatory in the hero |
| https://app.kyvernlabs.com/atlas | Public deep page — timeline, attack button, leaderboard |
| https://app.kyvernlabs.com/vault/new | Deploy-a-vault wizard (Clone Atlas is the 60-second path) |
| https://app.kyvernlabs.com/app | Logged-in home (pay-side only after the Apr 22 rework) |
| https://app.kyvernlabs.com/docs | Developer docs — install, vault.pay, vault.pause, errors |

**Atlas (reference agent) live stats via API:**
```bash
curl -sS https://app.kyvernlabs.com/api/atlas/status | head -c 300
```

Atlas has been running continuously on Solana devnet since **2026-04-20**. As of commit `fe5107b` (Squads SDK patch), cycles settle real on-chain transactions every 3 minutes — every row in the `/atlas` timeline links to Solana Explorer.

---

## VM deploy

**SSH:**
```bash
ssh -i ~/Documents/ssh-key3.key ubuntu@80.225.209.190
```

**What lives where on the VM:**

| Path | Role | Don't touch? |
|---|---|---|
| `/home/ubuntu/kyvernlabs-commerce/` | **Kyvern (this repo)** — serves both `kyvernlabs.com` AND `app.kyvernlabs.com` | No — this is where you deploy |
| `/home/ubuntu/kyvernlabs/` | Abandoned Stellar repo (retired 2026-04-28) | **Don't pull, don't build, don't deploy** |

**pm2 processes:**

| id | name | cwd | port | purpose |
|---|---|---|---|---|
| 8 | `kyvern-commerce` | `~/kyvernlabs-commerce` | 3001 | Kyvern Next.js app — serves both domains via nginx |
| 2 | `atlas` | `~/kyvernlabs-commerce` | — | `scripts/atlas-runner.ts` — autonomous agent loop (3 min cycles) |
| 3 | `atlas-attacker` | `~/kyvernlabs-commerce` | — | `scripts/atlas-attacker.ts` — adversarial probes every ~8 min |
| 5 | `agent-pool` | `~/kyvernlabs-commerce` | — | user-spawned agent ticker |
| 4 | `kyvernlabs` | `~/kyvernlabs` | 3000 | **Stopped — retired Stellar process. Do not restart.** |

**Required env vars on kyvern-commerce + atlas + atlas-attacker:**
```
KYVERN_ATLAS_DB_PATH = /home/ubuntu/kyvernlabs-commerce/atlas.db
KYVERN_BASE_URL      = http://127.0.0.1:3001
KYVERNLABS_AGENT_KEY = kv_live_b7b2001e8afa5de06c592a217852f2ca8fe78a60d4b3a49cdedb409665336075
ATLAS_VAULT_ID       = vlt_QcCPbp3XTzHtF5
ATLAS_CYCLE_MS       = 180000
ATLAS_ATTACK_MS      = 480000
PORT                 = 3001          (kyvern-commerce only)
```

If `KYVERNLABS_AGENT_KEY` gets lost after a `pm2 restart`, the public `/api/atlas/probe` endpoint returns `atlas_offline`. Restore with:
```bash
ssh ... 'KYVERNLABS_AGENT_KEY=kv_live_... pm2 restart kyvern-commerce --update-env && pm2 save'
```

---

## Standard deploy flow

**CRITICAL:** the VM's disk is typically 90%+ full and the SSH session often times out mid-`npm run build`. Always use the nohup + file-marker pattern below. A single long-running SSH command that wraps the whole chain WILL get killed mid-build on bad nights, leaving `.next/BUILD_ID` missing and pm2 in a crash loop.

```bash
# 1. Push to atlas/main first (locally — origin in THIS repo == github.com/shariqazeem/kyvern-atlas)
git push origin main

# 2. On the VM, start install+build in nohup so SSH flakes can't kill it
ssh -i ~/Documents/ssh-key3.key ubuntu@80.225.209.190 '
  cd ~/kyvernlabs-commerce &&
  git pull origin main &&
  rm -f /tmp/kyvern-build-done /tmp/kyvern-build-fail &&
  nohup bash -c "npm install --legacy-peer-deps > /tmp/kyvern-install.log 2>&1 && rm -rf .next && npm run build > /tmp/kyvern-build.log 2>&1 && touch /tmp/kyvern-build-done || touch /tmp/kyvern-build-fail" > /dev/null 2>&1 &
  disown
'

# 3. Poll /tmp/kyvern-build-done (or -fail). When done:
ssh -i ~/Documents/ssh-key3.key ubuntu@80.225.209.190 '
  pm2 restart kyvern-commerce atlas atlas-attacker &&
  curl -sS http://127.0.0.1:3001/api/atlas/status | head -c 200
'
```

**Before any deploy, run this safety check:**
```bash
ssh -i ~/Documents/ssh-key3.key ubuntu@80.225.209.190 '
  echo "disk:"; df -h / | tail -1
  echo "kyvern HEAD:"; cd ~/kyvernlabs-commerce && git log -1 --oneline
  pm2 list | grep -E "kyvern-commerce|atlas|agent-pool" | head -6
'
```

After deploy, smoke-test BOTH domains since they share the same backend now:
```bash
curl -sS -o /dev/null -w "kyvernlabs.com: %{http_code}\napp.kyvernlabs.com: %{http_code}\n" \
  https://kyvernlabs.com/ https://app.kyvernlabs.com/
```

---

## Deploy gotchas (hard-won — don't re-learn them)

1. **SSH timeout kills builds.** Use nohup + `/tmp/kyvern-build-done` marker (see above). Not optional.
2. **VM's ESLint is stricter than local with a cached `.next`.** Always `rm -rf .next && npm run build` **locally** before pushing.
3. **`@sqds/multisig@2.1.4` + `@solana/web3.js@>=1.98` crash** with "Cannot set property logs of Error which has only a getter". Fixed via `patches/@sqds+multisig+2.1.4.patch` + `postinstall: "patch-package"`. Patches BOTH `index.js` AND `index.mjs` because Next.js webpack resolves from the `module` field (→ `.mjs`).
4. **`patch-package` aborts the WHOLE patch if any hunk fails context.** If you extend the patch and a subsequent install fails, `rm -rf node_modules/@sqds/multisig && npm install` on the VM to get clean source.
5. **Server fee-payer `GZCnHuFtswvsJftSDmtoHEve8amqNLzAAPvYy8NU3ZNZ` drains over time.** If every vault.pay() fails simulation with "Attempt to debit an account but found no record of a prior credit" even though the vault USDC ATA has balance → fee payer has 0 SOL. Top up at https://faucet.solana.com (devnet; public RPC airdrop is rate-limited, VM has no `solana` CLI).
6. **`atlas.db` migrations silently skip under WAL lock.** If other processes (atlas, atlas-attacker) are writing while the web app boots, `ALTER TABLE` can be swallowed. Apply manually with a short `node -e` snippet if a column is missing.
7. **Atlas + atlas-attacker runners need `pm2 restart` after every kyvern-commerce restart.** Otherwise their fetch state stays stuck logging "fetch failed" even after the server is back.
8. **Build ENOSPC on 45 GB disk at 92% full.** If build fails with `ENOSPC`:
   ```bash
   rm -rf ~/kyvernlabs-commerce.backup-* ~/kyvernlabs-commerce/.next
   ```

---

## Tech stack (key facts, not exhaustive)

- **Frontend:** Next.js 14, Tailwind, Framer Motion, JetBrains Mono for numbers, Inter for text, white/light premium theme
- **Auth:** Privy (email / Google / wallet). `NEXT_PUBLIC_PRIVY_APP_ID` is required to render anything
- **On-chain:** `@sqds/multisig@2.1.4` (Squads v4), `@solana/web3.js@^1.98.4`, `@coral-xyz/anchor@0.31.1`
- **Anchor program:** `anchor/programs/kyvern-policy/` — 12 error codes, 4 instructions (initialize, update_allowlist, pause/resume, execute_payment). Program ID `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`
- **Database:** SQLite (`atlas.db` + `pulse.db`). WAL mode. Per-session migrations via `tryAlter` in `src/lib/atlas/db.ts`
- **SDK:** `@kyvernlabs/sdk` (`packages/sdk/`) — `Vault`, `OnChainVault`, `vault.pay()`, `vault.pause()`

---

## Routes that were retired via middleware (301 → `/`)

Don't rebuild these. `src/middleware.ts` permanently redirects: `/registry`, `/reports`, `/tools`, `/services`, `/launch`, `/provider`, `/changelog`. They were Pulse-era surfaces.

**`/pulse/*` subroutes still exist** in the codebase but aren't linked from any public nav. Legacy — safe to cut later.

---

## Open narrative gap (flagged for future work)

`/atlas` copy says *"every one of them a real failed transaction on Solana devnet."* Currently true for **allowed** payments (they settle on-chain via Squads `spendingLimitUse`). Currently **NOT** true for blocked ones — the server's off-chain pre-check refuses them in ~2ms with `txSignature: null`.

The Kyvern Anchor program at `PpmZErWf…MSqc` does enforce allowlist/velocity/memo on-chain (the Moat section on the landing uses it), but `/api/vault/pay` and `/api/atlas/probe` don't route through it — they call Squads directly.

Two paths (Shariq's call):
- **A.** Soften `/atlas` copy to match the server-pre-check reality (zero code change)
- **B.** Route `/api/atlas/probe` through the Kyvern Anchor program's `execute_payment` → every block becomes a real failed tx with program error code in Explorer logs (~1-2h work)

---

## Founder context (skim, don't need to re-read)

- **Shariq Azeem** ([@shariqshkt](https://x.com/shariqshkt)) — solo founder
- Building toward Colosseum Frontier submission (deadline May 11, 2026)
- 5 prior hackathon wins ($4,250), 3 prior x402 projects (ParallaxPay, TrendSurfer, x402-Oracle)
- Strength: shipping premium UI fast. Weakness: over-engineering, hitting too many tracks. Fix in this repo: one product, one user, one story.
- Strategic guidance lives in `/Users/macbookair/.claude/projects/-Users-macbookair-projects-myowncompany-kyvernlabs/memory/` — especially `colosseum_playbook.md` (Volki's 2x-winner red-flag list) and `kyvern_deploy_learnings.md` (the deploy land mines above in more detail).

Note: the auto-memory path above still says `kyvernlabs` because that's where it was created. It applies to **this repo** (kyvern-atlas) — all recent entries are about the Frontier build. You can read it from either repo directory.
