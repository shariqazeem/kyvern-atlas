# Deployment handoff — Kyvern Vault

Everything I couldn't do from Claude's sandbox (needs your SSH keys / domains / secrets). Each section ≤ 5 minutes.

---

## 1. Vercel deploy (recommended — easier than Oracle VM)

Since Kyvern Vault is a Next.js 14 app with no custom server requirements beyond better-sqlite3, Vercel is the fastest path. The one thing that breaks on Vercel is the SQLite DB — Vercel's filesystem is read-only. Fix: switch from local file to Turso (libsql-compatible, has a free tier).

### Step 1 — one-time Turso setup

```bash
# install CLI
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login

# create a db
turso db create kyvern-prod
turso db tokens create kyvern-prod
turso db show kyvern-prod --url
```

Save the printed URL and token.

### Step 2 — Vercel env vars

In the Vercel project settings → Environment Variables, add:

| Name | Value |
|---|---|
| `TURSO_URL` | from `turso db show` |
| `TURSO_TOKEN` | from `turso db tokens create` |
| `KYVERN_FEE_PAYER_SECRET` | base58 secret for a devnet signer with ~5 SOL |
| `KYVERN_SOLANA_RPC_URL` | `https://api.devnet.solana.com` (or Helius/QuickNode URL) |
| `KYVERN_SQUADS_MODE` | `real` (default — leave unset in prod) |
| `PRIVY_APP_ID` | from privy.io dashboard (optional — dev fallback works without) |
| `PRIVY_APP_SECRET` | from privy.io dashboard |

### Step 3 — swap better-sqlite3 for libsql on Vercel

The code path is already isolated to `src/lib/db.ts`. On Vercel, `better-sqlite3` native bindings fail to build. Two paths:

- **A. Keep better-sqlite3 locally, use Turso only on Vercel.** Wrap the DB init in a runtime branch:
  ```ts
  // in src/lib/db.ts
  export const db = process.env.TURSO_URL
    ? createTursoAdapter(process.env.TURSO_URL, process.env.TURSO_TOKEN!)
    : createLocalSqlite();
  ```
  Turso's `@libsql/client` has an almost-identical API to better-sqlite3; 50 lines of adapter code.

- **B. Simpler: Deploy to Oracle VM instead.** The existing `better-sqlite3` just works there. See section 2.

If you're shipping to submit the hackathon *tonight*, pick B. If you want kyvernlabs.com live long-term, pick A — we can wire the adapter next session.

### Step 4 — deploy

```bash
vercel link
vercel env pull  # sanity-check local pulls match dashboard
vercel --prod
```

Point `kyvernlabs.com` at the Vercel deployment via DNS CNAME → `cname.vercel-dns.com` in your DNS provider.

---

## 2. Oracle VM deploy (the path your memory has pre-configured)

Your memory file says: `ssh -i ~/Documents/ssh-key3.key ubuntu@80.225.209.190, ~/kyvernlabs, pm2 restart kyvernlabs, --legacy-peer-deps required`.

```bash
ssh -i ~/Documents/ssh-key3.key ubuntu@80.225.209.190
cd ~/kyvernlabs
git pull origin main
npm install --legacy-peer-deps
npm run build
pm2 restart kyvernlabs
pm2 save
pm2 logs kyvernlabs --lines 50  # watch for errors
```

Nginx should already be proxying `kyvernlabs.com` to localhost:3000. If not, standard Nginx reverse-proxy config:

```nginx
server {
  listen 443 ssl;
  server_name kyvernlabs.com;
  # your SSL bits here (certbot, cloudflare, whatever)

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### Environment variables on the VM

On Oracle VM, env vars typically live in `~/.config/systemd/user/kyvernlabs.env` or in a `pm2 ecosystem.config.js` file. Double-check:

```bash
pm2 env 0   # prints env vars for first process
```

Must have at minimum: `KYVERN_SOLANA_RPC_URL`, `KYVERN_FEE_PAYER_SECRET`, `PRIVY_APP_ID`, `PRIVY_APP_SECRET`.

### Fund the VM's Kyvern signer

The VM needs its own devnet signer with ~5 SOL to pay fees for vaults created via the web UI. If you don't want to copy `C2rBv9mw…qZCh` over (preferable not to, key hygiene), generate a new one:

```bash
# on the VM
mkdir -p ~/.kyvern
solana-keygen new --outfile ~/.kyvern/server-signer.json
# or paste KYVERN_FEE_PAYER_SECRET via env var instead
```

Fund via https://faucet.solana.com.

---

## 3. Publishing `@kyvernlabs/sdk` + `create-kyvern-agent` to npm

The SDK is currently at v0.4.0 locally. Publishing the updated version:

```bash
cd packages/sdk
npm publish --access public
```

Then the scaffolder:

```bash
cd packages/create-kyvern-agent
npm publish --access public
```

If `npm whoami` errors, `npm login` first. The KyvernLabs org should already exist on npm from the earlier `@kyvernlabs/pulse` publish.

### Sanity test the shipped scaffolder

From a fresh directory (not the monorepo):

```bash
cd /tmp
npx create-kyvern-agent test-agent@0.1.0
cd test-agent
cat package.json | grep name   # should show "test-agent"
```

---

## 4. SUBMISSION.md — final edits before you submit

Open SUBMISSION.md one last time before pasting to the hackathon form:

1. **Live demo URL** — replace `kyvernlabs.com/vault` with your actual live URL (might be `kyvern-vault.vercel.app` initially if DNS isn't ready)
2. **Video URL** — insert the MP4 link (YouTube unlisted, Loom, or a Vercel-hosted direct link)
3. **Twitter handle for tagging** — ensure `@shariqshkt` is correct
4. **Date of on-chain proof table** — update the "produced on" line to match the most recent `demo-e2e.ts` run

The proof table can be regenerated anytime: `cd anchor && npx tsx scripts/demo-e2e.ts` → copy the PROOF section → replace table in SUBMISSION.md.

---

## 5. The 90-second video

Script is in SUBMISSION.md § *Video script*. Recording tips:

- **Use a clean browser profile** with just two tabs: Solana Explorer + localhost:3000
- **Start on the failed-tx Explorer page** — zoom in on `Error Code: MerchantNotAllowlisted` for the first 3 seconds. That's the moat shot.
- **Don't live-run devnet during the recording.** The demo-e2e.ts outputs are already saved in SUBMISSION.md; just click the Explorer links. A live run risks RPC flakes mid-video.
- **Record with OBS** (1080p, 30fps). Or use macOS's built-in screen recording (Cmd+Shift+5) if simpler.
- **No music.** Voiceover or captions only. Judges watch on mute 80% of the time.
- **Export as MP4**, upload to YouTube unlisted. Paste the URL into the submission form.

---

## 6. Submission tweet

`LAUNCH.md` has a 7-tweet thread + 3 single-tweet variants. Go with the thread.

Timing: post 30-60 minutes after submission-form submission so the form has indexed + your Explorer links are warm.

---

## Troubleshooting

**`pm2 restart` gets stuck** → `pm2 kill && pm2 start ecosystem.config.js`.

**Build OOM on the VM** → Oracle free-tier has 1GB RAM. Add swap: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab`.

**Privy redirect URL mismatch** → Privy dashboard → App → "Allowed callback URLs" must include your prod domain.

**Vercel `better-sqlite3` build fails** → This is expected. Either use Vercel + Turso (section 1) or Oracle (section 2). Don't try to make better-sqlite3 work on Vercel.

**Solana RPC rate-limited in prod** → Switch `KYVERN_SOLANA_RPC_URL` to a Helius or QuickNode URL. Public RPC is fine for devnet demo but you'll hit 429s under real traffic.
