import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/os-landing";
import { readInitialAtlasSnapshot } from "@/lib/atlas/ssr";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kyvern — A device you own. Workers that earn. Money you control.",
  description:
    "A device on Solana with on-chain budgets that workers can't bypass. Spawn a worker, give it a job, watch it earn USDC. Atlas — the reference device — has been alive on devnet since April 20.",
  alternates: { canonical: "https://app.kyvernlabs.com" },
};

export default function Home() {
  const initialAtlas = readInitialAtlasSnapshot();
  return <LandingPage initialAtlas={initialAtlas} />;
}
