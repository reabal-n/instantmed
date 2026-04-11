import { Suspense } from 'react'
import type { Metadata } from 'next'
import { cn } from '@/lib/utils'
import {
  Hero,
  HowItWorks,
  MarketingFooter,
} from '@/components/marketing'
import { Navbar } from '@/components/shared/navbar'
import { HashScrollHandler } from '@/components/shared/hash-scroll-handler'
import { FAQSchema, SpeakableSchema } from '@/components/seo/healthcare-schema'
import { faqItems } from '@/lib/marketing/homepage'
import { ReturningPatientBanner } from '@/components/shared/returning-patient-banner'
import { getFeatureFlags } from '@/lib/feature-flags'
import { CTABanner } from '@/components/sections'
import { AccordionSection } from '@/components/sections'
import { MarketingPageShell } from '@/components/shared/marketing-page-shell'
import { AfterHoursMedCertBanner } from '@/components/shared/after-hours-med-cert-banner'
import { ServiceCards } from '@/components/marketing/service-cards'
import { SocialProofSection } from '@/components/marketing/social-proof-section'
import { EmployerLogoMarquee } from '@/components/shared/employer-logo-marquee'

export const revalidate = 3600

// SEO metadata for homepage - critical for Google ranking
// Note: Avoid prescription drug terms (script, prescription) per Google Ads policy for Australia
export const metadata: Metadata = {
  title: { absolute: 'Online Doctor Australia | Med Certs, ED & Hair Loss | InstantMed' },
  description: 'Medical certificates from $19.95 in under 30 minutes. Repeat medication from $29.95. Discreet ED and hair loss treatment from $49.95. AHPRA-registered Australian doctors, 100% online.',
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
    title: 'Online Doctor Australia | Med Certs, ED & Hair Loss | InstantMed',
    description: 'Medical certificates in under 30 minutes, 24/7. Discreet ED and hair loss treatment reviewed by AHPRA-registered Australian doctors.',
    type: 'website',
    locale: 'en_AU',
    url: 'https://instantmed.com.au',
    siteName: 'InstantMed',
    // OG image handled by app/opengraph-image.tsx convention file
  },
  twitter: {
    card: 'summary_large_image',
    title: 'InstantMed - Online Doctor Australia',
    description: 'Medical certificates in under 30 minutes, 24/7. Discreet ED and hair loss treatment reviewed by AHPRA-registered Australian doctors.',
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
        description="Get medical certificates in under 30 minutes, 24/7. Repeat medication and discreet treatment for ED and hair loss from AHPRA-registered Australian doctors. From $19.95."
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
        {/* 1. Hero with main value prop */}
        <Hero>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed text-balance">
            Real Australian doctors review every request — medical certificates, repeat scripts, and discreet treatment for ED and hair loss. No appointments, no waiting rooms.
          </p>
        </Hero>

        {/* 2. Service cards — what we offer */}
        <ServiceCards />

        {/* 2b. Employer logo marquee — trust signal */}
        <EmployerLogoMarquee className="border-y border-border/30 dark:border-white/10 bg-muted/20 py-8" />

        {/* 3. How it works — 3 steps */}
        <Suspense fallback={<SectionSkeleton />}>
          <HowItWorks />
        </Suspense>

        {/* 4. Social proof — reviews, doctor credibility, stats */}
        <SocialProofSection />

        {/* 5. FAQs */}
        <AccordionSection
          id="faq"
          pill="FAQ"
          title="Common questions"
          subtitle="Everything you need to know about our service."
          groups={faqGroups}
        />

        {/* 6. Final CTA */}
        <CTABanner
          title="Ready when you are"
          subtitle="Tell us what's going on, a doctor reviews it, and you're sorted. No appointments, no waiting rooms."
          ctaText="Get started"
          ctaHref="/request"
        />
      </main>

      {/* 7. Footer */}
      <MarketingFooter />
    </div>
    </MarketingPageShell>
  )
}
