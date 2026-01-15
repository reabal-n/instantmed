import { Suspense } from 'react'
import type { Metadata } from 'next'
import {
  Hero,
  ServicePicker,
  HowItWorks,
  FAQSection,
  CTASection,
  PlatformStats,
  MarketingFooter,
} from '@/components/marketing'
import { TrustBadgeSlider } from '@/components/marketing/trust-badge-slider'
import { TrustpilotReviews } from '@/components/marketing/trustpilot-reviews'
import { Navbar } from '@/components/shared/navbar'
import { ParallaxSection } from '@/components/ui/parallax-section'
import { HashScrollHandler } from '@/components/shared/hash-scroll-handler'
import { FAQSchema } from '@/components/seo/healthcare-schema'
import { faqItems } from '@/lib/marketing/homepage'
import { DoctorAvailability } from '@/components/shared/doctor-availability'
import { ReturningPatientBanner } from '@/components/shared/returning-patient-banner'
import { ExitIntentPopup } from '@/components/shared/exit-intent-popup'

// SEO metadata for homepage - critical for Google ranking
export const metadata: Metadata = {
  title: 'Online Doctor Australia | Medical Certificates & Prescriptions | InstantMed',
  description: 'Get medical certificates ($19.95) and repeat prescriptions ($29.95) from AHPRA-registered Australian doctors in under 30 minutes. No phone calls, no video. Reviewed by real GPs.',
  keywords: [
    'online doctor australia',
    'telehealth australia',
    'medical certificate online',
    'online GP',
    'sick certificate',
    'repeat prescription online',
    'telehealth GP',
    'virtual doctor australia',
  ],
  openGraph: {
    title: 'InstantMed - Online Doctor Consultations Australia',
    description: 'Medical certificates and prescriptions sorted in under 30 minutes by Australian-registered doctors.',
    type: 'website',
    locale: 'en_AU',
    url: 'https://instantmed.com.au',
    siteName: 'InstantMed',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'InstantMed - Online Doctor Australia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'InstantMed - Online Doctor Australia',
    description: 'Medical certificates and prescriptions in under 30 minutes.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://instantmed.com.au',
  },
}

// Loading skeleton for below-the-fold sections
function SectionSkeleton({ height = 'h-96' }: { height?: string }) {
  return <div className={`${height} animate-pulse bg-muted/20 rounded-xl`} />
}

export default function HomePage() {
  // Transform FAQ items for schema
  const faqSchemaData = faqItems.map(item => ({
    question: item.question,
    answer: item.answer
  }))

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* SEO Structured Data - FAQ Schema for rich snippets */}
      <FAQSchema faqs={faqSchemaData} />
      
      {/* Client component for hash navigation */}
      <HashScrollHandler />
      
      {/* Exit intent popup for abandoning users */}
      <ExitIntentPopup variant="discount" />
      
      {/* Real-time doctor availability banner */}
      <DoctorAvailability variant="banner" />
      
      {/* Returning patient recognition */}
      <ReturningPatientBanner className="mx-4 mt-2" />
      
      <Navbar variant="marketing" />
      
      <main className="relative">
        {/* Hero with main value prop - above the fold, prioritized */}
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
        
        {/* How it works - 3 steps */}
        <Suspense fallback={<SectionSkeleton />}>
          <ParallaxSection speed={0.2}>
            <HowItWorks />
          </ParallaxSection>
        </Suspense>
        
        {/* Trustpilot reviews - authentic social proof */}
        <Suspense fallback={<SectionSkeleton height="h-64" />}>
          <ParallaxSection speed={0.25}>
            <TrustpilotReviews />
          </ParallaxSection>
        </Suspense>
        
        {/* Platform performance stats */}
        <Suspense fallback={<SectionSkeleton height="h-48" />}>
          <ParallaxSection speed={0.2}>
            <PlatformStats />
          </ParallaxSection>
        </Suspense>
        
        {/* FAQs */}
        <Suspense fallback={<SectionSkeleton />}>
          <ParallaxSection speed={0.15}>
            <FAQSection />
          </ParallaxSection>
        </Suspense>
        
        {/* Final CTA */}
        <Suspense fallback={<SectionSkeleton height="h-64" />}>
          <ParallaxSection speed={0.2}>
            <CTASection />
          </ParallaxSection>
        </Suspense>
      </main>
      
      <MarketingFooter />
    </div>
  )
}
