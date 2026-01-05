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
import { UnifiedBackground } from '@/components/effects/unified-background'
import { Navbar } from '@/components/shared/navbar'

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-premium-warm overflow-x-hidden">
      <UnifiedBackground />
      
      <Navbar variant="marketing" />
      
      <main className="relative">
        {/* Hero with main value prop */}
        <Hero />
        
        {/* Trust badges - compact strip */}
        <TrustBadgeSlider />
        
        {/* Core services - what we offer */}
        <ServicePicker />
        
        {/* Specialized health verticals */}
        <HealthCategories />
        
        {/* How it works - 3 steps */}
        <HowItWorks />
        
        {/* Trustpilot reviews - authentic social proof (moved lower) */}
        <TrustpilotReviews />
        
        {/* Platform performance stats */}
        <PlatformStats />
        
        {/* FAQs */}
        <FAQSection />
        
        {/* Final CTA */}
        <CTASection />
      </main>
      
      <MarketingFooter />
    </div>
  )
}
