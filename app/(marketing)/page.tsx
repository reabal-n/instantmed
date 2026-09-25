import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

import { Hero } from '@/components/marketing/hero'
import { HeroDoctorReviewMockup } from '@/components/marketing/hero-doctor-review-mockup'
import { HomeClientControls } from '@/components/marketing/home-client-controls'
import { IntakeResumeChip } from '@/components/marketing/intake-resume-chip'
import { MarketingPageShell } from '@/components/marketing/marketing-page-shell'
import { PortfolioRouteMap } from '@/components/marketing/portfolio-route-map'
import { FAQSchema, MedicalBusinessSchema, SpeakableSchema } from '@/components/seo/healthcare-schema'
import { HashScrollHandler } from '@/components/shared/hash-scroll-handler'
import { Navbar } from '@/components/shared/navbar'
import { ReturningPatientBanner } from '@/components/shared/returning-patient-banner'
import { getWaitState } from '@/lib/brand/wait-counter'
import { PRICING_DISPLAY } from '@/lib/constants'
import { isMaintenanceMode } from '@/lib/feature-flags'
import { homeH1Font } from '@/lib/fonts/home-h1'
import { getApprovedClaim } from '@/lib/marketing/approved-claims'
import { HOME_HERO_CTA_ID } from '@/lib/marketing/home-anchors'
import { faqItems } from '@/lib/marketing/homepage'
import { TAGLINE } from '@/lib/marketing/voice'
import { DEFAULT_SOCIAL_IMAGE } from "@/lib/seo/social-image"

// All below-fold sections are lazy-loaded to keep framer-motion and client
// component bundles out of the critical JS path. SSR:true (default) keeps
// full HTML in the initial response for SEO and CLS stability.
const CTABanner = dynamic(
  () => import('@/components/sections/cta-banner').then(m => ({ default: m.CTABanner })),
)
const FAQSection = dynamic(
  () => import('@/components/sections/faq-section').then(m => ({ default: m.FAQSection })),
)
const HowItWorksInline = dynamic(
  () => import('@/components/marketing/sections/how-it-works-inline').then(m => ({ default: m.HowItWorksInline })),
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
  title: { absolute: 'Online Doctor Australia | Med Certs, Repeat Rx & Focused Assessments | InstantMed' },
  description: `Faster than your GP. Telehealth without the small talk. Medical certificates from ${PRICING_DISPLAY.MED_CERT}, repeat medication from ${PRICING_DISPLAY.REPEAT_SCRIPT}, and focused ED, hair loss, and women's health assessments from ${PRICING_DISPLAY.CONSULT}. AHPRA-registered Australian doctors.`,
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
    images: [DEFAULT_SOCIAL_IMAGE],
    title: 'Faster than your GP. Telehealth without the small talk. | InstantMed',
    description: "Start with a secure form that takes about 3 minutes. AHPRA-registered Australian doctors review medical certificates, repeat medication, and focused ED, hair loss, and women's health assessments.",
    type: 'website',
    locale: 'en_AU',
    url: 'https://instantmed.com.au',
    siteName: 'InstantMed',
  },
  twitter: {
    images: [DEFAULT_SOCIAL_IMAGE],
    card: 'summary_large_image',
    title: 'InstantMed | Faster than your GP. Telehealth without the small talk.',
    description: 'Start with a secure form that takes about 3 minutes. AHPRA-registered Australian doctors review every request.',
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
        <p className="text-sm text-warning">{maintenance.message || "New requests will be accepted soon."}</p>
      </div>
    </div>
  )
}

// Accent the tagline's closing phrase; fall back to the plain claim if the approved wording changes.
const TAGLINE_ACCENT = ' your GP.'
const HOME_HERO_TITLE = TAGLINE.endsWith(TAGLINE_ACCENT)
  ? <>{TAGLINE.slice(0, -TAGLINE_ACCENT.length)} <span className="text-primary">{TAGLINE_ACCENT.trim()}</span></>
  : TAGLINE

const HOME_HOW_IT_WORKS_STEPS = [
  {
    sticker: 'medical-history' as const,
    step: 1,
    title: 'Fill in a short form',
    description: 'Tell us what you need and answer the safety questions. Each service page shows how long its form takes.',
    time: 'A few minutes',
  },
  {
    sticker: 'stethoscope' as const,
    step: 2,
    title: 'Clinical review',
    description: getApprovedClaim('clinical_review_sequence'),
    time: 'Reviewed 24/7',
  },
  {
    sticker: 'certificate' as const,
    step: 3,
    title: 'If approved, certificate to your inbox or eScript to your phone',
    description: 'Delivery is digital and only follows a clinical decision. Every certificate carries a reference your employer can check at instantmed.com.au/verify.',
    time: 'Digital delivery',
  },
]

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
      <div className="min-h-screen overflow-x-hidden pt-[calc(5rem+env(safe-area-inset-top))]">
        <HomeClientControls />

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
          {/* Hero owns the first-fold action and states the service boundary. */}
          <Hero
            className="pt-6 pb-6 sm:pt-6 sm:pb-12 lg:pt-6 lg:pb-10"
            title={HOME_HERO_TITLE}
            titleClassName={`${homeH1Font.className} min-h-0 sm:min-h-0 lg:min-h-0 mb-4 sm:mb-5`}
            liveWait={waitState}
            timingServiceId="med-cert"
            primaryCta={{ text: "Get started", href: "/request", wrapperId: HOME_HERO_CTA_ID, dataAttributes: { "data-home-cta": "hero" } }}
            secondaryCta={null}
            mockup={<HeroDoctorReviewMockup />}
            mockupClassName="max-w-sm lg:max-w-md"
          >
            <p className="text-base lg:text-lg text-muted-foreground max-w-xl mb-6 sm:mb-8 leading-relaxed text-balance">
              Medical certificates, repeat prescriptions and doctor assessments for Australian
              adults 18+. AHPRA-registered doctors. From {PRICING_DISPLAY.MED_CERT} AUD.
            </p>
          </Hero>

          {/* Card-based service chooser: common requests first, then the specialty assessments. */}
          <PortfolioRouteMap />

          <HowItWorksInline
            steps={HOME_HOW_IT_WORKS_STEPS}
            ctaHref="/request"
            ctaText="Get started"
            ctaDataAttributes={{ "data-home-cta": "how_it_works" }}
            heading="How it works"
            subheading="One secure form, one clinical decision, the result to your inbox or phone."
          />

          <FAQSection
            pill="FAQ"
            title="Before you start"
            subtitle="The stuff people actually want to know."
            items={faqItems}
            viewAllHref="/faq"
          />

          <CTABanner
            title="Ready when you are"
            subtitle="Tell us what's going on, a doctor reviews it, and you're sorted. No appointments, no waiting rooms."
            ctaText="Get started"
            ctaHref="/request"
          />

          <RegulatoryPartners className="border-t border-b border-border/30 bg-muted/20 dark:bg-white/[0.02]" />

          {/* Active service links already render in the server-owned route map. */}
        </main>

        <MarketingFooter />
      </div>
    </MarketingPageShell>
  )
}
