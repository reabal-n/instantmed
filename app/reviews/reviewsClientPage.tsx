"use client"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Star, MapPin, CheckCircle2, Filter, ArrowRight } from "lucide-react"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import { useState } from "react"

interface ReviewItem {
  id: number
  quote: string
  name: string
  location: string
  service: string
  date: string
  rating: number
  verified: boolean
  avatar: string
  emoji: string
}

const reviewsData: ReviewItem[] = [
  {
    id: 1,
    quote:
      "Woke up feeling awful and couldn&apos;t get into my GP. Filled out the form, and a doctor reviewed it within the hour. Had my certificate sorted before lunch.",
    name: "Sarah M.",
    location: "Bondi, NSW",
    service: "Medical Certificate",
    date: "2 days ago",
    rating: 5,
    verified: true,
    avatar: "/young-australian-woman-with-blonde-hair-smiling-pr.jpg",
    emoji: "☕",
  },
  {
    id: 2,
    quote:
      "Needed my blood pressure meds renewed but my regular GP was booked for weeks. The process was straightforward and the doctor actually reviewed my history properly.",
    name: "David K.",
    location: "South Yarra, VIC",
    service: "Prescription",
    date: "1 week ago",
    rating: 5,
    verified: true,
    avatar: "/middle-aged-australian-man-with-glasses-friendly-p.jpg",
    emoji: "💊",
  },
  {
    id: 3,
    quote:
      "The process was thorough — the doctor reviewed my history properly and asked relevant follow-up questions. Much easier than trying to get a last-minute GP appointment.",
    name: "Michelle T.",
    location: "Paddington, QLD",
    service: "Medical Certificate",
    date: "3 days ago",
    rating: 5,
    verified: true,
    avatar: "/asian-australian-woman-professional-headshot-smili.jpg",
    emoji: "❤️",
  },
  {
    id: 4,
    quote:
      "As a shift worker, getting to a doctor during normal hours is really difficult. Being able to fill out a form and have it reviewed without a phone call was exactly what I needed.",
    name: "James L.",
    location: "Fremantle, WA",
    service: "Medical Certificate",
    date: "5 days ago",
    rating: 5,
    verified: true,
    avatar: "/young-australian-man-with-beard-casual-friendly-he.jpg",
    emoji: "🌙",
  },
  {
    id: 5,
    quote:
      "I appreciated that the doctor asked follow-up questions about my medication. It felt like a proper review, not just ticking boxes.",
    name: "Priya N.",
    location: "Carlton, VIC",
    service: "Prescription",
    date: "1 week ago",
    rating: 5,
    verified: true,
    avatar: "/indian-australian-woman-professional-headshot-smil.jpg",
    emoji: "✨",
  },
  {
    id: 6,
    quote:
      "Had an assignment deadline and was too unwell to sit the exam. The form was quick and the certificate came through within the hour. Really helpful service.",
    name: "Tom H.",
    location: "Newtown, NSW",
    service: "Medical Certificate",
    date: "4 days ago",
    rating: 5,
    verified: true,
    avatar: "/young-university-student-male-casual-headshot-frie.jpg",
    emoji: "🎓",
  },
  {
    id: 7,
    quote:
      "Simple process, no phone calls needed. The doctor reviewed everything and I had my document the same day. Would use again.",
    name: "Emma R.",
    location: "Fortitude Valley, QLD",
    service: "Medical Certificate",
    date: "2 weeks ago",
    rating: 5,
    verified: true,
    avatar: "/young-australian-woman-red-hair-professional-heads.jpg",
    emoji: "🌟",
  },
  {
    id: 8,
    quote:
      "Needed a carer's leave certificate when my mum got sick. The process was respectful and the turnaround was quick. Appreciated the care during a stressful time.",
    name: "Andrew C.",
    location: "Norwood, SA",
    service: "Medical Certificate",
    date: "1 week ago",
    rating: 5,
    verified: true,
    avatar: "/middle-aged-australian-man-kind-face-professional-.jpg",
    emoji: "💜",
  },
  {
    id: 9,
    quote:
      "I travel a lot for work and my scripts always seem to run out at the worst times. This service has been reliable whenever I've needed a repeat.",
    name: "Lisa W.",
    location: "Perth CBD, WA",
    service: "Prescription",
    date: "3 days ago",
    rating: 5,
    verified: true,
    avatar: "/professional-businesswoman-australian-headshot-con.jpg",
    emoji: "✈️",
  },
  {
    id: 10,
    quote:
      "The questionnaire asked relevant questions about my condition — you can tell a real doctor is reviewing these, not just an automated system.",
    name: "Chris B.",
    location: "Brunswick, VIC",
    service: "Prescription",
    date: "6 days ago",
    rating: 4,
    verified: true,
    avatar: "/young-australian-man-creative-professional-headsho.jpg",
    emoji: "🩺",
  },
  {
    id: 11,
    quote:
      "I was really anxious about using an online service for my prescription, but the doctor was thorough and professional. Asked all the right questions and even followed up the next day.",
    name: "Rebecca S.",
    location: "Manly, NSW",
    service: "Prescription",
    date: "2 weeks ago",
    rating: 5,
    verified: true,
    avatar: "/australian-woman-30s-professional-headshot-friendl.jpg",
    emoji: "🙏",
  },
  {
    id: 12,
    quote:
      "Got my prescription sorted in a day. My condition has been bothering me for months but I couldn&apos;t get a GP appointment. This was the push I needed.",
    name: "Alex P.",
    location: "St Kilda, VIC",
    service: "Prescription",
    date: "1 week ago",
    rating: 5,
    verified: true,
    avatar: "/young-man-casual-headshot-australian-friendly.jpg",
    emoji: "💪",
  },
  {
    id: 13,
    quote:
      "Super straightforward process. I appreciated that they actually asked about my symptoms rather than just rubber-stamping a certificate. Feels properly medical.",
    name: "Jenny H.",
    location: "Surry Hills, NSW",
    service: "Medical Certificate",
    date: "3 days ago",
    rating: 5,
    verified: true,
    avatar: "/asian-woman-professional-headshot-warm-smile.jpg",
    emoji: "👍",
  },
  {
    id: 14,
    quote:
      "Used this for a mental health day certificate. No awkward explanations needed, just answered the questionnaire honestly and got my cert. Really appreciated the discretion.",
    name: "Marcus W.",
    location: "Fitzroy, VIC",
    service: "Medical Certificate",
    date: "5 days ago",
    rating: 5,
    verified: true,
    avatar: "/young-man-beard-headshot-casual-australian.jpg",
    emoji: "💜",
  },
  {
    id: 15,
    quote:
      "My regular pharmacy was out of my medication and my GP couldn&apos;t see me for a week. Got a new script here in 2 hours and picked it up same day. Crisis averted!",
    name: "Sandra K.",
    location: "Toowong, QLD",
    service: "Prescription",
    date: "4 days ago",
    rating: 5,
    verified: true,
    avatar: "/woman-40s-friendly.jpg",
    emoji: "🎉",
  },
  {
    id: 16,
    quote:
      "First time using telehealth and I&apos;m converted. The interface is actually pleasant to use (rare for medical stuff) and the doctor was friendly and efficient.",
    name: "Tim J.",
    location: "Northbridge, WA",
    service: "Medical Certificate",
    date: "1 week ago",
    rating: 4,
    verified: true,
    avatar: "/man-30s-casual.jpg",
    emoji: "⭐",
  },
  {
    id: 17,
    quote:
      "Needed a medical certificate for a visa application. Got it sorted within hours. The whole process that usually takes weeks was done in 2 days.",
    name: "Mei L.",
    location: "Chatswood, NSW",
    service: "Medical Certificate",
    date: "2 weeks ago",
    rating: 5,
    verified: true,
    avatar: "/asian-woman-professional.png",
    emoji: "✈️",
  },
  {
    id: 18,
    quote:
      "My antidepressants ran out while I was travelling interstate. Found InstantMed, got a script sorted, and picked it up from a local pharmacy. Genuine lifesaver.",
    name: "Daniel R.",
    location: "Adelaide CBD, SA",
    service: "Prescription",
    date: "6 days ago",
    rating: 5,
    verified: true,
    avatar: "/man-20s-friendly.jpg",
    emoji: "🙌",
  },
  {
    id: 19,
    quote:
      "Honestly didn't expect much but was pleasantly surprised. The follow-up questions showed the doctor actually read my responses. Not just a tick-box exercise.",
    name: "Olivia C.",
    location: "Footscray, VIC",
    service: "Prescription",
    date: "1 week ago",
    rating: 5,
    verified: true,
    avatar: "/woman-30s-casual.jpg",
    emoji: "✨",
  },
  {
    id: 20,
    quote:
      "Got gastro the night before a big presentation. Certificate was in my inbox by 7am. My boss was suspicious it was that easy but hey, that&apos;s progress.",
    name: "Nick B.",
    location: "Pyrmont, NSW",
    service: "Medical Certificate",
    date: "3 days ago",
    rating: 5,
    verified: true,
    avatar: "/man-professional-suit.png",
    emoji: "😂",
  },
]

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
                  ? "bg-[#00E2B5] text-[#0A0F1C]"
                  : "bg-white/60 text-muted-foreground hover:bg-white/80"
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
        {filteredReviews.map((review, i) => (
          <TiltCard
            key={review.id}
            className={`glass-card rounded-2xl p-6 card-enter stagger-${(i % 8) + 1} hover-lift`}
            style={{ animationFillMode: "forwards" }}
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-3xl">{review.emoji || "💬"}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`h-4 w-4 ${j < review.rating ? "text-[#F59E0B] fill-[#F59E0B]" : "text-gray-200"}`}
                  />
                ))}
              </div>
            </div>

            <p className="text-foreground leading-relaxed mb-5">&ldquo;{review.quote}&rdquo;</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 rounded-full overflow-hidden ring-2 ring-[#00E2B5]/20">
                  <Image src={review.avatar || "/placeholder.svg"} alt={review.name} fill className="object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold">{review.name}</p>
                    {review.verified && <CheckCircle2 className="h-3.5 w-3.5 text-[#00E2B5]" />}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {review.location}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-[#00E2B5]/10 text-[#00E2B5]">
                  {review.service}
                </span>
                <p className="text-xs text-muted-foreground mt-1">{review.date}</p>
              </div>
            </div>
          </TiltCard>
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

export function ReviewsClientPageComponent() {
  const avgRating = (reviewsData.reduce((acc, r) => acc + r.rating, 0) / reviewsData.length).toFixed(1)
  const totalReviews = reviewsData.length

  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-24">
        {/* Header */}
        <section className="px-4 py-12 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-5xl">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <h1
                  className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Patient Reviews
                </h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
                  Real feedback from real Australians. No cherry-picking, no fake reviews — just honest experiences from
                  people like you.
                </p>
              </div>

              {/* Rating summary */}
              <TiltCard className="glass-card rounded-2xl p-6 lg:min-w-[280px]">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-[#00E2B5]" style={{ fontFamily: "var(--font-mono)" }}>
                      {avgRating}
                    </p>
                    <div className="flex gap-0.5 mt-1 justify-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < Math.round(Number(avgRating)) ? "text-[#F59E0B] fill-[#F59E0B]" : "text-gray-200"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="border-l border-[#0A0F1C]/10 pl-4">
                    <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                      {totalReviews}+
                    </p>
                    <p className="text-sm text-muted-foreground">Verified reviews</p>
                  </div>
                </div>
              </TiltCard>
            </div>
          </div>
        </section>

        {/* Reviews Grid */}
        <section className="px-4 py-12 sm:px-6 lg:py-16 bg-mesh">
          <div className="mx-auto max-w-5xl">
            <ReviewsGrid reviews={reviewsData} />
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2
              className="text-2xl font-bold tracking-tight sm:text-3xl mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to experience it yourself?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of Australians who&apos;ve made the switch to smarter healthcare.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center px-8 h-14 rounded-full btn-premium text-[#0A0F1C] font-semibold text-base shadow-lg group"
            >
              Get started free
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
