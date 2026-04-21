import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Hero as HeroVault } from "@/components/landing/hero-vault";
import { MoatSection } from "@/components/landing/moat-section";
import { StackSection } from "@/components/landing/stack-section";
import { WhySolana } from "@/components/landing/why-solana";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Kyvern — Let your AI agents run free.",
  description:
    "Kyvern replaces the private key with a budget Solana enforces. Deploy an AI agent, set the rules on-chain, watch it run autonomously. Atlas — our reference agent — is live on devnet right now.",
  alternates: { canonical: "https://kyvernlabs.com" },
};

export default function Home() {
  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: "var(--background)" }}
    >
      <Navbar />
      <HeroVault />
      <MoatSection />
      <StackSection />
      <WhySolana />
      <FinalCTA />
      <Footer />
    </div>
  );
}
