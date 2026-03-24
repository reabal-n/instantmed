import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { cn } from '@/lib/utils'
import {
  Hero,
  ServicePicker,
  MarketingFooter,
  LiveWaitTime,
  SectionDivider,
} from '@/components/marketing'
import { TrustBadgeSlider } from '@/components/marketing/trust-badge-slider'
import { Navbar } from '@/components/shared/navbar'
import { HashScrollHandler } from '@/components/shared/hash-scroll-handler'
import { FAQSchema, SpeakableSchema } from '@/components/seo/healthcare-schema'
import { faqItems } from '@/lib/marketing/homepage'
import { ReturningPatientBanner } from '@/components/shared/returning-patient-banner'
import { getFeatureFlags } from '@/lib/feature-flags'
import { MarketingPageShell } from '@/components/shared/marketing-page-shell'

// Below-fold: dynamic imports for better initial load
const HowItWorks = dynamic(() => import('@/components/marketing/how-it-works').then(m => ({ default: m.HowItWorks })))
const PatientReviews = dynamic(() => import('@/components/marketing/patient-reviews').then(m => ({ default: m.PatientReviews })))
const StatsStrip = dynamic(() => import('@/components/marketing/total-patients-counter').then(m => ({ default: m.StatsStrip })))
const AccordionSection = dynamic(() => import('@/components/sections/accordion-section').then(m => ({ default: m.AccordionSection })))
const CTABanner = dynamic(() => import('@/components/sections').then(m => ({ default: m.CTABanner })))

export const revalidate = 3600

// SEO metadata for homepage - critical for Google ranking
// Note: Avoid prescription drug terms (script, prescription) per Google Ads policy for Australia
export const metadata: Metadata = {
  title: 'Online Doctor Australia | Med Certs & Medication',
  description: 'Medical certificates from $19.95, repeat medication from $29.95. AHPRA-registered Australian doctors. Most requests reviewed within 1–2 hours, 100% online.',
  keywords: [
    'online doctor australia',
    'telehealth australia',
    'medical certificate online',
    'online doctor',
    'sick certificate',
    'repeat medication online',
    'telehealth doctor',
    'virtual doctor australia',
  ],
  openGraph: {
    title: 'InstantMed - Online Doctor Consultations Australia',
    description: 'Medical certificates and repeat medication. Most requests reviewed within 1–2 hours by Australian-registered doctors.',
    type: 'website',
    locale: 'en_AU',
    url: 'https://instantmed.com.au',
    siteName: 'InstantMed',
    // OG image handled by app/opengraph-image.tsx convention file
  },
  twitter: {
    card: 'summary_large_image',
    title: 'InstantMed - Online Doctor Australia',
    description: 'Medical certificates and repeat medication. Most requests reviewed within 1–2 hours.',
    // Twitter image handled by app/opengraph-image.tsx convention file
  },
  alternates: {
    canonical: 'https://instantmed.com.au',
  },
}

// Loading skeletons for below-the-fold sections — match actual section shapes
function SectionSkeleton({ height = 'h-96', variant = 'default' }: { height?: string; variant?: 'default' | 'steps' | 'reviews' | 'stats' }) {
  if (variant === 'steps') {
    return (
      <div className="py-20 px-4 max-w-5xl mx-auto space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-muted/30 rounded-lg mx-auto" />
        <div className="h-4 w-72 bg-muted/20 rounded mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-muted/20 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }
  if (variant === 'reviews') {
    return (
      <div className="py-12 px-4 max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-muted/30 rounded-lg mx-auto" />
        <div className="flex gap-4 justify-center">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 w-72 bg-muted/20 rounded-2xl hidden md:block first:block" />
          ))}
        </div>
      </div>
    )
  }
  return <div className={cn(height, "animate-pulse bg-muted/20 rounded-xl mx-4")} />
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

export default async function HomePage() {
  const flags = await getFeatureFlags()
  // Transform FAQ items for schema
  const faqSchemaData = faqItems.map(item => ({
    question: item.question,
    answer: item.answer
  }))

  return (
    <MarketingPageShell>
    <div className="min-h-screen overflow-x-hidden">
      {/* SEO Structured Data */}
      <FAQSchema faqs={faqSchemaData} />
      <SpeakableSchema
        name="InstantMed - Online Doctor Australia"
        description="Get medical certificates, repeat medication and doctor consults online from $19.95. AHPRA-registered Australian doctors. Most requests reviewed within 1-2 hours."
        url="/"
      />

      {/* Client component for hash navigation */}
      <HashScrollHandler />

      {/* Returning patient recognition */}
      <ReturningPatientBanner className="mx-4 mt-2" />

      <Navbar variant="marketing" />

      {/* Maintenance banner when platform is closed (below Navbar) */}
      {flags.maintenance_mode && (
        <div className="mx-4 mt-2 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-4 py-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">We&apos;re currently performing maintenance.</p>
            <p className="text-xs text-amber-700 dark:text-amber-200">{flags.maintenance_message || "New requests will be accepted soon."}</p>
          </div>
        </div>
      )}

      <main className="relative">
        {/* Hero with main value prop — LCP p passed as children for server render */}
        <Hero>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed text-balance">
            Real Australian doctors review every request. No appointments, no video calls — just fill in a quick form and a GP takes care of the rest. Most people are sorted within the hour.
          </p>
        </Hero>

        {/* Live wait times - shows current doctor response times */}
        <LiveWaitTime variant="strip" />

        {/* Trust badges - compact strip */}
        <TrustBadgeSlider />

        {/* Divider: trust → services */}
        <SectionDivider variant="wave" />

        {/* Core services - what we offer */}
        <ServicePicker />

        {/* Divider: services → how-it-works */}
        <SectionDivider variant="curve" />

        {/* How it works - 3 steps */}
        <Suspense fallback={<SectionSkeleton variant="steps" />}>
          <HowItWorks />
        </Suspense>

        {/* Divider: how-it-works → reviews */}
        <SectionDivider variant="wave" flip />

        {/* Patient reviews - authentic social proof */}
        <Suspense fallback={<SectionSkeleton variant="reviews" />}>
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
          title="Ready when you are"
          subtitle="Tell us what's going on, a doctor reviews it, and your certificate lands in your inbox. No appointments, no waiting rooms."
          ctaText="Get started"
          ctaHref="/request?service=med-cert"
        />
      </main>

      <MarketingFooter />
    </div>
    </MarketingPageShell>
  )
}
