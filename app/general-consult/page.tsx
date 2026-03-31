export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import GeneralConsultPage from "./general-consult-client"
import { ReviewAggregateSchema, BreadcrumbSchema } from "@/components/seo/healthcare-schema"

export const metadata: Metadata = {
  title: "Online GP Consult | Doctor Reviewed | InstantMed",
  description: "Speak with an Australian GP online. Medical advice, prescriptions, referrals, and certificates. From $49.95. No appointment needed.",
  alternates: {
    canonical: "https://instantmed.com.au/general-consult",
  },
}

export default function Page() {
  return (
    <>
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://instantmed.com.au" },
        { name: "GP Consult", url: "https://instantmed.com.au/general-consult" },
      ]} />
      <ReviewAggregateSchema ratingValue={4.8} reviewCount={49} />
      <GeneralConsultPage />
    </>
  )
}
