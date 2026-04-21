import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Hero as HeroVault } from "@/components/landing/hero-vault";
import { MoatSection } from "@/components/landing/moat-section";
import { StackSection } from "@/components/landing/stack-section";
import { WhySolana } from "@/components/landing/why-solana";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { readInitialAtlasSnapshot } from "@/lib/atlas/ssr";

// Don't cache this route — Atlas state changes every cycle. We want
// each visitor to see the latest snapshot in the initial HTML so the
// Twitter unfurl / LinkedIn preview / first-paint hero all ship real
// numbers. SSR is our first-impression weapon.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kyvern — Let your AI agents run free.",
  description:
    "Kyvern replaces the private key with a budget Solana enforces. Deploy an AI agent, set the rules on-chain, watch it run autonomously. Atlas — our reference agent — is live on devnet right now.",
  alternates: { canonical: "https://kyvernlabs.com" },
};

export default function Home() {
  // Read Atlas state synchronously from the server-side SQLite. The
  // client observatory receives this as a prop and starts with real
  // values instead of "awaiting ignition" placeholders. Every social
  // unfurl and every slow-network visitor now sees "7h 21m · 135 txs
  // · 39 attacks blocked" in the initial HTML.
  const initialAtlas = readInitialAtlasSnapshot();

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: "var(--background)" }}
    >
      <Navbar />
      <HeroVault initialAtlasState={initialAtlas} />
      <MoatSection />
      <StackSection />
      <WhySolana />
      <FinalCTA />
      <Footer />
    </div>
  );
}
