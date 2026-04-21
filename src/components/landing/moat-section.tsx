"use client";

/* ════════════════════════════════════════════════════════════════════
   MoatSection — the emotional beat.

   Apple pages have exactly one moment where the product lands in the
   reader's chest. For Kyvern, that's the failed Solana transaction
   with our program's error code in the logs.

   How this section feels when you scroll to it:
     · Big quiet statement ("This is what 'on-chain' feels like")
     · A rendered Solana Explorer card animates into place
     · The status "Failed" and the program log line pulse in
     · Below: a single clickable tx link to the real blocked tx
     · Below: a one-line synthesis ("we didn't make this up")

   No marketing copy. No feature list. Just proof.
   ════════════════════════════════════════════════════════════════════ */

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ExternalLink, X } from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as const;

// The real blocked transaction from our devnet run — pinned in
// SUBMISSION.md. This is the shot.
const BLOCKED_TX =
  "3KgiZm4ychChRKQGz3YaUgquyRKk7jrTpjPYvaPGSdxps18eLLMHvFR3NADayaLmxPnCZKhC4XTw6DUTRX9Byk1b";
const BLOCKED_EXPLORER = `https://explorer.solana.com/tx/${BLOCKED_TX}?cluster=devnet`;

export function MoatSection() {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Parallax the Explorer card subtly as it enters/leaves
  const cardY = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const cardScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.97, 1, 0.98]);

  return (
    <section
      ref={ref}
      // Reduced vertical padding — the previous `py-32 md:py-44` left an
      // awkward empty stretch below the Explorer card before the next
      // section scrolled into view. 24/32 keeps the cinematic breathing
      // without the "did the page break?" moment.
      className="relative py-24 md:py-32 overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* Background grid — quietly present, masked so only the center shows */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-dot-grid opacity-40"
        style={{
          maskImage:
            "radial-gradient(ellipse 50% 50% at 50% 50%, black 20%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 50% 50% at 50% 50%, black 20%, transparent 80%)",
        }}
      />

      <div className="mx-auto max-w-5xl px-6">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-6"
        >
          <span
            className="inline-block text-[11.5px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--text-quaternary)" }}
          >
            When an agent tries something it shouldn&rsquo;t
          </span>
        </motion.div>

        {/* Statement — huge, quiet, centered */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease }}
          className="text-center text-balance mx-auto max-w-[920px] mb-16 md:mb-20"
          style={{
            fontSize: "clamp(40px, 6.5vw, 76px)",
            lineHeight: 1.02,
            letterSpacing: "-0.04em",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          A blocked payment{" "}
          <span
            style={{ fontWeight: 700, color: "var(--text-primary)" }}
          >
            isn&apos;t a 402.
          </span>
          <br />
          It&apos;s a failed Solana transaction.
        </motion.h2>

        {/* Explorer card — the hero visual */}
        <motion.div
          style={{ y: cardY, scale: cardScale }}
          className="relative mx-auto max-w-[780px]"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.1, ease, delay: 0.15 }}
            className="relative rounded-[22px] overflow-hidden"
            style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.04), 0 24px 64px -24px rgba(0,0,0,0.20), 0 40px 120px -60px rgba(239,68,68,0.12)",
            }}
          >
            {/* Browser chrome */}
            <div
              className="flex items-center gap-2 px-5 py-3 border-b"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-black/[0.06]" />
                <div className="w-2.5 h-2.5 rounded-full bg-black/[0.06]" />
                <div className="w-2.5 h-2.5 rounded-full bg-black/[0.06]" />
              </div>
              <div
                className="ml-3 flex-1 h-6 rounded-[7px] flex items-center px-3 text-[11px] font-mono-numbers truncate"
                style={{
                  background: "var(--surface)",
                  border: "0.5px solid var(--border-subtle)",
                  color: "var(--text-tertiary)",
                }}
              >
                explorer.solana.com/tx/3KgiZm4y…yk1b?cluster=devnet
              </div>
            </div>

            {/* Body — Solana Explorer-style tx summary */}
            <div className="px-6 py-7 md:px-9 md:py-9">
              {/* Status pill */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.6, ease }}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11.5px] font-semibold mb-6"
                style={{
                  background: "#FEF2F2",
                  color: "#B91C1C",
                  border: "0.5px solid rgba(185,28,28,0.20)",
                }}
              >
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full"
                  style={{ background: "#B91C1C", color: "white" }}
                >
                  <X className="w-2.5 h-2.5" strokeWidth={3} />
                </span>
                Failed on-chain
              </motion.div>

              {/* Two-column facts */}
              <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-y-3 md:gap-y-4 text-[13.5px]">
                <Fact label="Signature">
                  <span
                    className="font-mono truncate block"
                    style={{ color: "var(--text-primary)" }}
                  >
                    3KgiZm4ychChRKQGz3YaUgquyRKk7jrTpjPYvaPGSdxps18e…yk1b
                  </span>
                </Fact>

                <Fact label="Result">
                  <span style={{ color: "#B91C1C", fontWeight: 600 }}>
                    Err · Custom(12003)
                  </span>
                </Fact>

                <Fact label="Program">
                  <span
                    className="font-mono"
                    style={{ color: "var(--text-primary)" }}
                  >
                    PpmZErWfT5zpeo1f…WViaMSqc
                  </span>{" "}
                  <span
                    className="ml-1 text-[11.5px] px-1.5 py-0 rounded-[5px] font-semibold uppercase tracking-wider"
                    style={{
                      background: "#EEF0FF",
                      color: "#4F46E5",
                    }}
                  >
                    kyvern_policy
                  </span>
                </Fact>

                <Fact label="Invoked">
                  <span style={{ color: "var(--text-secondary)" }}>
                    execute_payment (CPI → Squads v4)
                  </span>
                </Fact>
              </div>

              {/* The program log — the money shot */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-120px" }}
                transition={{ duration: 0.6, delay: 0.9, ease }}
                className="mt-8 rounded-[14px] p-5 font-mono-numbers text-[12.5px] leading-[1.7] overflow-x-auto"
                style={{
                  background: "#0B0B0F",
                  border: "0.5px solid rgba(255,255,255,0.06)",
                  color: "#E4E4E7",
                }}
              >
                <span style={{ color: "#6E7681" }}>Program log:</span>{" "}
                <span style={{ color: "#E4E4E7" }}>
                  AnchorError thrown in
                </span>{" "}
                <span style={{ color: "#6E7681" }}>
                  programs/kyvern-policy/src/lib.rs:180
                </span>
                {"\n"}
                <span style={{ color: "#6E7681" }}>Program log:</span>{" "}
                <span style={{ color: "#E4E4E7" }}>Error Code:</span>{" "}
                <span style={{ color: "#F97583", fontWeight: 700 }}>
                  MerchantNotAllowlisted
                </span>
                {"\n"}
                <span style={{ color: "#6E7681" }}>Program log:</span>{" "}
                <span style={{ color: "#E4E4E7" }}>Error Number:</span>{" "}
                <span style={{ color: "#79B8FF" }}>12003</span>
                {"\n"}
                <span style={{ color: "#6E7681" }}>Program log:</span>{" "}
                <span style={{ color: "#E4E4E7" }}>Error Message:</span>{" "}
                <span style={{ color: "#E4E4E7" }}>
                  Merchant hash is not on this vault&apos;s allowlist.
                </span>
                {"\n\n"}
                <span style={{ color: "#6E7681" }}>
                  # whole tx reverts. no USDC moves. no off-chain trust.
                </span>
              </motion.div>

              {/* Clickable link to the real tx */}
              <motion.a
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-120px" }}
                transition={{ duration: 0.5, delay: 1.2 }}
                href={BLOCKED_EXPLORER}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-6 inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors"
                style={{ color: "var(--text-primary)" }}
              >
                Open this exact transaction on Solana Explorer
                <ExternalLink className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </motion.a>
            </div>
          </motion.div>
        </motion.div>

        {/* Synthesis — one quiet line under the card */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.4, ease }}
          className="mx-auto max-w-[560px] text-center text-[15px] leading-[1.6] mt-12"
          style={{ color: "var(--text-tertiary)" }}
        >
          Click it. Read the logs. That&apos;s Solana consensus saying no — not
          our server, not our API, not our promise. We did not make this up.
        </motion.p>
      </div>
    </section>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className="text-[10.5px] font-semibold uppercase tracking-[0.08em] pt-[2px]"
        style={{ color: "var(--text-quaternary)" }}
      >
        {label}
      </div>
      <div className="min-w-0">{children}</div>
    </>
  );
}
