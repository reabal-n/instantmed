import type { Metadata } from "next"
import { ReviewsClientPageComponent as ReviewsClientPage } from "./reviewsClientPage"

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Patient Reviews | Lumen Health",
  description:
    "Read real reviews from Australian patients who've used Lumen Health for medical certificates, prescriptions, and referrals.",
  keywords: ["telehealth reviews", "online doctor reviews", "Lumen Health reviews", "Australia telehealth"],
}

export default function ReviewsPage() {
  return <ReviewsClientPage />
}
