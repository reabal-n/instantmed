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

interface HeroProps {
  /** Subhead body. Pass a <p> so the home page can interpolate WEDGE etc. */
  children?: ReactNode
  /**
   * Optional mockup override. Pass a custom mockup for service-page heroes.
   * Defaults to the home `HeroDoctorReviewMockup`.
   */
  mockup?: ReactNode
}

export function Hero({ children, mockup }: HeroProps) {
  return (
    // overflow-x-clip (not overflow-hidden) so the mockup's floating cards
    // can extend slightly outside the section without horizontal scrollbars
    // on iOS.
    <section className="relative overflow-x-clip pt-6 pb-12 sm:pt-14 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center lg:items-start lg:gap-12 xl:gap-14">
          {/* ── Text column ───────────────────────────────────────── */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            {/* Announcement pill: stars + value prop + live availability.
                CSS animation-only — no JS hydration cost above the fold. */}
            <div className="hero-availability-enter flex justify-center lg:justify-start mb-5 sm:mb-7">
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
            </div>

            {/* Headline — LCP element. <Heading level="display"> hits 48px @ sm
                and 60px @ lg, weight 300, tracking -0.03em per spec. No
                animation, no opacity gate — Chrome measures LCP from SSR HTML. */}
            <Heading level="display" className="mb-5 sm:mb-7">
              Consults, certs, and treatment. From your bed.
            </Heading>

            {/* Subhead — server-rendered when passed as children. */}
            <div className="hero-subheadline-enter">
              {children ?? (
                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed text-balance">
                  AHPRA-registered Australian doctors. Reviewed in minutes.
                </p>
              )}
            </div>

            {/* CTAs */}
            <div className="hero-cta-enter flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-6 sm:mb-7">
              <Button
                asChild
                size="lg"
                className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                <Link href="/request">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base font-semibold"
              >
                <Link href="#how-it-works">How it works</Link>
              </Button>
            </div>

            {/* Trust row — Google + LegitScript + live counter.
                Wraps gracefully on mobile via flex-wrap. */}
            <div className="hero-trust-enter flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-2 pt-1">
              <GoogleAdsCert size="sm" />
              <LegitScriptSeal size="sm" />
              <LastReviewedSignal className="ml-1" />
            </div>
          </div>

          {/* ── Mockup column ─────────────────────────────────────── */}
          <div className="relative shrink-0 mt-12 lg:mt-0 self-center">
            {mockup ?? <HeroDoctorReviewMockup />}
          </div>
        </div>
      </div>
    </section>
  )
}
