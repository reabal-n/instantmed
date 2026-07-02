'use client'

import { ArrowRight, Star } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { GoogleAdsCert } from '@/components/marketing/google-ads-cert'
import { GoogleReviewsBadge } from '@/components/marketing/google-reviews-badge'
import { HeroDoctorReviewMockup } from '@/components/marketing/hero-doctor-review-mockup'
import { LastReviewedSignal } from '@/components/marketing/last-reviewed-signal'
import { LegitScriptSeal } from '@/components/marketing/legitscript-seal'
import { WaitCounter } from '@/components/marketing/wait-counter'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'
import type { WaitState } from '@/lib/brand/wait-counter'
import { GUARANTEE, ICONIC_HOOK } from '@/lib/marketing/voice'

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
   * stars + doctor-review + Open now pill. Pass `null` to suppress.
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
   * LastReviewedSignal. Pass `null` to suppress entirely when a page renders
   * its own trust badges directly below the hero.
   */
  trustRow?: ReactNode | null
  /**
   * Optional live wait-counter state (signature brand device #1, see
   * docs/BRAND.md §6.1). When provided, the default pill swaps the static
   * "Open now" beat for the WaitCounter device. When omitted, the pill
   * keeps the existing "Open now" indicator (back-compat for other heroes).
   */
  liveWait?: WaitState
}

const DEFAULT_OPEN_NOW = (
  <span className="hidden sm:inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
    <span
      className="w-1.5 h-1.5 rounded-full bg-emerald-500"
      style={{ animation: 'pulse 3s ease-in-out infinite' }}
      aria-hidden="true"
    />
    Open now
  </span>
)

function buildDefaultPill(liveWait?: WaitState) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full px-3 py-1.5 text-xs font-medium bg-white dark:bg-card border border-border/60 shadow-sm shadow-primary/[0.04]">
      <span
        className="inline-flex items-center gap-0.5 text-amber-400"
        role="img"
        aria-label="Google star rating"
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className="w-3 h-3 fill-current" aria-hidden="true" />
        ))}
      </span>
      <span className="text-border/70" aria-hidden="true">·</span>
      <span className="text-muted-foreground">AHPRA-registered doctors</span>
      <span className="text-border/70 hidden sm:inline" aria-hidden="true">·</span>
      {liveWait ? (
        <span className="hidden sm:inline-flex">
          <WaitCounter state={liveWait} variant="inline" />
        </span>
      ) : (
        DEFAULT_OPEN_NOW
      )}
    </div>
  )
}

const DEFAULT_TITLE = 'Consults, certs, and treatment. From your bed.'
const DEFAULT_PRIMARY: CtaConfig = { text: 'Get started', href: '/request' }
const DEFAULT_SECONDARY: SecondaryCtaConfig = { text: 'How it works', href: '#how-it-works' }

// LastReviewedSignal moved out of the trust row and pulled up directly
// under the primary CTA (see the markup below). Operators surfaced in
// the 2026-05-26 video reviews that the "Last reviewed X min ago"
// reassurance was stranded at the bottom of the trust row, far from the
// click moment. Reading it AS the user is deciding to act delivers the
// reassurance at the right beat.
const DEFAULT_TRUST_ROW = (
  <>
    <GoogleAdsCert size="sm" />
    <GoogleReviewsBadge />
    <LegitScriptSeal size="sm" />
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
  liveWait,
}: HeroProps) {
  const resolvedPill = pill === undefined ? buildDefaultPill(liveWait) : pill
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

            <div
              className="hero-availability-enter mb-4 flex justify-center lg:justify-start"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-brand-coral" />
            </div>

            {/* Headline (LCP element). Display scale: 36 / 48 / 60.
                min-height locks the headline slot at the typical 2-line
                wrap (mobile) so font-load swap can't reflow the page on
                first paint. With display:optional on Plus Jakarta this
                rarely matters, but the floor keeps CLS at zero even if
                the fallback metrics drift. Tier 1 video-review fix
                2026-05-26 (homepage-5jc7 / clkf / l0yn). */}
            <Heading
              level="display"
              className="mb-5 sm:mb-7 min-h-[5rem] sm:min-h-[6.5rem] lg:min-h-[8rem]"
            >
              {title}
            </Heading>

            {/* Subhead */}
            <div className="hero-subheadline-enter">
              {children ?? (
                <p className="text-sm sm:text-base lg:text-lg leading-[1.5rem] sm:leading-relaxed text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 text-balance">
                  {/*
                    nowrap span on "AHPRA-registered" so the hyphen can't break
                    mid-word on narrow viewports. Tier 1 review 2026-05-25
                    (/medical-certificate #3): "the most important credential
                    breaks mid-word".
                  */}
                  <span className="whitespace-nowrap">AHPRA-registered</span> Australian doctors. Secure form-first review.
                </p>
              )}
            </div>

            {/* Optional service-specific reassurance line above the CTA. */}
            {beforeCta && <div className="hero-cta-enter mb-6 sm:mb-7">{beforeCta}</div>}

            {/* CTAs — primary button leads, secondary demoted to ghost so
                it stops competing for the click (2026-05-25 video-review fix). */}
            <div
              ref={primaryCta.ref}
              className="hero-cta-enter flex flex-col sm:flex-row sm:items-center gap-2 justify-center lg:justify-start mb-3 sm:mb-4"
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
                  variant="ghost"
                  size="lg"
                  className="h-12 px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <Link href={resolvedSecondary.href}>{resolvedSecondary.text}</Link>
                </Button>
              )}
            </div>

            {/* Reassurance row under the CTA. Price/refund promise plus
                the live "Last reviewed N min ago" signal both sit at the
                decision moment, so the patient sees recency proof exactly
                as they're about to click. The signal was previously
                stranded at the end of the trust row, which buried it.
                Tier 1 video-review fix 2026-05-26 (homepage-clkf). */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-3 gap-y-1 mb-6 sm:mb-7 justify-center lg:justify-start">
              <p className="text-xs text-muted-foreground text-center lg:text-left">
                {ICONIC_HOOK} {GUARANTEE}
              </p>
              <LastReviewedSignal className="justify-center lg:justify-start" />
            </div>

            {/* Trust row: Google + LegitScript. Constant across pages so
                users learn the pattern. Pages with their own trust badges
                below the hero pass `trustRow={null}`. */}
            {resolvedTrustRow && (
              // items-center + a 40px cap on every direct child keeps all
              // three trust marks (GoogleAdsCert, GoogleReviewsBadge,
              // LegitScript) on one optical baseline. LegitScript was the
              // outlier before (its native seal is 79px tall, vs ~36-37px
              // for the two pills). Tier 1 review 2026-05-25
              // (/erectile-dysfunction #1) flagged "different heights
              // breaking the line of the CTA". The [&>*]:max-h-10 selector
              // applies whether a consumer passes the default trust row
              // or their own list of marks.
              <div className="hero-trust-enter flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-2 pt-1 min-h-10 [&>*]:max-h-10">
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
