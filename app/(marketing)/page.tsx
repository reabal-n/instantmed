import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Suspense } from 'react'

import { Hero } from '@/components/marketing/hero'
import { IntakeResumeChip } from '@/components/marketing/intake-resume-chip'
import { MarketingPageShell } from '@/components/marketing/marketing-page-shell'
import { FAQSchema, MedicalBusinessSchema, SpeakableSchema } from '@/components/seo/healthcare-schema'
import { HashScrollHandler } from '@/components/shared/hash-scroll-handler'
import { Navbar } from '@/components/shared/navbar'
import { ReturningPatientBanner } from '@/components/shared/returning-patient-banner'
import { getWaitState } from '@/lib/brand/wait-counter'
import { PRICING_DISPLAY } from '@/lib/constants'
import { isMaintenanceMode } from '@/lib/feature-flags'
import { faqItems } from '@/lib/marketing/homepage'
import { ICONIC_HOOK, PROP_PHRASE, TAGLINE, WEDGE } from '@/lib/marketing/voice'

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
  () => import('@/components/marketing/marketing-footer').then(m => ({ default: m.MarketingFooter })),
)
// Quiet trust strip between hero and services. Demoted from inside the hero
// composition (was crowding above-the-fold). Renders the four regulatory
// logos (AHPRA, TGA, Medicare) as a single subdued line.
const RegulatoryPartners = dynamic(
  () => import('@/components/marketing/regulatory-partners').then(m => ({ default: m.RegulatoryPartners })),
)

export const revalidate = 3600

// SEO metadata for homepage - critical for Google ranking
// Note: Avoid prescription drug terms (script, prescription) per Google Ads policy for Australia
export const metadata: Metadata = {
  title: { absolute: 'Online Doctor Australia | Consults, Repeat Rx, Med Certs, ED & Hair Loss | InstantMed' },
  description: `Faster than your GP. Telehealth without the small talk. Medical certificates from ${PRICING_DISPLAY.MED_CERT}, repeat medication from ${PRICING_DISPLAY.REPEAT_SCRIPT}, online doctor consults from ${PRICING_DISPLAY.CONSULT}. AHPRA-registered Australian doctors.`,
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
    title: 'Faster than your GP. Telehealth without the small talk. | InstantMed',
    description: 'Start with a secure form that takes about 3 minutes. AHPRA-registered Australian doctors review medical certificates, repeat medication, and online consults.',
    type: 'website',
    locale: 'en_AU',
    url: 'https://instantmed.com.au',
    siteName: 'InstantMed',
    // OG image handled by app/opengraph-image.tsx convention file
  },
  twitter: {
    card: 'summary_large_image',
    title: 'InstantMed | Faster than your GP. Telehealth without the small talk.',
    description: 'Start with a secure form that takes about 3 minutes. AHPRA-registered Australian doctors review every request.',
    // Twitter image handled by app/opengraph-image.tsx convention file
  },
  alternates: {
    canonical: 'https://instantmed.com.au',
  },
}

// Streamed async component - fetches flags independently so the main page
// shell renders immediately without waiting for the DB call.
async function MaintenanceBanner() {
  const maintenance = await isMaintenanceMode()
  if (!maintenance.enabled) return null
  return (
    <div className="mx-4 mt-2 rounded-2xl border border-warning-border bg-warning-light/50 px-4 py-3 flex items-center gap-3">
      <svg className="w-5 h-5 text-warning shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63" />
      </svg>
      <div>
        <p className="text-sm font-medium text-amber-900">We&apos;re currently performing maintenance.</p>
        <p className="text-xs text-warning">{maintenance.message || "New requests will be accepted soon."}</p>
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

  // Live wait-counter state for the hero pill (signature brand device #1).
  // Server-fetched so the pill renders with real data on first paint.
  const waitState = await getWaitState()

  return (
    <MarketingPageShell>
    <div className="min-h-screen overflow-x-hidden">
      {/* SEO Structured Data */}
      <MedicalBusinessSchema />
      <FAQSchema faqs={faqSchemaData} />
      <SpeakableSchema
        name="InstantMed - Online Doctor Australia"
        description={`Start with a secure clinical form. AHPRA-registered Australian doctors review medical certificates, repeat medication, and discreet treatment requests. ${PRICING_DISPLAY.FROM_MED_CERT}.`}
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
        {/* 1. Hero with main value prop.
            New brand stack (locked 2026-04-29 in docs/BRAND.md §4):
              H1 = TAGLINE ("Faster than your GP.")
              H2 = PROP_PHRASE ("Telehealth without the small talk.")
              reassurance above CTA = ICONIC_HOOK in calm foreground tone
              subhead body = AHPRA reassurance + WEDGE
        */}
        <Hero
          title={TAGLINE}
          liveWait={waitState}
          beforeCta={
            <p className="text-sm sm:text-base font-medium text-foreground/70 tracking-tight">
              {ICONIC_HOOK}
            </p>
          }
        >
          <h2 className="font-display text-2xl sm:text-3xl lg:text-[2.5rem] text-foreground/85 max-w-xl mx-auto lg:mx-0 mb-6 leading-tight font-semibold tracking-tight">
            {PROP_PHRASE}
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed text-balance">
            AHPRA-registered Australian doctors. Secure form-first review. {WEDGE}
          </p>
        </Hero>

        {/* Quiet regulatory strip — demoted from hero. One subtle line,
            grayscale logos, low visual weight. Honest signal without crowding
            the above-fold composition. */}
        <RegulatoryPartners className="border-t border-b border-border/30 bg-muted/20 dark:bg-white/[0.02]" />

        {/* 2. Service cards - what we offer */}
        <ServiceCards />

        {/* Editorial lifestyle photo, primary. Quiet visual break between
            the dense service grid and the "how it works" rhythm. */}
        <section aria-hidden="true" className="py-10 sm:py-14">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border/40 shadow-md shadow-primary/[0.06]">
              <Image
                src="/images/home-1.webp"
                alt="Patient at home reviewing their care on a phone"
                fill
                className="object-cover"
                loading="lazy"
                sizes="(max-width: 1024px) calc(100vw - 4rem), 768px"
              />
            </div>
          </div>
        </section>

        {/* 3. How it works - muted bg for rhythm */}
        <div className="bg-muted/30 dark:bg-white/[0.02]">
          <HowItWorks />
        </div>

        {/* Editorial lifestyle photo, secondary. A calm trust beat before
            the FAQ block. */}
        <section aria-hidden="true" className="py-10 sm:py-14">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border/40 shadow-md shadow-primary/[0.06]">
              <Image
                src="/images/home-2.webp"
                alt="Australian home setting with daylight, suggesting unhurried care"
                fill
                className="object-cover"
                loading="lazy"
                sizes="(max-width: 1024px) calc(100vw - 4rem), 768px"
              />
            </div>
          </div>
        </section>

        {/* 4. FAQs */}
        <FAQSection
          pill="FAQ"
          title="Before you start"
          subtitle="The stuff people actually want to know."
          items={faqItems}
          viewAllHref="/faq"
        />

        {/* Editorial lifestyle photo, closing. Sits between the FAQ block
            and the final CTA so the page closes on a human note. */}
        <section aria-hidden="true" className="pb-2 sm:pb-4">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border/40 shadow-md shadow-primary/[0.06]">
              <Image
                src="/images/home-3.webp"
                alt="Lived-in Australian interior on a sunlit morning"
                fill
                className="object-cover"
                loading="lazy"
                sizes="(max-width: 1024px) calc(100vw - 4rem), 768px"
              />
            </div>
          </div>
        </section>

        {/* 5. Final CTA */}
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
