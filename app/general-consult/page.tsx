export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import GeneralConsultPage from "./general-consult-client"
import { ReviewAggregateSchema, BreadcrumbSchema, FAQSchema } from "@/components/seo/healthcare-schema"

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
      <FAQSchema faqs={[
        { question: "What can I consult about?", answer: "Most non-urgent health concerns including skin conditions, minor infections, cold/flu symptoms, allergies, mental health check-ins, and requests for new medications or treatment advice." },
        { question: "Will the doctor call me?", answer: "Usually yes. General consultations often require a phone or video call so the doctor can properly assess your situation. You will be notified when to expect the call." },
        { question: "Can I get a prescription?", answer: "Yes, if clinically appropriate. The doctor will assess your needs and prescribe medication if suitable. We cannot prescribe Schedule 8 medications or benzodiazepines." },
        { question: "Can I get a referral?", answer: "Yes. The doctor can provide referrals to specialists, pathology, or imaging if clinically indicated based on your consultation." },
        { question: "How is this different from a medical certificate?", answer: "Medical certificates are for documenting illness for work or study. General consultations are for when you need actual medical advice, assessment, or treatment for a health concern." },
        { question: "What if you cannot help?", answer: "If your concern requires in-person examination or is outside our scope, we will advise you and provide a full refund." },
      ]} />
      <ReviewAggregateSchema ratingValue={4.8} reviewCount={49} />
      <GeneralConsultPage />
    </>
  )
}
