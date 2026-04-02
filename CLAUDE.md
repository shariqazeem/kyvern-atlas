# KyvernLabs — The Infrastructure Company for the x402 Economy

## WHAT IS THIS

KyvernLabs is building the business infrastructure layer for x402 — the internet-native payment protocol for AI agents. Think "Shopify for x402."

x402 lets agents pay each other via HTTP. $10M+ volume, 35M+ transactions, backed by Coinbase, Google, Cloudflare, Visa. 90+ services exist. But NOBODY has built the business layer — analytics, management, routing, marketplace.

KyvernLabs fills that gap. Multiple products, one platform.

---

## PRODUCT 1: PULSE (kyvernlabs.com/pulse)

**"The Stripe Dashboard for x402"**

Real-time revenue intelligence for x402 service providers.

### What it does
- One-line middleware integration for any x402 endpoint
- Revenue dashboard: calls, revenue, customers, trends
- Pricing intelligence: benchmark against competitors
- Customer analytics: who's paying, how much, how often
- Alerts: revenue spikes/drops, new customers, anomalies

### Who it's for
- The 90+ existing x402 service providers who are flying blind
- Any developer launching an x402 API

### Revenue model
- Free tier: basic dashboard (hooks people in)
- Pro $49/mo: full analytics, alerts, pricing tools
- Enterprise: % of managed volume

### Why nobody built this yet
Everyone's building x402 SERVICES (endpoints that sell data). Nobody's building the BUSINESS LAYER that makes those services profitable.

---

## PRODUCT ROADMAP

1. **Pulse** (NOW) — Revenue analytics for x402 sellers
2. **Vault** (6mo) — Smart contract wallets with per-agent budgets
3. **Router** (12mo) — Smart routing to cheapest/fastest x402 service
4. **Marketplace** (18mo) — Launch x402 APIs in minutes, full platform

---

## ELSA FELLOWSHIP

Applying to the $1M Agentic Fellowship (Elsa) with Pulse as the product.
- Requirements: use x402 APIs, ERC-8004, or Elsa LLM Gateway
- Pulse uses x402 directly — perfect fit
- Application: https://tally.so/r/PdEG21

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion |
| Theme | **WHITE/LIGHT premium** — always. Billion-dollar fintech feel. |
| Fonts | Inter (text), JetBrains Mono (numbers/code) |
| Backend | Next.js API routes or Express |
| Database | SQLite (better-sqlite3) or Turso |
| x402 | Middleware that intercepts x402 payments and logs analytics |
| Deployment | Oracle Cloud VM (ubuntu@141.148.215.239) + Vercel for frontend |
| Auth | TBD (wallet-based or simple API key) |

---

## DESIGN PRINCIPLES

- **White/light premium theme** — non-negotiable. Think Linear, Stripe, Vercel.
- **Smooth animations** — cubic-bezier(0.25, 0.1, 0.25, 1) everywhere
- **No garish gradients** — subtle dot grids, glass morphism, premium shadows
- **Typography that breathes** — large, well-spaced, confident
- **Mobile responsive** — always
- **Show real data** — not mock. Real x402 transactions.

---

## BRAND

- **Company:** KyvernLabs (kyvernlabs.com)
- **Tagline:** "The infrastructure company for the x402 economy"
- **Product 1:** Pulse (kyvernlabs.com/pulse)
- **Founder:** Shariq Azeem (@shariqshkt)

---

## BUILD SPEC — MVP (what to build first)

### Phase 1: KyvernLabs Hub (kyvernlabs.com)

**Pages:**
- `/` — Landing page. Hero: "The infrastructure company for the x402 economy." Explain the vision, show Pulse as the first product, link to Pulse dashboard. Premium, cinematic, light theme. Sections: Hero → Problem → Solution → Products (Pulse highlighted, Vault/Router/Marketplace coming soon) → For Developers → Footer
- `/pulse` — Redirects to Pulse dashboard (or Pulse landing if not logged in)

### Phase 2: Pulse Dashboard (kyvernlabs.com/pulse)

**The actual product. This is what we demo to Elsa Fellowship.**

**Pages:**
- `/pulse` — Pulse landing page. "Real-time revenue intelligence for x402." Hero with live demo preview, features, pricing tiers, "Get Started" CTA.
- `/pulse/dashboard` — The main dashboard (requires API key or wallet connection)
  - **Overview:** Total revenue (24h/7d/30d), total calls, unique customers, avg price per call, revenue chart (line graph over time)
  - **Endpoints:** List of your x402 endpoints with per-endpoint stats (calls, revenue, avg response time)
  - **Customers:** Top paying agent addresses, frequency, total spent
  - **Pricing:** Current price vs competitor benchmark, A/B test setup
  - **Alerts:** Revenue drop, spike, new high-value customer
- `/pulse/setup` — Integration guide. Show the one-line middleware code. Copy-paste ready.

**The Middleware (npm package: @kyvernlabs/pulse):**
```
npm install @kyvernlabs/pulse
```
```typescript
import { withPulse } from '@kyvernlabs/pulse'
// Wrap your x402 endpoint — that's it
export default withPulse(handler, { apiKey: 'kv_...' })
```
This intercepts every x402 payment, logs: timestamp, amount, payer address, endpoint, response time, status. Sends to Pulse API for dashboard display.

**API Routes needed:**
- `POST /api/pulse/ingest` — receives analytics events from middleware
- `GET /api/pulse/stats` — returns aggregated stats for dashboard
- `GET /api/pulse/endpoints` — per-endpoint breakdown
- `GET /api/pulse/customers` — customer analytics
- `GET /api/pulse/timeseries` — revenue over time data

**Database tables:**
- `events` — raw x402 payment events (timestamp, amount, payer, endpoint, latency, status)
- `endpoints` — registered endpoints with metadata
- `api_keys` — user API keys for the middleware
- `daily_stats` — pre-aggregated daily summaries for fast dashboard loads

### Phase 3: Marketing & Launch
- Apply to Elsa Fellowship with Pulse
- Post on X: "Building the Stripe Dashboard for x402" build-in-public thread
- Get 5-10 x402 service providers to try the middleware
- Submit to ETHGlobal Open Agents (April 24) if timing works

---

## FOUNDER CONTEXT

- 5 hackathon wins ($4,250 total), building toward first big win / real company
- Built 3 x402 projects: ParallaxPay ($1,500 win), TrendSurfer, x402-Oracle
- Deep x402 expertise — one of very few builders with this depth
- Strengths: Next.js, Tailwind, Framer Motion, fast shipping, premium UI
- Weakness pattern: over-engineering, hitting too many tracks at once
- Fix: ONE product, ONE problem, done extremely well
