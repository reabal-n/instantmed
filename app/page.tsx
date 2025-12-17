import {
  Hero,
  ServicePicker,
  ProofStrip,
  HowItWorks,
  ServicesSection,
  OneHourPromise,
  PricingSection,
  FAQSection,
  CTASection,
  TrustSection,
  MarketingFooter,
} from '@/components/marketing'
import { TestimonialMarquee } from '@/components/marketing/testimonial-marquee'
import { AnimatedGradientBackground } from '@/components/effects/animated-gradient-bg'
import { ParallaxSection } from '@/components/effects/parallax-section'
import { Navbar } from '@/components/shared/navbar'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-transparent overflow-x-hidden">
      {/* Fixed animated gradient background with grain */}
      <AnimatedGradientBackground />
      
      <Navbar variant="marketing" />
      
      <main>
        {/* Hero - no parallax, stays grounded */}
        <Hero />
        
        {/* Service picker - slight parallax */}
        <ParallaxSection speed={0.05}>
          <ServicePicker />
        </ParallaxSection>
        
        {/* Proof strip - faster parallax for depth */}
        <ParallaxSection speed={0.08}>
          <ProofStrip />
        </ParallaxSection>
        
        {/* How it works */}
        <ParallaxSection speed={0.04}>
          <HowItWorks />
        </ParallaxSection>
        
        {/* Featured services */}
        <ParallaxSection speed={0.06}>
          <ServicesSection />
        </ParallaxSection>
        
        {/* Testimonial marquee */}
        <ParallaxSection speed={0.03}>
          <TestimonialMarquee />
        </ParallaxSection>
        
        {/* Trust section */}
        <ParallaxSection speed={0.04}>
          <TrustSection />
        </ParallaxSection>
        
        {/* 1-hour promise / SLA */}
        <ParallaxSection speed={0.07}>
          <OneHourPromise />
        </ParallaxSection>
        
        {/* Pricing tiers */}
        <ParallaxSection speed={0.05}>
          <PricingSection />
        </ParallaxSection>
        
        {/* FAQ accordion */}
        <ParallaxSection speed={0.04}>
          <FAQSection />
        </ParallaxSection>
        
        {/* Final CTA */}
        <ParallaxSection speed={0.06}>
          <CTASection />
        </ParallaxSection>
      </main>
      
      <MarketingFooter />
    </div>
  )
}
