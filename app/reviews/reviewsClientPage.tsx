"use client"

import Link from "next/link"
import Image from "next/image"
import { Star, MapPin, CheckCircle2, Filter, ArrowRight, Shield, Clock, Zap, BadgeCheck } from "lucide-react"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { TiltCard } from "@/components/shared/tilt-card"
import { useState } from "react"
import {
  GlowLine,
  ShimmerButton,
} from "@/components/ui/premium-effects"
import { GridStagger } from "@/components/effects/stagger-container"
import { ParallaxSection } from "@/components/ui/parallax-section"
import { 
  PLATFORM_STATS, 
  getFeaturedTestimonials,
  getReviewsPageTestimonials 
} from "@/lib/data/testimonials"

// Get reviews from centralized data — limited to a curated selection
const reviewsData = getReviewsPageTestimonials().slice(0, 10)
const featuredReviews = getFeaturedTestimonials().slice(0, 3)

// Review item type from centralized data
type ReviewItem = ReturnType<typeof getReviewsPageTestimonials>[number]

function ReviewsGrid({ reviews }: { reviews: ReviewItem[] }) {
  const [filter, setFilter] = useState<string>("All")

  const filteredReviews = filter === "All" ? reviews : reviews.filter((r) => r.service === filter)

  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Generate a consistent color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 
      'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

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

      {/* Reviews grid with GridStagger */}
      <GridStagger columns={2} staggerDelay={0.05} className="grid gap-6 sm:grid-cols-2">
        {filteredReviews.map((review) => (
          <TiltCard
            key={review.id}
            className="dashboard-card rounded-2xl p-6 hover-lift"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`h-4 w-4 ${j < review.rating ? "text-amber-500 fill-amber-500" : "text-gray-200"}`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{review.date}</span>
            </div>

            <p className="text-foreground leading-relaxed mb-5">&ldquo;{review.quote}&rdquo;</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar - Unsplash photo or initials fallback */}
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
          </TiltCard>
        ))}
      </GridStagger>

      {/* Show count */}
      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          Showing {filteredReviews.length} of {reviews.length} reviews
        </p>
      </div>
    </>
  )
}

export function ReviewsClientPageComponent() {
  const avgRating = PLATFORM_STATS.averageRating.toFixed(1)

  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Generate a consistent color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 
      'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-24">
        {/* Hero Section */}
        <ParallaxSection speed={0.2}>
          <section className="relative px-4 py-12 sm:px-6 lg:py-16 overflow-hidden">
            <div className="relative mx-auto max-w-5xl">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-4">
                    <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-foreground/80">Verified Reviews</span>
                  </div>
                  <h1
                    className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Patient Reviews
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-2xl">
                    Real feedback from real Australians. No cherry-picking — just honest experiences.
                  </p>
                </div>

                {/* Rating summary card */}
                <TiltCard className="dashboard-card rounded-2xl p-6 lg:min-w-[300px]">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-primary" style={{ fontFamily: "var(--font-mono)" }}>
                        {avgRating}
                      </p>
                      <div className="flex gap-0.5 mt-1 justify-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < Math.round(Number(avgRating)) ? "text-amber-500 fill-amber-500" : "text-gray-200"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="border-l border-foreground/10 pl-6">
                      <p className="text-sm font-medium text-foreground">Patient</p>
                      <p className="text-sm text-muted-foreground">satisfaction</p>
                    </div>
                  </div>
                </TiltCard>
              </div>
            </div>
          </section>
        </ParallaxSection>

        {/* Trust Badges */}
        <div className="px-4 py-6">
          <div className="mx-auto max-w-5xl flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border/50">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>AHPRA registered doctors</span>
            </div>
            <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border/50">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>~{PLATFORM_STATS.averageResponseMinutes} min avg response</span>
            </div>
            <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border/50">
              <Zap className="w-3.5 h-3.5 text-success" />
              <span className="text-success font-medium">100% refund guarantee</span>
            </div>
          </div>
        </div>

        {/* GlowLine Divider */}
        <div className="max-w-2xl mx-auto px-4">
          <GlowLine />
        </div>

        {/* Featured Reviews Marquee */}
        <ParallaxSection speed={0.15}>
          <section className="px-4 py-12 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-xl font-semibold text-center mb-8" style={{ fontFamily: "var(--font-display)" }}>
                Featured Reviews
              </h2>
              <GridStagger columns={3} staggerDelay={0.08} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredReviews.slice(0, 6).map((review) => (
                  <div
                    key={review.id}
                    className="dashboard-card rounded-xl p-5 border border-primary/20 dark:border-primary/30"
                  >
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      ))}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed mb-4">
                      &ldquo;{review.text}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      {review.image ? (
                        <div className="relative h-9 w-9 rounded-full overflow-hidden ring-2 ring-primary/30">
                          <Image src={review.image} alt={review.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(review.name)}`}>
                          {getInitials(review.name)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium">{review.name}</p>
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground">{review.location}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </GridStagger>
            </div>
          </section>
        </ParallaxSection>

        {/* GlowLine Divider */}
        <div className="max-w-2xl mx-auto px-4">
          <GlowLine />
        </div>

        {/* All Reviews Grid */}
        <ParallaxSection speed={0.1}>
          <section className="px-4 py-12 sm:px-6 lg:py-16">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-xl font-semibold text-center mb-8" style={{ fontFamily: "var(--font-display)" }}>
                All Patient Reviews
              </h2>
              <ReviewsGrid reviews={reviewsData} />
            </div>
          </section>
        </ParallaxSection>

        {/* GlowLine Divider */}
        <div className="max-w-2xl mx-auto px-4">
          <GlowLine />
        </div>

        {/* CTA */}
        <ParallaxSection speed={0.15}>
          <section className="px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <div className="dashboard-card rounded-3xl p-8 lg:p-10">
                <BadgeCheck className="h-10 w-10 text-primary mx-auto mb-4" />
                <h2
                  className="text-2xl font-bold tracking-tight sm:text-3xl mb-4"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Ready to experience it yourself?
                </h2>
                <p className="text-muted-foreground mb-8">
                  Join the Australians who&apos;ve already made the switch to smarter healthcare.
                </p>
                <Link href="/request">
                  <ShimmerButton className="px-8 h-14 font-semibold text-base">
                    Start a request
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </ShimmerButton>
                </Link>
              </div>
            </div>
          </section>
        </ParallaxSection>
      </main>

      <MarketingFooter />
    </div>
  )
}
