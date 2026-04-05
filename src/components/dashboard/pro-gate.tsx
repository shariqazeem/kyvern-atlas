"use client";

import { Lock, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

interface ProGateProps {
  children: React.ReactNode;
  feature: string;
}

export function ProGate({ children, feature }: ProGateProps) {
  const { plan, isLoading } = useAuth();

  if (plan === "pro") {
    return <>{children}</>;
  }

  return (
    <div className="relative rounded-xl overflow-hidden min-h-[420px]">
      {/* Static placeholder — don't mount real children until Pro (avoids fetch race condition) */}
      <div className="opacity-20 pointer-events-none blur-[3px] select-none" aria-hidden="true">
        {isLoading ? (
          <div className="space-y-4 p-4">
            <div className="h-6 w-48 bg-[#F0F0F0] rounded animate-pulse" />
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#F0F0F0] rounded-xl animate-pulse" />)}
            </div>
            <div className="h-64 bg-[#F0F0F0] rounded-xl animate-pulse" />
          </div>
        ) : (
          <div className="space-y-4 p-4">
            <div className="h-6 w-48 bg-[#F0F0F0] rounded" />
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#F0F0F0] rounded-xl" />)}
            </div>
            <div className="h-64 bg-[#F0F0F0] rounded-xl" />
            <div className="h-48 bg-[#F0F0F0] rounded-xl" />
          </div>
        )}
      </div>

      {/* Overlay — always centered, never clipped */}
      <div className="absolute inset-0 flex items-center justify-center pro-gate-backdrop">
        <div className="pro-gate-card rounded-2xl border shadow-premium-xl p-8 text-center max-w-sm mx-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FAFAFA] flex items-center justify-center mx-auto mb-5">
            <Lock className="w-6 h-6 text-quaternary" />
          </div>
          <h3 className="text-[17px] font-semibold tracking-tight mb-2">Pro Feature</h3>
          <p className="text-[14px] text-tertiary leading-relaxed mb-6">
            {feature}
          </p>
          <Link
            href="/pulse/upgrade"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-foreground text-background text-[14px] font-semibold hover:bg-foreground/90 transition-colors duration-300"
          >
            <Sparkles className="w-4 h-4" />
            Upgrade to Pro
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="mt-4 text-[12px] text-quaternary">
            $49 USDC/month — cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
