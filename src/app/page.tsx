import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/os-landing";
import { readInitialAtlasSnapshot } from "@/lib/atlas/ssr";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kyvern — Financial safety infrastructure for autonomous agents",
  description:
    "AI agents shouldn't have private keys. They should have budgets. Kyvern enforces agent spending policies on-chain using Solana smart accounts. Caps, allowlists, kill switch — decided by the chain before a single lamport moves. Atlas reference agent live on devnet, $0 lost.",
  alternates: { canonical: "https://kyvernlabs.com" },
};

export default function Home() {
  const initialAtlas = readInitialAtlasSnapshot();
  return <LandingPage initialAtlas={initialAtlas} />;
}
