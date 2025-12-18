import {
  Hero,
  ServicePicker,
  ProofStrip,
  HowItWorks,
  OneHourPromise,
  FAQSection,
  CTASection,
  TrustSection,
  MarketingFooter,
} from '@/components/marketing'
import { TestimonialMarquee } from '@/components/marketing/testimonial-marquee'
import { ComparisonStats } from '@/components/homepage/comparison-stats'
import { AnimatedGradientBackground } from '@/components/effects/animated-gradient-bg'
import { ParallaxSection } from '@/components/effects/parallax-section'
import { Navbar } from '@/components/shared/navbar'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-transparent overflow-x-hidden">
      <AnimatedGradientBackground />
      
      <Navbar variant="marketing" />
      
      <main>
        <Hero />
        
        <ParallaxSection speed={0.05}>
          <ServicePicker />
        </ParallaxSection>
        
        <ParallaxSection speed={0.08}>
          <ProofStrip />
        </ParallaxSection>
        
        <ParallaxSection speed={0.06}>
          <ComparisonStats />
        </ParallaxSection>
        
        <ParallaxSection speed={0.04}>
          <HowItWorks />
        </ParallaxSection>
        
        <ParallaxSection speed={0.03}>
          <TestimonialMarquee />
        </ParallaxSection>
        
        <ParallaxSection speed={0.04}>
          <TrustSection />
        </ParallaxSection>
        
        <ParallaxSection speed={0.07}>
          <OneHourPromise />
        </ParallaxSection>
        
        <ParallaxSection speed={0.04}>
          <FAQSection />
        </ParallaxSection>
        
        <ParallaxSection speed={0.06}>
          <CTASection />
        </ParallaxSection>
      </main>
      
      <MarketingFooter />
    </div>
  )
}
