"use client"

import { Clock, Shield, Star, Zap } from "lucide-react"

import { CenteredHero } from "@/components/heroes"
import { GoogleReviewsBadge } from "@/components/marketing/google-reviews-badge"
import { AnimatedDonutChart, InformationalPageShell } from "@/components/marketing/shared"
import { CTABanner, LogoBadgeStrip } from "@/components/sections"
import { SectionPill } from "@/components/ui/section-pill"
import { GOOGLE_REVIEW_URL } from "@/lib/constants"
import { getPatientCount, GOOGLE_REVIEWS, SOCIAL_PROOF } from "@/lib/social-proof"

const REVIEWS_CONFIG = {
  analyticsId: "reviews" as const,
  sticky: false as const,
}

export function ReviewsClientPageComponent() {
  const reviewCount = GOOGLE_REVIEWS.count
  const rating = GOOGLE_REVIEWS.rating

  return (
    <InformationalPageShell config={REVIEWS_CONFIG}>
      {() => (
        <>
          <CenteredHero
            pill="Verified reviews"
            title="What patients say"
            subtitle="Verified Google reviews from real Australians. We don't curate, edit, or seed reviews."
          >
            <div className="flex flex-col items-center gap-4">
              <GoogleReviewsBadge />
              <p className="text-sm text-muted-foreground">
                {rating.toFixed(1)} of 5 across {reviewCount} verified Google {reviewCount === 1 ? "review" : "reviews"}
              </p>
            </div>
          </CenteredHero>

          <LogoBadgeStrip
            badges={[
              { icon: <Shield className="w-3.5 h-3.5" />, label: "AHPRA-registered doctors" },
              { icon: <Clock className="w-3.5 h-3.5" />, label: "Doctor-reviewed requests" },
              { icon: <Zap className="w-3.5 h-3.5 text-success" />, label: "100% refund guarantee" },
            ]}
          />

          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <section className="py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-3xl">
                <div className="text-center mb-8">
                  <SectionPill>Service quality</SectionPill>
                </div>
                <div className="grid sm:grid-cols-2 gap-8 items-center">
                  <div className="flex justify-center">
                    <AnimatedDonutChart
                      value={SOCIAL_PROOF.certApprovalPercent}
                      label="Request approval rate"
                      size={140}
                      strokeWidth={12}
                    />
                  </div>
                  <div className="rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none p-6 space-y-4">
                    <div>
                      <p className="text-2xl font-semibold text-foreground tabular-nums">
                        {getPatientCount().toLocaleString()}+
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Australians helped</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground tabular-nums">
                        {SOCIAL_PROOF.refundPercent}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Refund if declined</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">
                        AHPRA
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Registered doctors</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="px-4 py-12 sm:px-6 lg:py-16">
            <div className="mx-auto max-w-2xl text-center">
              <SectionPill>Read our reviews</SectionPill>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mt-3 mb-2">
                See every verified review on Google
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                We don&apos;t republish reviews on this page. They live where patients left them, on our verified Google Business Profile.
              </p>
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-[transform,box-shadow]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Read reviews on Google
              </a>
            </div>
          </section>

          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <section className="px-4 py-12 sm:px-6">
              <div className="mx-auto max-w-xl text-center">
                <div className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none p-6 sm:p-8">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Star className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    Used InstantMed?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your honest review helps other Australians find reliable telehealth. It takes 30 seconds.
                  </p>
                  <a
                    href={GOOGLE_REVIEW_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-[transform,box-shadow]"
                  >
                    Leave a Google review
                  </a>
                </div>
              </div>
            </section>
          </div>

          <CTABanner
            title="Ready to experience it yourself?"
            subtitle={`Join ${getPatientCount().toLocaleString()}+ Australians who've already made the switch to smarter healthcare.`}
            ctaText="Start a request"
            ctaHref="/request"
          />
        </>
      )}
    </InformationalPageShell>
  )
}
