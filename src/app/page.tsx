import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/os-landing";
import { readInitialAtlasSnapshot } from "@/lib/atlas/ssr";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kyvern — A Device That Finds You Opportunities",
  description:
    "AI workers on Solana with on-chain budget enforcement. Atlas has been running for 11+ days — 1,408 attacks blocked, $0 lost. Get your own device.",
  alternates: { canonical: "https://kyvernlabs.com" },
};

export default function Home() {
  const initialAtlas = readInitialAtlasSnapshot();
  return <LandingPage initialAtlas={initialAtlas} />;
}
