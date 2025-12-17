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
import { TestimonialMarquee } from '@/components/marketing/testimonial-marquee'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
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
        
        {/* Testimonial marquee */}
        <TestimonialMarquee />
        
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
