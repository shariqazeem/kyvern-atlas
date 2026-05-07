"use client";

/**
 * PageHeader — generic per-surface header used on all /app sub-pages.
 *
 * One full-width line, hairline border bottom, h-14. Identity-strip
 * typography for visual continuity across the device shell.
 *
 * Layout:
 *
 *   ←  KVN-XXXXXXXX  ·  Solana devnet  ·  Up Xh Ym       PAGE CTX
 *
 * - Optional back-link (renders the left chevron + label).
 * - `left` slot: identity / breadcrumb on the left.
 * - `right` slot: per-page context — "FINDINGS · 7 unread" / "SETTINGS" / etc.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  back?: { href: string; label: string };
  left: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function PageHeader({ back, left, right, className }: PageHeaderProps) {
  return (
    <header
      className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 h-14 flex-shrink-0 ${className ?? ""}`}
      style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}
    >
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] hover:opacity-70 transition flex-shrink-0"
          style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={2} />
          {back.label}
        </Link>
      )}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {left}
      </div>
      {right && (
        <div className="flex items-center gap-2 flex-shrink-0">{right}</div>
      )}
    </header>
  );
}
