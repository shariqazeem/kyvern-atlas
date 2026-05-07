"use client";

/**
 * DevicePanel — the shared shell for every contextual surface that opens
 * over the /app device home (Open-a-bay · Use the device · Builder · the
 * worker detail panel).
 *
 *   • Mobile (<768px): bottom sheet, drag-to-close, max-h 85vh.
 *   • Desktop (≥768px): right-side drawer, fixed 480px, full height.
 *
 * Behaviors baked in:
 *   • Backdrop fade (200ms ease-out) + tap-to-close
 *   • Esc-to-close
 *   • Body scroll lock while open
 *   • Focus management — focus first interactive on open, restore prior
 *     focus on close
 *   • Spring physics for sheet/drawer entry (stiffness 280, damping 30)
 *   • Drag-down past 120px (or fast flick) closes on mobile
 *
 * Z-index discipline: backdrop z-40, panel z-50.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const SPRING = { type: "spring" as const, stiffness: 280, damping: 30 };

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const fn = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return isDesktop;
}

interface DevicePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function DevicePanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: DevicePanelProps) {
  const isDesktop = useIsDesktop();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Esc-to-close + focus management
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement) ?? null;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    // Move focus to the first interactive child after the panel mounts
    const focusTimer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      target?.focus();
    }, 120);
    return () => {
      window.removeEventListener("keydown", handler);
      window.clearTimeout(focusTimer);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  // Body-scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const sheetMotion = isDesktop
    ? {
        initial: { x: "100%" },
        animate: { x: 0 },
        exit: { x: "100%" },
      }
    : {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
      };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 z-40 backdrop-blur-sm"
            style={{ background: "rgba(15,23,42,0.40)" }}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="device-panel-title"
            {...sheetMotion}
            transition={SPRING}
            drag={isDesktop ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (
                !isDesktop &&
                (info.offset.y > 120 || info.velocity.y > 600)
              ) {
                onClose();
              }
            }}
            className={
              isDesktop
                ? "fixed top-0 right-0 bottom-0 w-[480px] max-w-[90vw] z-50 bg-white flex flex-col"
                : "fixed left-0 right-0 bottom-0 z-50 bg-white flex flex-col"
            }
            style={{
              maxHeight: isDesktop ? "100vh" : "85vh",
              borderTopLeftRadius: isDesktop ? 0 : 24,
              borderTopRightRadius: isDesktop ? 0 : 24,
              boxShadow: isDesktop
                ? "-16px 0 48px -16px rgba(15,23,42,0.18)"
                : "0 -16px 48px -16px rgba(15,23,42,0.18)",
              borderLeft: isDesktop
                ? "1px solid rgba(15,23,42,0.06)"
                : undefined,
            }}
          >
            {/* Mobile drag handle */}
            {!isDesktop && (
              <div
                className="flex justify-center pt-2 pb-1 flex-shrink-0"
                aria-hidden
              >
                <span
                  style={{
                    width: 40,
                    height: 4,
                    background: "rgba(15,23,42,0.16)",
                    borderRadius: 9999,
                  }}
                />
              </div>
            )}

            {/* Header */}
            <div
              className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-3 sm:pt-5 pb-3 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}
            >
              <div className="min-w-0">
                <h2
                  id="device-panel-title"
                  className="text-base font-semibold tracking-tight"
                  style={{ color: "#0A0A0A" }}
                >
                  {title}
                </h2>
                {subtitle && (
                  <p
                    className="text-sm mt-0.5"
                    style={{ color: "#6B7280" }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                type="button"
                className="rounded-full p-1.5 hover:bg-black/5 transition flex-shrink-0"
                aria-label="Close panel"
              >
                <X
                  className="w-4 h-4"
                  strokeWidth={1.8}
                  style={{ color: "rgba(15,23,42,0.55)" }}
                />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div
                className="px-5 sm:px-6 py-3 flex-shrink-0"
                style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
