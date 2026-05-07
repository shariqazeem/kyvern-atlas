"use client";

/**
 * PageShell — generic device-shell wrapper for /app sub-pages.
 *
 * The same architectural rhyme as the /app device shell:
 *
 *   ┌────────────────────────────────────────────────────────────┐
 *   │ HEADER                                                     │
 *   ├──────────────────────────────────────┬─────────────────────┤
 *   │ PRIMARY ZONE (left, ~60% on desktop) │ SECONDARY ZONE      │
 *   │                                      │ (right, ~40%)       │
 *   ├──────────────────────────────────────┴─────────────────────┤
 *   │ BOTTOM STRIP (optional, h-12)                               │
 *   └────────────────────────────────────────────────────────────┘
 *
 * Tab bar mounts at the OS level (KyvernOS) so PageShell does NOT
 * render it. Container leaves room (88px) below for the bottom nav.
 *
 * `gridCols` defaults to `lg:grid-cols-[minmax(0,1fr)_380px]` —
 * matches the /app shell grid. Pass an override only when a surface
 * needs different ratios (e.g. inbox uses `lg:grid-cols-[360px_1fr]`).
 */

interface PageShellProps {
  header: React.ReactNode;
  primaryZone: React.ReactNode;
  secondaryZone?: React.ReactNode;
  bottomStrip?: React.ReactNode;
  gridCols?: string;
  className?: string;
}

export function PageShell({
  header,
  primaryZone,
  secondaryZone,
  bottomStrip,
  gridCols,
  className,
}: PageShellProps) {
  const gridClass =
    gridCols ?? "lg:grid-cols-[minmax(0,1fr)_380px]";
  return (
    <div
      className={`device-shell flex flex-col mx-auto w-full ${className ?? ""}`}
      style={{
        maxWidth: 1440,
        minHeight:
          "calc(100dvh - 88px)" /* TabBar height + safe-area padding */,
      }}
    >
      {header}
      <main
        className={`flex-1 min-h-0 grid gap-4 sm:gap-6 p-4 sm:p-6 ${
          secondaryZone ? `grid-cols-1 ${gridClass}` : "grid-cols-1"
        }`}
      >
        <section className="min-h-0 flex flex-col gap-3 sm:gap-4">
          {primaryZone}
        </section>
        {secondaryZone && (
          <aside className="min-h-0 flex flex-col gap-3 sm:gap-4 lg:overflow-y-auto pr-1">
            {secondaryZone}
          </aside>
        )}
      </main>
      {bottomStrip && (
        <div
          className="flex-shrink-0"
          style={{ borderTop: "1px solid rgba(15,23,42,0.05)" }}
        >
          {bottomStrip}
        </div>
      )}
    </div>
  );
}
