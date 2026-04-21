import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { DemoLive } from "@/components/demo/demo-live";

export const metadata: Metadata = {
  title: "Live demo — KyvernLabs",
  description:
    "Watch a real AI agent run against a real Solana vault. Real policy. Real signatures. Real block. No mocks.",
  alternates: { canonical: "https://kyvernlabs.com/demo" },
};

export default function DemoPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: "var(--background)" }}
    >
      <Navbar />
      <main>
        <DemoLive />
      </main>
      <Footer />
    </div>
  );
}
