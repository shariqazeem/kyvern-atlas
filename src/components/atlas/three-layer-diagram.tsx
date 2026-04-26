"use client";

/**
 * Three-layer diagram for /atlas.
 *
 *   [ Device ] ── [ Budget ] ── [ Workers ]
 *
 * Hand-illustrated SVG, not a flowchart. Thin white strokes at low
 * opacity, soft glow on the centre node (Budget) since that's the
 * layer that does the work. Labels in JetBrains Mono.
 *
 * The three nouns of the product, drawn as a single line — the visual
 * argument for "Device · Budget · Workers" without a paragraph of copy.
 */

import { motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function ThreeLayerDiagram() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative px-2 sm:px-6 py-10"
    >
      <div
        className="font-mono uppercase mb-6"
        style={{
          color: "rgba(255,255,255,0.42)",
          fontSize: "11px",
          letterSpacing: "0.14em",
        }}
      >
        How Atlas works
      </div>

      <div className="relative">
        <svg
          viewBox="0 0 600 140"
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Connection line behind the boxes */}
          <line
            x1="100"
            y1="70"
            x2="500"
            y2="70"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
          />

          {/* Subtle dots along the connector */}
          {[150, 200, 250, 350, 400, 450].map((x) => (
            <circle key={x} cx={x} cy={70} r="1.4" fill="rgba(255,255,255,0.28)" />
          ))}

          {/* Device box — left */}
          <g>
            <rect
              x="20"
              y="40"
              width="160"
              height="60"
              rx="10"
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,255,255,0.16)"
              strokeWidth="1"
            />
            <text
              x="100"
              y="68"
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize="11"
              fill="rgba(255,255,255,0.45)"
              letterSpacing="0.12em"
            >
              LAYER 1
            </text>
            <text
              x="100"
              y="86"
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize="14"
              fill="rgba(255,255,255,0.92)"
            >
              Device
            </text>
          </g>

          {/* Budget box — centre, glowing */}
          <g filter="url(#budgetGlow)">
            <rect
              x="220"
              y="34"
              width="160"
              height="72"
              rx="12"
              fill="rgba(134,239,172,0.06)"
              stroke="rgba(134,239,172,0.45)"
              strokeWidth="1"
            />
            <text
              x="300"
              y="64"
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize="11"
              fill="rgba(134,239,172,0.7)"
              letterSpacing="0.12em"
            >
              LAYER 2
            </text>
            <text
              x="300"
              y="84"
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize="14"
              fill="rgba(255,255,255,0.96)"
            >
              Budget
            </text>
            <text
              x="300"
              y="98"
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize="9"
              fill="rgba(134,239,172,0.55)"
              letterSpacing="0.08em"
            >
              ENFORCED ON-CHAIN
            </text>
          </g>

          {/* Workers box — right */}
          <g>
            <rect
              x="420"
              y="40"
              width="160"
              height="60"
              rx="10"
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,255,255,0.16)"
              strokeWidth="1"
            />
            <text
              x="500"
              y="68"
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize="11"
              fill="rgba(255,255,255,0.45)"
              letterSpacing="0.12em"
            >
              LAYER 3
            </text>
            <text
              x="500"
              y="86"
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize="14"
              fill="rgba(255,255,255,0.92)"
            >
              Workers
            </text>
          </g>

          {/* Glow filter for the centre Budget box */}
          <defs>
            <filter id="budgetGlow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      </div>

      <div
        className="mt-4 text-center font-mono"
        style={{
          color: "rgba(255,255,255,0.45)",
          fontSize: "11px",
          letterSpacing: "0.06em",
        }}
      >
        The device holds the money. The budget enforces the rules. The
        workers do the work.
      </div>
    </motion.section>
  );
}
