import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/os-landing";
import { readInitialAtlasSnapshot } from "@/lib/atlas/ssr";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kyvern — The operating system for your AI agents.",
  description:
    "Give your AI agent a wallet with spending rules enforced on-chain by Solana. Budgets, allowlists, kill switch. Atlas has been running live on devnet since April 20.",
  alternates: { canonical: "https://app.kyvernlabs.com" },
};

export default function Home() {
  const initialAtlas = readInitialAtlasSnapshot();
  return <LandingPage initialAtlas={initialAtlas} />;
}
