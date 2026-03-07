import { Suspense } from 'react'
import type { Metadata } from 'next'
import {
  Hero,
  ServicePicker,
  HowItWorks,
  MarketingFooter,
  LiveWaitTime,
  StatsStrip,
} from '@/components/marketing'
import { TrustBadgeSlider } from '@/components/marketing/trust-badge-slider'
import { PatientReviews } from '@/components/marketing/patient-reviews'
import { Navbar } from '@/components/shared/navbar'
import { HashScrollHandler } from '@/components/shared/hash-scroll-handler'
import { FAQSchema } from '@/components/seo/healthcare-schema'
import { faqItems } from '@/lib/marketing/homepage'
import { ReturningPatientBanner } from '@/components/shared/returning-patient-banner'
import { CTABanner } from '@/components/sections'
import { AccordionSection } from '@/components/sections'

export const revalidate = 3600

// SEO metadata for homepage - critical for Google ranking
export const metadata: Metadata = {
  title: 'Online Doctor Australia | Med Certs & Scripts',
  description: 'Medical certificates from $19.95, prescriptions from $29.95. AHPRA-registered Australian doctors. Results in under an hour, 100% online.',
  keywords: [
    'online doctor australia',
    'telehealth australia',
    'medical certificate online',
    'online doctor',
    'sick certificate',
    'repeat script online',
    'telehealth doctor',
    'virtual doctor australia',
  ],
  openGraph: {
    title: 'InstantMed - Online Doctor Consultations Australia',
    description: 'Medical certificates and prescriptions sorted in under an hour by Australian-registered doctors.',
    type: 'website',
    locale: 'en_AU',
    url: 'https://instantmed.com.au',
    siteName: 'InstantMed',
    // OG image handled by app/opengraph-image.tsx convention file
  },
  twitter: {
    card: 'summary_large_image',
    title: 'InstantMed - Online Doctor Australia',
    description: 'Medical certificates and prescriptions in under an hour.',
    // Twitter image handled by app/opengraph-image.tsx convention file
  },
  alternates: {
    canonical: 'https://instantmed.com.au',
  },
}

// Loading skeleton for below-the-fold sections
function SectionSkeleton({ height = 'h-96' }: { height?: string }) {
  return <div className={`${height} animate-pulse bg-muted/20 rounded-xl`} />
}

// Transform FAQ items into AccordionSection groups format
const faqGroups = [
  {
    items: faqItems.map(item => ({
      question: item.question,
      answer: item.answer,
    })),
  },
]

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

      {/* Returning patient recognition */}
      <ReturningPatientBanner className="mx-4 mt-2" />

      <Navbar variant="marketing" />

      <main className="relative">
        {/* Hero with main value prop */}
        <Hero />

        {/* Live wait times - shows current doctor response times */}
        <LiveWaitTime variant="strip" />

        {/* Trust badges - compact strip */}
        <TrustBadgeSlider />

        {/* Core services - what we offer */}
        <ServicePicker />

        {/* How it works - 3 steps */}
        <Suspense fallback={<SectionSkeleton />}>
          <HowItWorks />
        </Suspense>

        {/* Patient reviews - authentic social proof */}
        <Suspense fallback={<SectionSkeleton height="h-64" />}>
          <PatientReviews />
        </Suspense>

        {/* Key stats strip */}
        <StatsStrip className="bg-muted/20 border-y border-border/30" />

        {/* FAQs */}
        <AccordionSection
          id="faq"
          pill="FAQ"
          title="Common questions"
          subtitle="Everything you need to know about our service."
          groups={faqGroups}
        />

        {/* Final CTA */}
        <CTABanner
          title="Feeling too sick to visit a GP?"
          subtitle="Tell us what's going on, a doctor reviews it, and your certificate lands in your inbox. No appointments, no waiting rooms."
          ctaText="Get your certificate"
          ctaHref="/request?service=med-cert"
        />
      </main>

      <MarketingFooter />
    </div>
  )
}
