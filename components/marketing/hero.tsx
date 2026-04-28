'use client'

import { ArrowRight, Star } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { GoogleAdsCert } from '@/components/marketing/google-ads-cert'
import { LastReviewedSignal } from '@/components/marketing/last-reviewed-signal'
import { LegitScriptSeal } from '@/components/marketing/legitscript-seal'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'

// Hero mockup is decorative below the fold of LCP. ssr:false keeps the
// framer-motion bundle off the critical path. A skeleton placeholder of
// equivalent dimensions prevents CLS while the chunk loads.
const HeroDoctorReviewMockup = dynamic(
  () =>
    import('@/components/marketing/hero-doctor-review-mockup').then((m) => ({
      default: m.HeroDoctorReviewMockup,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="w-[260px] sm:w-[280px] lg:w-[320px] xl:w-[340px] aspect-[4/5] rounded-2xl border border-border/30"
      />
    ),
  },
)

interface CtaConfig {
  text: string
  href: string
  /** Click handler, e.g. for analytics. */
  onClick?: () => void
  /** Optional ref to scroll into view on sticky-bar interactions. */
  ref?: React.RefObject<HTMLDivElement>
}

interface SecondaryCtaConfig {
  text: string
  /** href starting with `#` will smooth-scroll to an in-page anchor. */
  href: string
}

interface HeroProps {
  /**
   * H1 text. Defaults to the home headline. Service pages override with
   * their own positioning line.
   */
  title?: ReactNode
  /**
   * Announcement pill content above the H1. Defaults to the canonical
   * stars + No Medicare + Open now pill. Pass `null` to suppress.
   */
  pill?: ReactNode | null
  /**
   * Subhead body. Pass a <p> so the consumer controls copy verbatim.
   */
  children?: ReactNode
  /**
   * Primary CTA. Defaults to "Get started → /request".
   */
  primaryCta?: CtaConfig
  /**
   * Secondary CTA. Defaults to "How it works → #how-it-works". Pass `null`
   * to render only the primary CTA.
   */
  secondaryCta?: SecondaryCtaConfig | null
  /**
   * Optional content rendered between the subhead and the CTA row. Used by
   * service-page heroes for service-specific reassurance lines, e.g. an
   * employer-acceptance line for medical certificates.
   */
  beforeCta?: ReactNode
  /**
   * Optional mockup override. Pass a custom mockup for service-page heroes.
   * Defaults to `HeroDoctorReviewMockup`. Pass `null` to suppress entirely
   * (rare — usually a service has its own mockup).
   */
  mockup?: ReactNode | null
  /**
   * Optional trust-row override. Defaults to GoogleAdsCert + LegitScript +
   * LastReviewedSignal. Pass `null` to suppress entirely — used by the
   * ServiceFunnelPage shell since it has its own dedicated TrustBadgeSlider
   * directly below the hero.
   */
  trustRow?: ReactNode | null
}

const DEFAULT_PILL = (
  <div className="inline-flex items-center gap-2.5 rounded-full px-3 py-1.5 text-xs font-medium bg-white dark:bg-card border border-border/60 shadow-sm shadow-primary/[0.04]">
    <span
      className="inline-flex items-center gap-0.5 text-amber-400"
      aria-label="5 out of 5 rating"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className="w-3 h-3 fill-current" aria-hidden="true" />
      ))}
    </span>
    <span className="text-border/70" aria-hidden="true">·</span>
    <span className="text-muted-foreground">No Medicare needed</span>
    <span className="text-border/70 hidden sm:inline" aria-hidden="true">·</span>
    <span className="hidden sm:inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
      <span
        className="w-1.5 h-1.5 rounded-full bg-emerald-500"
        style={{ animation: 'pulse 3s ease-in-out infinite' }}
        aria-hidden="true"
      />
      Open now
    </span>
  </div>
)

const DEFAULT_TITLE = 'Consults, certs, and treatment. From your bed.'
const DEFAULT_PRIMARY: CtaConfig = { text: 'Get started', href: '/request' }
const DEFAULT_SECONDARY: SecondaryCtaConfig = { text: 'How it works', href: '#how-it-works' }

const DEFAULT_TRUST_ROW = (
  <>
    <GoogleAdsCert size="sm" />
    <LegitScriptSeal size="sm" />
    <LastReviewedSignal className="ml-1" />
  </>
)

export function Hero({
  title = DEFAULT_TITLE,
  pill,
  children,
  primaryCta = DEFAULT_PRIMARY,
  secondaryCta,
  beforeCta,
  mockup,
  trustRow,
}: HeroProps) {
  const resolvedPill = pill === undefined ? DEFAULT_PILL : pill
  const resolvedSecondary = secondaryCta === undefined ? DEFAULT_SECONDARY : secondaryCta
  const resolvedMockup = mockup === undefined ? <HeroDoctorReviewMockup /> : mockup
  const resolvedTrustRow = trustRow === undefined ? DEFAULT_TRUST_ROW : trustRow

  return (
    // overflow-x-clip (not overflow-hidden) so the mockup's floating cards
    // can extend slightly outside the section without horizontal scrollbars
    // on iOS.
    <section className="relative overflow-x-clip pt-6 pb-12 sm:pt-14 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center lg:items-start lg:gap-12 xl:gap-14">
          {/* ── Text column ───────────────────────────────────────── */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            {/* Announcement pill */}
            {resolvedPill && (
              <div className="hero-availability-enter flex justify-center lg:justify-start mb-5 sm:mb-7">
                {resolvedPill}
              </div>
            )}

            {/* Headline — LCP element. Display scale: 36 / 48 / 60. */}
            <Heading level="display" className="mb-5 sm:mb-7">
              {title}
            </Heading>

            {/* Subhead */}
            <div className="hero-subheadline-enter">
              {children ?? (
                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed text-balance">
                  AHPRA-registered Australian doctors. Reviewed in minutes.
                </p>
              )}
            </div>

            {/* Optional service-specific reassurance line above the CTA. */}
            {beforeCta && <div className="hero-cta-enter mb-6 sm:mb-7">{beforeCta}</div>}

            {/* CTAs */}
            <div
              ref={primaryCta.ref}
              className="hero-cta-enter flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-6 sm:mb-7"
            >
              <Button
                asChild
                size="lg"
                className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                onClick={primaryCta.onClick}
              >
                <Link href={primaryCta.href}>
                  {primaryCta.text}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              {resolvedSecondary && (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 px-8 text-base font-semibold"
                >
                  <Link href={resolvedSecondary.href}>{resolvedSecondary.text}</Link>
                </Button>
              )}
            </div>

            {/* Trust row — Google + LegitScript + live counter. Constant
                across pages so users learn the pattern. ServiceFunnelPage
                consumers pass `trustRow={null}` since they render their
                own TrustBadgeSlider below the hero. */}
            {resolvedTrustRow && (
              <div className="hero-trust-enter flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-2 pt-1">
                {resolvedTrustRow}
              </div>
            )}
          </div>

          {/* ── Mockup column ─────────────────────────────────────── */}
          {resolvedMockup && (
            <div className="relative shrink-0 mt-12 lg:mt-0 self-center">
              {resolvedMockup}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
