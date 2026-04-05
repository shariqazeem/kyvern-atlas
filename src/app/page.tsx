import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";

export const metadata: Metadata = {
  title: "KyvernLabs — The Business Layer for the x402 Economy",
  description:
    "Revenue analytics, smart routing, and business tools for x402 service providers. 195+ services, $600M+ volume. Built for the x402 Foundation ecosystem with Coinbase, Stripe, Google, Visa.",
  alternates: { canonical: "https://kyvernlabs.com" },
};
import { Hero } from "@/components/landing/hero";
import { ProblemSection } from "@/components/landing/problem-section";
import { SocialProof } from "@/components/landing/social-proof";
import { Leaderboard } from "@/components/landing/leaderboard";
import { ProductsSection } from "@/components/landing/products-section";
import { DevelopersSection } from "@/components/landing/developers-section";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <ProblemSection />
      <SocialProof />
      <Leaderboard />
      <DevelopersSection />
      <ProductsSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
