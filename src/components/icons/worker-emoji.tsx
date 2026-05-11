/**
 * WorkerEmoji — the project's emoji-to-icon bridge.
 *
 * Phase 8 polish (2026-05-08): the trio's emoji glyphs (🎯 🐋 📈) +
 * other UI emojis (🧭 🛰 ↻ 🤖) read fine in dev but feel low-fi at
 * shipping resolution. This component maps each known emoji string to
 * a Lucide icon so the same data shape (`agent.emoji = "🎯"`) renders
 * as a crisp SVG everywhere it's surfaced. Unknown emojis fall through
 * to the original glyph so legacy / custom workers don't break.
 *
 * Usage:
 *   <WorkerEmoji emoji={agent.emoji} size={20} />
 *
 * The component is render-layer only — the database column still
 * stores the emoji string. Swapping the icon set later is one map
 * edit, no migration.
 */

import {
  Activity,
  Bot,
  Cog,
  Compass,
  Crosshair,
  Fish,
  Link as LinkIcon,
  PenTool,
  Repeat,
  Satellite,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

const EMOJI_TO_ICON: Record<string, LucideIcon> = {
  // Trio
  "🎯": Crosshair, // Sentinel · bounty scout
  "🐋": Fish, // Wren · whale tracker (Lucide has no Whale; Fish reads close)
  "📈": TrendingUp, // Pulse / trader · upward chart line
  // Wizard picker (kept in sync with EMOJI_CHOICES)
  "🧭": Compass, // research / default
  "⚙️": Cog, // devtools / operations
  "⚙": Cog,
  "🔗": LinkIcon, // integrator / connector
  "✍️": PenTool, // content / writer
  "✍": PenTool,
  "🤖": Bot, // generic agent
  // Other UI emojis
  "🛰️": Satellite,
  "🛰": Satellite,
  "↻": Repeat,
  // Legacy fallback for any callsite still expecting Activity
  "💓": Activity,
};

interface Props {
  emoji: string | null | undefined;
  /** Render size in pixels (icon stroke width is auto-scaled). */
  size?: number;
  /** Override stroke width. Default: 1.8 — slightly bolder than Lucide
   *  default so small sizes (16px) still read legibly. */
  strokeWidth?: number;
  /** CSS color. Defaults to currentColor so it inherits from the
   *  parent text color. */
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Set to true if the icon is decorative (no semantic meaning). */
  ariaHidden?: boolean;
}

export function WorkerEmoji({
  emoji,
  size = 20,
  strokeWidth = 1.8,
  color,
  className,
  style,
  ariaHidden = true,
}: Props) {
  const Icon = emoji ? EMOJI_TO_ICON[emoji] : undefined;
  if (!Icon) {
    // Fallback — render the original glyph at the requested pixel size
    // so legacy workers / unknown custom emojis still display.
    return (
      <span
        className={className}
        style={{ fontSize: size, lineHeight: 1, ...style }}
        aria-hidden={ariaHidden}
      >
        {emoji ?? ""}
      </span>
    );
  }
  return (
    <Icon
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      color={color ?? "currentColor"}
      className={className}
      style={style}
      aria-hidden={ariaHidden}
    />
  );
}
