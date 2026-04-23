import type { Metadata } from "next";
import { DeviceNavbar } from "@/components/landing/device-navbar";
import { DeviceHero } from "@/components/landing/device-hero";
import {
  HowItWorks,
  DeveloperSection,
  WhySolanaSection,
  DeviceCTA,
} from "@/components/landing/device-sections";
import { readInitialAtlasSnapshot } from "@/lib/atlas/ssr";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kyvern — Your AI agent can spend. Only what you allow.",
  description:
    "On-chain spending policies for autonomous agents on Solana. Budgets, allowlists, kill switch — enforced by a Solana program your agent can't bypass. Atlas has been running live on devnet since April 20.",
  alternates: { canonical: "https://app.kyvernlabs.com" },
};

export default function Home() {
  const initialAtlas = readInitialAtlasSnapshot();

  return (
    <div className="min-h-screen" style={{ background: "#050505" }}>
      <DeviceNavbar />
      <DeviceHero initialAtlasState={initialAtlas} />
      <HowItWorks />
      <DeveloperSection />
      <WhySolanaSection />
      <DeviceCTA />
    </div>
  );
}
