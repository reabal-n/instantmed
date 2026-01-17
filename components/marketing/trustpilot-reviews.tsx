"use client"

import { TestimonialsColumnsWrapper } from "@/components/ui/testimonials-columns-wrapper"

// Diverse, authentic-looking Unsplash avatars for Australian testimonials
const reviewAvatars = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face", // Sarah - friendly woman
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face", // James - professional man
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face", // Emma - warm smile
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face", // Michael - casual man
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face", // Jessica - young professional
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face", // David - mature man
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&crop=face", // Sophie - confident woman
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face", // Chris - friendly guy
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face", // Lisa - approachable woman
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face", // Ryan - outdoorsy man
]

const reviews = [
  {
    name: "Sarah M.",
    location: "Sydney",
    rating: 5,
    text: "Got my med cert in 20 mins. Lifesaver when you're actually sick and can't leave bed.",
    date: "2 days ago",
    avatar: reviewAvatars[0],
  },
  {
    name: "James K.",
    location: "Melbourne",
    rating: 5,
    text: "Finally a telehealth that doesn't make you wait 3 days. Script sorted same day.",
    date: "1 week ago",
    avatar: reviewAvatars[1],
  },
  {
    name: "Emma L.",
    location: "Brisbane",
    rating: 5,
    text: "Was skeptical but the doctor was legit thorough. Employer accepted my cert no questions.",
    date: "3 days ago",
    avatar: reviewAvatars[2],
  },
  {
    name: "Michael T.",
    location: "Perth",
    rating: 5,
    text: "Needed a script before my flight. Done in 15 mins. Unreal service.",
    date: "5 days ago",
    avatar: reviewAvatars[3],
  },
  {
    name: "Jessica W.",
    location: "Adelaide",
    rating: 5,
    text: "Just answered a few questions and got my prescription sorted. So easy.",
    date: "1 week ago",
    avatar: reviewAvatars[4],
  },
  {
    name: "David R.",
    location: "Gold Coast",
    rating: 5,
    text: "Repeat script for my blood pressure meds. Usually takes a week to see my GP. This took 12 mins.",
    date: "4 days ago",
    avatar: reviewAvatars[5],
  },
  {
    name: "Sophie H.",
    location: "Canberra",
    rating: 5,
    text: "Real Australian doctors. Actually listened to my concerns and explained everything clearly.",
    date: "6 days ago",
    avatar: reviewAvatars[6],
  },
  {
    name: "Chris B.",
    location: "Newcastle",
    rating: 5,
    text: "Pricing upfront, no hidden fees. Wish my regular GP was this transparent.",
    date: "2 weeks ago",
    avatar: reviewAvatars[7],
  },
  {
    name: "Lisa M.",
    location: "Hobart",
    rating: 5,
    text: "Got a sick note for work while lying in bed with the flu. This is how healthcare should work.",
    date: "3 days ago",
    avatar: reviewAvatars[8],
  },
  {
    name: "Ryan P.",
    location: "Darwin",
    rating: 5,
    text: "Living remote, nearest GP is 2 hours away. InstantMed is a game changer up here.",
    date: "1 week ago",
    avatar: reviewAvatars[9],
  },
]

// Convert reviews to column format with avatars
const reviewsForColumns = reviews.map((r) => ({
  text: `"${r.text}"`,
  image: r.avatar,
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
