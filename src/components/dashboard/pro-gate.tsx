"use client";

import { Lock, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

interface ProGateProps {
  children: React.ReactNode;
  feature: string;
}

export function ProGate({ children, feature }: ProGateProps) {
  const { plan } = useAuth();

  if (plan === "pro") {
    return <>{children}</>;
  }

  return (
    <div className="relative rounded-xl overflow-hidden">
      <div className="opacity-30 pointer-events-none blur-[3px] select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center pro-gate-backdrop">
        <div className="pro-gate-card rounded-xl border shadow-premium-lg p-6 text-center max-w-xs mx-4">
          <div className="w-11 h-11 rounded-xl bg-[#FAFAFA] flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-quaternary" />
          </div>
          <p className="text-[15px] font-semibold tracking-tight mb-1.5">Pro Feature</p>
          <p className="text-[13px] text-tertiary leading-relaxed mb-5">
            {feature}
          </p>
          <Link
            href="/pulse/upgrade"
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors duration-300"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Upgrade to Pro
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
