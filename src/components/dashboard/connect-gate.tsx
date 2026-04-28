"use client";

/**
 * ConnectGate — auth gate for /app/*, /vault/new, and the OS surface.
 *
 * Was previously a self-contained "Welcome back. One wallet opens both
 * sides..." card with an inline Continue button. That predated the
 * /login → /unbox flow and meant unauthenticated users hitting any
 * gated route saw the old single-CTA card instead of the new
 * two-card "Get a Kyvern device / I own a Kyvern device" surface.
 *
 * Now this gate is a quiet redirect to /login when unauthenticated.
 * /login is the single canonical entry point. While the redirect is
 * in flight, we render a small spinner so we don't flash content.
 *
 * Authenticated users see `children` as before — no behavior change
 * for the happy path.
 */

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

export function ConnectGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect once we know for sure the user is unauthenticated.
  // We pass the current path as ?redirect= so /login can bounce them
  // back here after Privy completes (preserves deep links).
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const target = pathname && pathname !== "/login"
        ? `/login?redirect=${encodeURIComponent(pathname)}`
        : "/login";
      router.replace(target);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // While the session cookie is resolving, OR while the redirect is
  // in flight, show a quiet spinner. Avoids a flash of the inline card.
  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{
            borderColor: "var(--border)",
            borderTopColor: "var(--text-primary)",
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
