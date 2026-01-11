"use client"

import { TestimonialsColumnsWrapper } from "@/components/ui/testimonials-columns-wrapper"

const reviews = [
  {
    name: "Sarah M.",
    location: "Sydney",
    rating: 5,
    text: "Got my med cert in 20 mins. Lifesaver when you&apos;re actually sick and can&apos;t leave bed.",
    date: "2 days ago",
  },
  {
    name: "James K.",
    location: "Melbourne",
    rating: 5,
    text: "Finally a telehealth that doesn&apos;t make you wait 3 days. Script sorted same day.",
    date: "1 week ago",
  },
  {
    name: "Emma L.",
    location: "Brisbane",
    rating: 5,
    text: "Was skeptical but the doctor was legit thorough. Employer accepted my cert no questions.",
    date: "3 days ago",
  },
  {
    name: "Michael T.",
    location: "Perth",
    rating: 5,
    text: "4am and needed a script before my flight. Done in 15 mins. Unreal service.",
    date: "5 days ago",
  },
  {
    name: "Jessica W.",
    location: "Adelaide",
    rating: 5,
    text: "No awkward video call, just answered questions and got my prescription. So easy.",
    date: "1 week ago",
  },
  {
    name: "David R.",
    location: "Gold Coast",
    rating: 5,
    text: "Repeat script for my blood pressure meds. Usually takes a week to see my GP. This took 12 mins.",
    date: "4 days ago",
  },
  {
    name: "Sophie H.",
    location: "Canberra",
    rating: 5,
    text: "Real Australian doctors, not some overseas call centre. Actually listened to my concerns.",
    date: "6 days ago",
  },
  {
    name: "Chris B.",
    location: "Newcastle",
    rating: 5,
    text: "Pricing upfront, no hidden fees. Wish my regular GP was this transparent.",
    date: "2 weeks ago",
  },
  {
    name: "Lisa M.",
    location: "Hobart",
    rating: 5,
    text: "Got a sick note for work while lying in bed with the flu. This is how healthcare should work.",
    date: "3 days ago",
  },
  {
    name: "Ryan P.",
    location: "Darwin",
    rating: 5,
    text: "Living remote, nearest GP is 2 hours away. Lumen Health is a game changer up here.",
    date: "1 week ago",
  },
]

// Convert reviews to column format
const reviewsForColumns = reviews.map((r) => ({
  text: `"${r.text}"`,
  image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.name.replace(/[^a-zA-Z0-9]/g, '')}`,
  name: r.name,
  role: r.location,
}))

export function TrustpilotReviews() {
  return (
    <section className="py-8 overflow-hidden relative">
      {/* Testimonials Columns */}
      <TestimonialsColumnsWrapper
        testimonials={reviewsForColumns}
        title="What our customers say"
        subtitle="See what our customers have to say about us."
        badgeText="Customer Reviews"
        className="py-0 my-0"
      />
    </section>
  )
}
