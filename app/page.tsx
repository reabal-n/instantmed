import {
  Hero,
  ServicePicker,
  HowItWorks,
  FAQSection,
  CTASection,
  MarketingFooter,
  HealthCategories,
  PlatformStats,
} from '@/components/marketing'
import { TrustpilotReviews } from '@/components/marketing/trustpilot-reviews'
import { TrustBadgeSlider } from '@/components/marketing/trust-badge-slider'
import { Navbar } from '@/components/shared/navbar'
import { ParallaxSection } from '@/components/ui/parallax-section'

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar variant="marketing" />
      
      <main className="relative">
        {/* Hero with main value prop */}
        <ParallaxSection speed={0.2}>
          <Hero />
        </ParallaxSection>
        
        {/* Trust badges - compact strip */}
        <ParallaxSection speed={0.15}>
          <TrustBadgeSlider />
        </ParallaxSection>
        
        {/* Core services - what we offer */}
        <ParallaxSection speed={0.25}>
          <ServicePicker />
        </ParallaxSection>
        
        {/* Specialized health verticals */}
        <ParallaxSection speed={0.3}>
          <HealthCategories />
        </ParallaxSection>
        
        {/* How it works - 3 steps */}
        <ParallaxSection speed={0.2}>
          <HowItWorks />
        </ParallaxSection>
        
        {/* Trustpilot reviews - authentic social proof (moved lower) */}
        <ParallaxSection speed={0.25}>
          <TrustpilotReviews />
        </ParallaxSection>
        
        {/* Platform performance stats */}
        <ParallaxSection speed={0.2}>
          <PlatformStats />
        </ParallaxSection>
        
        {/* FAQs */}
        <ParallaxSection speed={0.15}>
          <FAQSection />
        </ParallaxSection>
        
        {/* Final CTA */}
        <ParallaxSection speed={0.2}>
          <CTASection />
        </ParallaxSection>
      </main>
      
      <MarketingFooter />
    </div>
  )
}
