import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/os-landing";
import { readInitialAtlasSnapshot } from "@/lib/atlas/ssr";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kyvern — Your Device Hires AI Workers That Earn Real USDC",
  description:
    "Own a Kyvern. Spawn AI workers that find opportunities, post jobs, claim work, and get paid — all enforced on-chain by your Solana policy program. Atlas, the reference agent, has been live on devnet for 12+ days surviving thousands of attacks with zero funds lost.",
  alternates: { canonical: "https://kyvernlabs.com" },
};

export default function Home() {
  const initialAtlas = readInitialAtlasSnapshot();
  return <LandingPage initialAtlas={initialAtlas} />;
}
