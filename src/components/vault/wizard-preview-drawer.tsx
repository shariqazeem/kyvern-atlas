"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * <WizardPreviewDrawer/> — responsive preview wrapper.
 *
 * Problem: each wizard step has a live preview (nameplate / budget
 * simulation / policy wall). On desktop they sit as a right-hand
 * sidebar — great. On mobile they stacked BELOW the form, which meant
 * the user had to scroll past the form to see what they were building,
 * then scroll back up to keep editing. That loses the "designing a
 * character" feel the previews were built to create.
 *
 * Fix: on mobile only, render the preview inside a bottom-sheet
 * drawer with a floating "Preview" button in the corner. Desktop
 * still gets the inline right-column layout.
 *
 * Usage:
 *   <div className="grid md:grid-cols-[1fr_280px] gap-8">
 *     <div>... form ...</div>
 *     <WizardPreviewDrawer label="Agent nameplate">
 *       <LiveNameplate config={config} />
 *     </WizardPreviewDrawer>
 *   </div>
 *
 * On md+, the drawer component renders its children as an `<aside>`
 * in the second grid column. On <md, it collapses the aside (display:
 * none) and renders a `<button>` fixed to the bottom-right that opens
 * a slide-up sheet containing the same children.
 *
 * Accessibility:
 *   · Sheet is a proper dialog (role + aria-labelledby)
 *   · Escape closes
 *   · Backdrop-click closes
 *   · Body scroll locks while open
 * ════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, X } from "lucide-react";
import { EASE_PREMIUM as EASE } from "@/lib/motion";

export interface WizardPreviewDrawerProps {
  /** Short label shown on the floating mobile button. */
  label?: string;
  /** The preview content — rendered inline on desktop, in the sheet on mobile. */
  children: React.ReactNode;
}

export function WizardPreviewDrawer({
  label = "Preview",
  children,
}: WizardPreviewDrawerProps) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while sheet is open so the user can flick through
  // the preview without accidentally scrolling the form behind it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Desktop — inline right column. Hidden on mobile. */}
      <div className="hidden md:block">{children}</div>

      {/* Mobile floating button — only shows <md.
          Fixed to bottom-center above the FlowShell footer. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open ${label.toLowerCase()}`}
        aria-expanded={open}
        className="md:hidden fixed z-40 inline-flex items-center gap-2 h-10 px-4 rounded-full text-[12px] font-semibold transition-all active:scale-95"
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          // Sits comfortably above FlowShell's footer (footer is ~80px tall).
          bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          background: "var(--text-primary)",
          color: "var(--background)",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.06), 0 12px 32px -10px rgba(0,0,0,0.28)",
        }}
      >
        <Eye className="w-3.5 h-3.5" />
        {label}
      </button>

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="wpd-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={() => setOpen(false)}
              className="md:hidden fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.35)" }}
            />
            {/* Sheet */}
            <motion.div
              key="wpd-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease: EASE }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="wpd-title"
              className="md:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-[22px]"
              style={{
                background: "var(--surface)",
                borderTop: "0.5px solid var(--border-subtle)",
                boxShadow: "0 -16px 48px -12px rgba(0,0,0,0.24)",
                maxHeight: "85vh",
                overflowY: "auto",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }}
            >
              {/* Drag handle + header */}
              <div
                className="sticky top-0 flex items-center justify-between px-5 pt-3 pb-3"
                style={{
                  background: "var(--surface)",
                  borderBottom: "0.5px solid var(--border-subtle)",
                }}
              >
                <div className="flex-1 flex justify-center">
                  <span
                    className="w-10 h-1 rounded-full"
                    style={{ background: "var(--border)" }}
                  />
                </div>
              </div>
              <div
                className="flex items-center justify-between px-5 py-2.5"
                style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
              >
                <h2
                  id="wpd-title"
                  className="text-[13px] font-semibold tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {label}
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close preview"
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-5">{children}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
