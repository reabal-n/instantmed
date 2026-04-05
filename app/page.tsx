import { Suspense } from 'react'
import type { Metadata } from 'next'
import { cn } from '@/lib/utils'
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
import { FAQSchema, SpeakableSchema } from '@/components/seo/healthcare-schema'
import { faqItems } from '@/lib/marketing/homepage'
import { ReturningPatientBanner } from '@/components/shared/returning-patient-banner'
import { getFeatureFlags } from '@/lib/feature-flags'
import Link from 'next/link'
import { CTABanner, SectionHeader } from '@/components/sections'
import { AccordionSection } from '@/components/sections'
import { MarketingPageShell } from '@/components/shared/marketing-page-shell'
import { DoctorCredibility } from '@/components/marketing/doctor-credibility'
import { TotalPatientsCounter } from '@/components/marketing/total-patients-counter'
import { RegulatoryPartners } from '@/components/marketing/media-mentions'
import { GoogleReviewsBadge } from '@/components/marketing/google-reviews-badge'
import { AfterHoursMedCertBanner } from '@/components/shared/after-hours-med-cert-banner'

export const revalidate = 3600

// SEO metadata for homepage - critical for Google ranking
// Note: Avoid prescription drug terms (script, prescription) per Google Ads policy for Australia
export const metadata: Metadata = {
  title: { absolute: 'Online Doctor Australia | Med Certs & Medication | InstantMed' },
  description: 'Medical certificates from $19.95 — issued in under 30 minutes, 24/7. Repeat medication from $29.95. AHPRA-registered Australian doctors, 100% online.',
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
    title: 'Online Doctor Australia | Med Certs & Medication | InstantMed',
    description: 'Medical certificates issued in under 30 minutes, 24/7. Repeat medication reviewed by Australian-registered doctors.',
    type: 'website',
    locale: 'en_AU',
    url: 'https://instantmed.com.au',
    siteName: 'InstantMed',
    // OG image handled by app/opengraph-image.tsx convention file
  },
  twitter: {
    card: 'summary_large_image',
    title: 'InstantMed - Online Doctor Australia',
    description: 'Medical certificates issued in under 30 minutes, 24/7. Repeat medication reviewed by Australian doctors.',
    // Twitter image handled by app/opengraph-image.tsx convention file
  },
  alternates: {
    canonical: 'https://instantmed.com.au',
  },
}

// Loading skeleton for below-the-fold sections
function SectionSkeleton({ height = 'h-96' }: { height?: string }) {
  return <div className={cn(height, "animate-pulse bg-muted/20 rounded-xl")} />
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

// Streamed async component — fetches flags independently so the main page
// shell renders immediately without waiting for the DB call.
async function MaintenanceBanner() {
  const flags = await getFeatureFlags()
  if (!flags.maintenance_mode) return null
  return (
    <div className="mx-4 mt-2 rounded-2xl border border-warning-border bg-warning-light/50 px-4 py-3 flex items-center gap-3">
      <svg className="w-5 h-5 text-warning shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63" />
      </svg>
      <div>
        <p className="text-sm font-medium text-amber-900">We&apos;re currently performing maintenance.</p>
        <p className="text-xs text-warning">{(flags as { maintenance_message?: string }).maintenance_message || "New requests will be accepted soon."}</p>
      </div>
    </div>
  )
}

export default async function HomePage() {
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
        description="Get medical certificates in under 30 minutes, 24/7. Repeat medication and doctor consults online from $19.95. AHPRA-registered Australian doctors."
        url="/"
      />

      {/* Client component for hash navigation */}
      <HashScrollHandler />

      {/* Returning patient recognition */}
      <ReturningPatientBanner className="mx-4 mt-2" />

      <Navbar variant="marketing" />

      {/* After-hours banner — promotes 24/7 med certs when doctors are offline */}
      <AfterHoursMedCertBanner />

      {/* Maintenance banner — streamed independently, doesn't block hero */}
      <Suspense fallback={null}>
        <MaintenanceBanner />
      </Suspense>

      <main className="relative">
        {/* Hero with main value prop — LCP p passed as children for server render */}
        <Hero>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed text-balance">
            Medical certificates in under 30 minutes, 24/7. Prescriptions and consultations reviewed by real Australian doctors. No appointments, no video calls — just fill in a quick form and a GP takes care of the rest.
          </p>
        </Hero>

        {/* Live wait times - shows current doctor response times */}
        <LiveWaitTime variant="strip" />

        {/* Trust badges - compact strip */}
        <TrustBadgeSlider />

        {/* Google reviews badge — renders only when GOOGLE_REVIEWS.enabled = true */}
        <div className="flex justify-center pb-2">
          <GoogleReviewsBadge />
        </div>

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

        {/* Doctor credibility */}
        <DoctorCredibility
          variant="section"
          stats={['experience', 'sameDay', 'returnRate', 'reviews']}
        />

        {/* Key stats strip */}
        <StatsStrip className="bg-muted/20 border-y border-border/30" />

        {/* Content hubs — internal links for crawl discovery */}
        <section className="py-16 px-4">
          <SectionHeader
            title="Browse by Topic"
            subtitle="Find the information you need"
            highlightWords={["Topic"]}
          />
          <div className="mx-auto max-w-4xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: "Health Conditions", href: "/conditions", description: "48 conditions covered" },
              { label: "Symptom Guide", href: "/symptoms", description: "Common symptoms explained" },
              { label: "How-To Guides", href: "/guides", description: "Step-by-step health guides" },
              { label: "Compare Services", href: "/compare", description: "See how we stack up" },
              { label: "Locations", href: "/locations", description: "Find your nearest city" },
            ].map((hub) => (
              <Link
                key={hub.href}
                href={hub.href}
                className="group rounded-2xl border border-border/50 bg-white dark:bg-card p-4 shadow-sm shadow-primary/[0.04] hover:shadow-md hover:border-primary/20 transition-all"
              >
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {hub.label}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{hub.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <AccordionSection
          id="faq"
          pill="FAQ"
          title="Common questions"
          subtitle="Everything you need to know about our service."
          groups={faqGroups}
        />

        {/* Regulatory credibility strip */}
        <RegulatoryPartners variant="strip" />

        {/* Social proof before final CTA */}
        <div className="mx-auto max-w-4xl px-4 pb-4 flex justify-center">
          <TotalPatientsCounter variant="badge" />
        </div>

        {/* Final CTA */}
        <CTABanner
          title="Ready when you are"
          subtitle="Tell us what's going on, a doctor reviews it, and you're sorted. No appointments, no waiting rooms."
          ctaText="Get started"
          ctaHref="/request"
        />
      </main>

      <MarketingFooter />
    </div>
    </MarketingPageShell>
  )
}
