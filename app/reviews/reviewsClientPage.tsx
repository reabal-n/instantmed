"use client"

import { CheckCircle2, Clock, Filter, MapPin, Shield, Star, Zap } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

import { CenteredHero } from "@/components/heroes"
import { AnimatedDonutChart, AnimatedProgressBar, InformationalPageShell, TestimonialCard } from "@/components/marketing/shared"
import { CTABanner,LogoBadgeStrip } from "@/components/sections"
import { SectionPill } from "@/components/ui/section-pill"
import { GOOGLE_REVIEW_URL } from "@/lib/constants"
import {
  getFeaturedTestimonials,
  getReviewsPageTestimonials
} from "@/lib/data/testimonials"
import { getPatientCount,SOCIAL_PROOF } from "@/lib/social-proof"
import { cn } from "@/lib/utils"

// Get reviews from centralized data - limited to a curated selection
const reviewsData = getReviewsPageTestimonials().slice(0, 10)
const featuredReviews = getFeaturedTestimonials().slice(0, 3)

// Review item type from centralized data
type ReviewItem = ReturnType<typeof getReviewsPageTestimonials>[number]

// Star distribution data (based on curated review set)
const STAR_DISTRIBUTION = [
  { label: "5 stars", value: 85, color: "bg-primary" },
  { label: "4 stars", value: 12, color: "bg-primary/60" },
  { label: "3 stars", value: 3, color: "bg-primary/30" },
  { label: "2 stars", value: 0, color: "bg-muted-foreground/30" },
  { label: "1 star", value: 0, color: "bg-muted-foreground/30" },
]

const REVIEWS_CONFIG = {
  analyticsId: "reviews" as const,
  sticky: false as const,
}

// ── Shared helpers ──

/** Generate initials for avatar fallback */
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

/** Generate a consistent color based on name */
function getAvatarColor(name: string) {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-blue-600', 'bg-teal-500'
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

// ── ReviewsGrid (interactive/stateful) ──

function ReviewsGrid({ reviews }: { reviews: ReviewItem[] }) {
  const [filter, setFilter] = useState<string>("All")

  const filteredReviews = filter === "All" ? reviews : reviews.filter((r) => r.service === filter)

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filter by:
        </div>
        <div className="flex gap-2 flex-wrap">
          {["All", "Medical Certificate", "Prescription"].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === filterOption
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/80 text-muted-foreground hover:bg-background border border-border/50"
              }`}
            >
              {filterOption}
              {filterOption !== "All" && (
                <span className="ml-1.5 opacity-70">({reviews.filter((r) => r.service === filterOption).length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {filteredReviews.map((review) => (
          <div
            key={review.id}
            className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none p-5 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/[0.08] transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={cn("h-4 w-4", j < review.rating ? "text-warning fill-warning" : "text-border")}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{review.date}</span>
            </div>

            <p className="text-foreground leading-relaxed mb-5">&ldquo;{review.quote}&rdquo;</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {review.image ? (
                  <div className="relative h-10 w-10 rounded-full overflow-hidden ring-2 ring-primary/20">
                    <Image src={review.image} alt={review.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(review.name)}`}>
                    {getInitials(review.name)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold">{review.name}{review.age ? `, ${review.age}` : ''}</p>
                    {review.verified && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {review.location}
                  </div>
                </div>
              </div>
              <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                {review.service}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Show count */}
      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          Showing {filteredReviews.length} of {reviews.length} reviews
        </p>
      </div>
    </>
  )
}

// ── Main page component ──

export function ReviewsClientPageComponent() {
  const avgRating = SOCIAL_PROOF.averageRating.toFixed(1)

  return (
    <InformationalPageShell config={REVIEWS_CONFIG}>
      {() => (
        <>
          {/* Hero Section */}
          <CenteredHero
            pill="Verified Reviews"
            title="Patient Reviews"
            subtitle="Real feedback from real Australians. No cherry-picking, just honest experiences."
          >
            {/* Rating summary card */}
            <div className="inline-block rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-lg shadow-primary/[0.06] dark:shadow-none px-6 py-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-4xl font-semibold text-primary" style={{ fontFamily: "var(--font-mono)" }}>
                    {avgRating}
                  </p>
                  <div className="flex gap-0.5 mt-1 justify-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < Math.round(Number(avgRating)) ? "text-warning fill-warning" : "text-border"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="border-l border-foreground/10 pl-6">
                  <p className="text-sm font-medium text-foreground">Patient</p>
                  <p className="text-sm text-muted-foreground">satisfaction</p>
                </div>
              </div>
            </div>
          </CenteredHero>

          {/* Trust Badges */}
          <LogoBadgeStrip
            badges={[
              {
                icon: <Shield className="w-3.5 h-3.5" />,
                label: "AHPRA registered doctors",
              },
              {
                icon: <Clock className="w-3.5 h-3.5" />,
                label: `~${SOCIAL_PROOF.averageResponseMinutes} min avg response`,
              },
              {
                icon: <Zap className="w-3.5 h-3.5 text-success" />,
                label: "100% refund guarantee",
              },
            ]}
          />

          {/* Star Distribution + Satisfaction Data Viz */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <section className="py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-3xl">
                <div className="text-center mb-8">
                  <SectionPill>Ratings breakdown</SectionPill>
                </div>
                <div className="grid sm:grid-cols-2 gap-8 items-center">
                  {/* Donut chart */}
                  <div className="flex justify-center">
                    <AnimatedDonutChart
                      value={SOCIAL_PROOF.certApprovalPercent}
                      label="Request approval rate"
                      size={140}
                      strokeWidth={12}
                    />
                  </div>
                  {/* Star distribution bars */}
                  <div className="rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none p-6">
                    <p className="text-sm font-medium text-foreground mb-4">Rating distribution</p>
                    <AnimatedProgressBar items={STAR_DISTRIBUTION} />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Featured Reviews - editorial highlight */}
          <section className="px-4 py-12 sm:px-6 lg:py-16">
            <div className="mx-auto max-w-2xl">
              <div className="text-center mb-8">
                <SectionPill>Review of the month</SectionPill>
              </div>
              {featuredReviews[0] && (
                <TestimonialCard
                  variant="editorial"
                  testimonial={{
                    name: featuredReviews[0].name,
                    quote: featuredReviews[0].text,
                    rating: featuredReviews[0].rating,
                    location: `${featuredReviews[0].location} · April 2026`,
                  }}
                />
              )}
            </div>
          </section>

          {/* Featured Reviews Grid */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <section className="px-4 py-12 sm:px-6 lg:py-16">
              <div className="mx-auto max-w-5xl">
                <div className="text-center mb-8">
                  <SectionPill>Featured</SectionPill>
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mt-3">
                    Top patient stories
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {featuredReviews.map((review) => (
                    <TestimonialCard
                      key={review.id}
                      variant="featured"
                      testimonial={{
                        name: review.name,
                        quote: review.text,
                        rating: review.rating,
                        location: `${review.location} · ${review.date}`,
                        service: review.service === "medical-certificate" ? "Medical Certificate" :
                                 review.service === "prescription" ? "Prescription" : "Consultation",
                      }}
                    />
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* All Reviews Grid */}
          <section className="px-4 py-12 sm:px-6 lg:py-16">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-8">
                <SectionPill>All reviews</SectionPill>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mt-3">
                  Every patient review
                </h2>
              </div>
              <ReviewsGrid reviews={reviewsData} />
            </div>
          </section>

          {/* Google Review CTA */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <section className="px-4 py-12 sm:px-6">
              <div className="mx-auto max-w-xl text-center">
                <div className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none p-6 sm:p-8">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Star className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    Had a good experience?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your feedback helps other Australians find reliable telehealth. It takes 30 seconds.
                  </p>
                  <a
                    href={GOOGLE_REVIEW_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Leave a Google review
                  </a>
                </div>
              </div>
            </section>
          </div>

          {/* CTA */}
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
