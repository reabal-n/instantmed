import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Suspense } from 'react'

import { Hero } from '@/components/marketing'
import { IntakeResumeChip } from '@/components/marketing/intake-resume-chip'
import { MarketingPageShell } from '@/components/marketing/marketing-page-shell'
import { FAQSchema, MedicalBusinessSchema, SpeakableSchema } from '@/components/seo/healthcare-schema'
import { HashScrollHandler } from '@/components/shared/hash-scroll-handler'
import { Navbar } from '@/components/shared/navbar'
import { ReturningPatientBanner } from '@/components/shared/returning-patient-banner'
import { PRICING_DISPLAY } from '@/lib/constants'
import { getFeatureFlags } from '@/lib/feature-flags'
import { faqItems } from '@/lib/marketing/homepage'
import { WEDGE } from '@/lib/marketing/voice'

// All below-fold sections are lazy-loaded to keep framer-motion and client
// component bundles out of the critical JS path. SSR:true (default) keeps
// full HTML in the initial response for SEO and CLS stability.
const ServiceCards = dynamic(
  () => import('@/components/marketing/service-cards').then(m => ({ default: m.ServiceCards })),
  { loading: () => <div className="min-h-[600px]" /> },
)
const HowItWorks = dynamic(
  () => import('@/components/marketing/how-it-works').then(m => ({ default: m.HowItWorks })),
  { loading: () => <div className="min-h-[500px]" /> },
)
const SocialProofSection = dynamic(
  () => import('@/components/marketing/social-proof-section').then(m => ({ default: m.SocialProofSection })),
  { loading: () => <div className="min-h-[400px]" /> },
)
const CTABanner = dynamic(
  () => import('@/components/sections/cta-banner').then(m => ({ default: m.CTABanner })),
)
const FAQSection = dynamic(
  () => import('@/components/sections/faq-section').then(m => ({ default: m.FAQSection })),
)
const ComplianceMarquee = dynamic(
  () => import('@/components/marketing/compliance-marquee').then(m => ({ default: m.ComplianceMarquee })),
)
const MarketingFooter = dynamic(
  () => import('@/components/marketing').then(m => ({ default: m.MarketingFooter })),
)

export const revalidate = 3600

// SEO metadata for homepage - critical for Google ranking
// Note: Avoid prescription drug terms (script, prescription) per Google Ads policy for Australia
export const metadata: Metadata = {
  title: { absolute: 'Online Doctor Australia | Consults, Repeat Rx, Med Certs, ED & Hair Loss | InstantMed' },
  description: `Doctor consultations from ${PRICING_DISPLAY.CONSULT}. Repeat medication from ${PRICING_DISPLAY.REPEAT_SCRIPT}. Medical certificates from ${PRICING_DISPLAY.MED_CERT} in under 20 minutes. AHPRA-registered Australian GPs, 100% online.`,
  keywords: [
    'online doctor australia',
    'telehealth australia',
    'medical certificate online',
    'online doctor',
    'sick certificate',
    'repeat medication online',
    'telehealth doctor',
    'virtual doctor australia',
    'ed treatment online',
    'hair loss treatment online',
  ],
  openGraph: {
    title: 'Online Doctor Australia | Consults, Repeat Rx, Med Certs, ED & Hair Loss | InstantMed',
    description: 'Online doctor consultations, repeat medication & medical certificates from AHPRA-registered Australian GPs. No video calls, 100% online.',
    type: 'website',
    locale: 'en_AU',
    url: 'https://instantmed.com.au',
    siteName: 'InstantMed',
    // OG image handled by app/opengraph-image.tsx convention file
  },
  twitter: {
    card: 'summary_large_image',
    title: 'InstantMed - Online Doctor Australia',
    description: 'Online doctor consultations, repeat medication & medical certificates from AHPRA-registered Australian GPs. No video calls, 100% online.',
    // Twitter image handled by app/opengraph-image.tsx convention file
  },
  alternates: {
    canonical: 'https://instantmed.com.au',
  },
}

// Streamed async component - fetches flags independently so the main page
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
      <MedicalBusinessSchema />
      <FAQSchema faqs={faqSchemaData} />
      <SpeakableSchema
        name="InstantMed - Online Doctor Australia"
        description={`Get medical certificates in under 20 minutes, 24/7. Repeat medication and discreet treatment for ED and hair loss from AHPRA-registered Australian doctors. ${PRICING_DISPLAY.FROM_MED_CERT}.`}
        url="/"
      />

      {/* Client component for hash navigation */}
      <HashScrollHandler />

      {/* Returning patient recognition */}
      <ReturningPatientBanner className="mx-4 mt-2" />

      {/* Resume unfinished intake draft */}
      <IntakeResumeChip className="mx-4 mt-2 max-w-5xl lg:mx-auto" />

      <Navbar variant="marketing" />

      {/* Maintenance banner - streamed independently, doesn't block hero */}
      <Suspense fallback={null}>
        <MaintenanceBanner />
      </Suspense>

      <main className="relative">
        {/* 1. Hero with main value prop */}
        <Hero>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed text-balance">
            A real Australian GP reviews every request. {WEDGE} No appointments, no waiting rooms.
          </p>
        </Hero>

        {/* Lifestyle photo — full-width visual strip between hero and services.
            Acts as a natural scroll break and grounds the above-fold promise
            in a recognisable human moment. Below-fold on all viewports so
            no priority — preloading competed with LCP previously. */}
        <div className="mx-4 sm:mx-6 lg:mx-8 mb-10 sm:mb-14 lg:mb-16">
          <div className="mx-auto max-w-5xl relative aspect-[16/7] sm:aspect-[16/6] rounded-2xl overflow-hidden shadow-lg shadow-primary/[0.06]">
            <Image
              src="/images/home-1.webp"
              alt="Person relaxing at home using their phone to see a doctor online"
              fill
              className="object-cover object-top"
              loading="lazy"
              sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) calc(100vw - 3rem), 960px"
            />
          </div>
        </div>

        {/* 2. Service cards - what we offer */}
        <ServiceCards />

        {/* 3. How it works - muted bg for rhythm */}
        <div className="bg-muted/30 dark:bg-white/[0.02]">
          <HowItWorks />
        </div>

        {/* 4. Social proof */}
        <SocialProofSection />

        {/* 5. FAQs */}
        <FAQSection
          pill="FAQ"
          title="Before you start"
          subtitle="The stuff people actually want to know."
          items={faqItems}
          viewAllHref="/faq"
        />

        {/* 6. Final CTA */}
        <CTABanner
          title="Ready when you are"
          subtitle="Tell us what's going on, a doctor reviews it, and you're sorted. No appointments, no waiting rooms."
          ctaText="Get started"
          ctaHref="/request"
        />
      </main>

      {/* Compliance strip */}
      <ComplianceMarquee />

      {/* 7. Footer */}
      <MarketingFooter />
    </div>
    </MarketingPageShell>
  )
}
