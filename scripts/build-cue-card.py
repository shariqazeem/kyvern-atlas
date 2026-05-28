#!/usr/bin/env python3
"""
build-cue-card.py — generates the rehearsal cue card for Demo Day.

Single-page landscape PDF, large type, designed for glancing.
Timing per slide, the words to actually say, button locations on /app.

Run:
  python3 scripts/build-cue-card.py

Output:
  ./demo-cue-card.pdf
"""

from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import mm

REPO = Path(__file__).resolve().parents[1]
DECKS = REPO / "decks"
DECKS.mkdir(exist_ok=True)
OUT = DECKS / "demo-cue-card.pdf"

PAGE_W, PAGE_H = landscape(A4)  # 842 x 595 pt

# colors
INK = (0.04, 0.04, 0.04)
INK_3 = (0.42, 0.42, 0.42)
INK_4 = (0.65, 0.65, 0.65)
RED = (0.86, 0.15, 0.15)
GREEN = (0.09, 0.64, 0.29)
HAIRLINE = (0.85, 0.85, 0.85)
CREAM = (0.98, 0.98, 0.98)

c = canvas.Canvas(str(OUT), pagesize=landscape(A4))


def t(x, y, txt, font="Helvetica", size=10, color=INK):
    c.setFillColorRGB(*color)
    c.setFont(font, size)
    c.drawString(x, y, txt)


def rule(x, y, w, color=HAIRLINE, thickness=0.5):
    c.setStrokeColorRGB(*color)
    c.setLineWidth(thickness)
    c.line(x, y, x + w, y)


# Fill the page with cream
c.setFillColorRGB(*CREAM)
c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

# Title bar
t(30, PAGE_H - 35, "KYVERN · DEMO DAY CUE CARD",
  font="Courier-Bold", size=11, color=INK)
t(PAGE_W - 230, PAGE_H - 35, "2026.06.02 · NICAT · ISLAMABAD",
  font="Courier", size=9, color=INK_3)
rule(30, PAGE_H - 45, PAGE_W - 60)

# Big header
t(30, PAGE_H - 75, "3:00 minutes total. Walk it like you wrote it.",
  font="Helvetica-Bold", size=18, color=INK)

rule(30, PAGE_H - 88, PAGE_W - 60)

# ── Slide rows ──────────────────────────────────────────────────────
rows = [
    # (slide#, label, time, says, action)
    ("01", "COVER",
     "0:00 → 0:08",
     "I'm Shariq. I built Kyvern. We give AI agents a wallet",
     "that can't go rogue."),
    ("02", "PROBLEM",
     "0:08 → 0:23",
     "Every AI agent that touches money today uses somebody's keys.",
     "One bad inference, one runaway loop — your wallet is empty."),
    ("03", "SOLUTION",
     "0:23 → 0:38",
     "Kyvern gives your agent a Visa with a daily cap.",
     "Budgets · allowlists · kill switch. Enforced by Solana."),
    ("04", "LIVE DEMO  →  kyvernlabs.com/app",
     "0:38 → 1:53",
     "▸  ParallaxPay  ›  click [Run prediction agent]  → 2 settled txs · click [Explorer ↗]",
     "▸  Pay.sh card  ›  click [Try $5 over-cap]  → refused · code 12002 · failed sig",
     "▸  Developer mode  ›  Live SDK events stream"),
    ("05", "HOW IT WORKS",
     "1:53 → 2:05",
     "Three pieces. vault.pay() → Kyvern checks rules → Squads moves USDC.",
     "Atomic CPI. The chain is the arbiter — not our server."),
    ("06", "LIVE + ROADMAP",
     "2:05 → 2:30",
     "39 days. 17K attempts. 6,905 blocked. $0 lost. SDK live on npm.",
     "Next: mainnet + Kyvern Shield · Later: hardware device + agent playground."),
    ("07", "ASK",
     "2:30 → 3:00",
     "Three asks from this room: builders, partners, feedback.",
     "Raising a pre-seed privately. Talk after dinner. Live at kyvernlabs.com."),
]

y = PAGE_H - 105
for row in rows:
    num, label = row[0], row[1]
    time_str = row[2]
    sentences = row[3:]
    # Slide num + label
    t(30, y, num, font="Courier-Bold", size=14, color=INK)
    t(60, y, label, font="Helvetica-Bold", size=12, color=INK)
    # Time
    t(PAGE_W - 145, y, time_str, font="Courier-Bold", size=10, color=RED if num == "04" else INK_3)
    # Sentences underneath
    for i, s in enumerate(sentences):
        t(80, y - 15 - i * 12, s, font="Helvetica", size=9.5,
          color=INK if i == 0 else INK_3)
    # Spacing — bigger gap for demo slide which has 3 lines
    gap = 60 if num == "04" else 45
    y -= gap
    rule(30, y + 8, PAGE_W - 60)

# Bottom strip — emergency notes
y = 78
t(30, y, "IF WIFI FLAKES",
  font="Courier-Bold", size=10, color=RED)
t(30, y - 14, '"Let me show you the same thing pre-recorded."  →  switch to backup tab  →  play kyvern-backup-demo.mp4',
  font="Helvetica", size=9.5, color=INK)
t(30, y - 28, "No apology. Confidence.",
  font="Helvetica-Oblique", size=9.5, color=INK_3)

t(PAGE_W - 360, y, "BEFORE YOU TAKE THE STAGE",
  font="Courier-Bold", size=10, color=GREEN)
checklist = [
    "✓  Top up Atlas + demo vault (≥ $5 USDC each)",
    "✓  3 browser tabs open: /app · /app/developer · backup.mp4",
    "✓  Wifi connected · screen brightness max · do-not-disturb on",
]
for i, item in enumerate(checklist):
    t(PAGE_W - 360, y - 14 - i * 12, item, font="Helvetica", size=9, color=INK_3)

# Footer
t(30, 22, "kyvernlabs.com  ·  @shariqshkt",
  font="Courier", size=8, color=INK_4)
t(PAGE_W - 130, 22, "you've got this.",
  font="Helvetica-Oblique", size=10, color=INK_3)

c.save()
print(f"✓  Cue card written: {OUT}")
print(f"   {OUT.stat().st_size // 1024} KB")
