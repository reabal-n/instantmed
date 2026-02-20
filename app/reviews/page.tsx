import type { Metadata } from "next"
import { ReviewsClientPageComponent as ReviewsClientPage } from "./reviewsClientPage"
import { BreadcrumbSchema } from "@/components/seo/healthcare-schema"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Patient Reviews",
  description:
    "Read real reviews from Australian patients who've used InstantMed for medical certificates, prescriptions, and referrals.",
  keywords: ["telehealth reviews", "online doctor reviews", "InstantMed reviews", "Australia telehealth"],
  openGraph: {
    title: "Patient Reviews | InstantMed",
    description: "Read real reviews from Australian patients who've used InstantMed for medical certificates, prescriptions, and referrals.",
    url: "https://instantmed.com.au/reviews",
  },
  twitter: {
    card: "summary_large_image",
    title: "Patient Reviews | InstantMed",
    description: "Real reviews from Australian patients using InstantMed telehealth services.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/reviews",
  },
}

export default function ReviewsPage() {
  return (
    <>
      {/* ReviewAggregateSchema removed to avoid Google penalty from unverifiable review counts */}
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://instantmed.com.au" },
        { name: "Reviews", url: "https://instantmed.com.au/reviews" },
      ]} />
      <ReviewsClientPage />
    </>
  )
}
