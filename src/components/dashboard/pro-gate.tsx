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
      <div className="opacity-40 pointer-events-none blur-[2px] select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-950/60 backdrop-blur-[1px]">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-black/[0.08] dark:border-gray-700 shadow-premium-lg p-5 text-center max-w-xs mx-4">
          <div className="w-10 h-10 rounded-xl bg-[#FAFAFA] dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-4.5 h-4.5 text-quaternary" />
          </div>
          <p className="text-[14px] font-semibold tracking-tight mb-1">Pro Feature</p>
          <p className="text-[12px] text-tertiary leading-relaxed mb-4">
            {feature}
          </p>
          <Link
            href="/pulse/upgrade"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-foreground text-background text-[12px] font-medium hover:bg-foreground/90 transition-colors duration-300"
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
