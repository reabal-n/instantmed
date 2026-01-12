import type { Metadata } from "next"
import { ReviewsClientPageComponent as ReviewsClientPage } from "./reviewsClientPage"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Patient Reviews | InstantMed",
  description:
    "Read real reviews from Australian patients who've used InstantMed for medical certificates, prescriptions, and referrals.",
  keywords: ["telehealth reviews", "online doctor reviews", "InstantMed reviews", "Australia telehealth"],
}

export default function ReviewsPage() {
  return <ReviewsClientPage />
}
