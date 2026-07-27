import { Navbar } from "../../components/landing/Navbar";
import { Hero } from "../../components/landing/Hero";
import { SocialProof } from "../../components/landing/SocialProof";
import { Features } from "../../components/landing/Features";
import { FeatureDeepDive } from "../../components/landing/FeatureDeepDive";
import { Platforms } from "../../components/landing/Platforms";
import { Testimonials } from "../../components/landing/Testimonials";
import { Pricing } from "../../components/landing/Pricing";
import { CTABanner } from "../../components/landing/CTABanner";
import { Footer } from "../../components/landing/Footer";

export function LandingPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#FFF" }} className="w-full">
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <FeatureDeepDive />
        <Platforms />
        <Testimonials />
        <Pricing />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}
