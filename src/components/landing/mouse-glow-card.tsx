"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { MouseEvent, ReactNode } from "react";

export function MouseGlowCard({
  children,
  className = "",
  style = {},
  glowColor = "rgba(15, 23, 42, 0.04)",
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glowColor?: string;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-[16px] ${className}`}
      onMouseMove={handleMouseMove}
      style={{
        ...style,
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[16px] opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              ${glowColor},
              transparent 80%
            )
          `,
        }}
      />
      {/* Content wrapper to stay above the glow */}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
