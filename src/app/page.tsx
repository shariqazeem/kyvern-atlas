import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/os-landing";
import { readInitialAtlasSnapshot } from "@/lib/atlas/ssr";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kyvern — A Solana device for your AI agent",
  description:
    "Your Kyvern device is a real Solana smart account that decides every dollar your AI agent spends. Caps, allowlists, kill switch — enforced on-chain before a single lamport moves. Atlas, the reference agent, has been live on Solana devnet for 19+ days with $0 lost. Compatible with pay.sh and KAST deposit rails.",
  alternates: { canonical: "https://kyvernlabs.com" },
};

export default function Home() {
  const initialAtlas = readInitialAtlasSnapshot();
  return <LandingPage initialAtlas={initialAtlas} />;
}
