"use client";

/**
 * Manifesto block at the top of /atlas.
 *
 * "Agents shouldn't have keys. They should have budgets."
 * JetBrains Mono, white, with a subtle text-shadow for depth so it
 * doesn't read flat against the dark surface. Mobile shrinks the
 * size; the underline (a thin gradient line) compresses with it.
 */

import { motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function ManifestoBlock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="mb-12"
    >
      <h1
        className="font-mono leading-[1.15] tracking-tight"
        style={{
          color: "rgba(255,255,255,0.96)",
          fontSize: "clamp(22px, 4.6vw, 36px)",
          textShadow: "0 1px 0 rgba(255,255,255,0.04)",
          fontWeight: 500,
        }}
      >
        Agents shouldn&apos;t have keys.
        <br />
        They should have{" "}
        <span style={{ color: "#86EFAC" }}>budgets</span>.
      </h1>
      <div
        className="mt-4 h-[1px] max-w-[420px]"
        style={{
          background:
            "linear-gradient(to right, rgba(134,239,172,0.55), rgba(134,239,172,0))",
        }}
      />
    </motion.div>
  );
}
