import {
  MarketingNavbar,
  Hero,
  ServicePicker,
  ProofStrip,
  HowItWorks,
  ServicesSection,
  OneHourPromise,
  PricingSection,
  FAQSection,
  CTASection,
  MarketingFooter,
} from '@/components/marketing'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNavbar />
      
      <main>
        {/* Hero with rotating text */}
        <Hero />
        
        {/* Service picker - above fold quick access */}
        <ServicePicker />
        
        {/* Proof strip - metrics/trust signals */}
        <ProofStrip />
        
        {/* How it works - 3 steps */}
        <HowItWorks />
        
        {/* Featured services */}
        <ServicesSection />
        
        {/* 1-hour promise / SLA */}
        <OneHourPromise />
        
        {/* Pricing tiers */}
        <PricingSection />
        
        {/* FAQ accordion */}
        <FAQSection />
        
        {/* Final CTA */}
        <CTASection />
      </main>
      
      <MarketingFooter />
    </div>
  )
}
