import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { ProblemSection } from "@/components/landing/problem-section";
import { SocialProof } from "@/components/landing/social-proof";
import { ProductsSection } from "@/components/landing/products-section";
import { DevelopersSection } from "@/components/landing/developers-section";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <ProblemSection />
      <SocialProof />
      <ProductsSection />
      <DevelopersSection />
      <Footer />
    </div>
  );
}
