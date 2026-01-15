import type { Metadata } from "next"
import { FAQSchema, BreadcrumbSchema, MedicalServiceSchema } from "@/components/seo/healthcare-schema"

export const metadata: Metadata = {
  title: "Online GP Consultation Australia | Speak with a Doctor | InstantMed",
  description:
    "A proper GP consult without the clinic visit. Australian doctors assess your health concerns and provide treatment advice, prescriptions, or referrals. $49.95.",
  keywords: [
    "online doctor consultation",
    "telehealth gp",
    "online gp australia",
    "doctor consultation online",
    "telehealth consultation",
    "speak to a doctor online",
    "new prescription online",
    "online medical consultation",
  ],
  openGraph: {
    title: "Online GP Consultation | Speak with a Doctor | InstantMed",
    description: "A proper GP consult without the clinic visit. Australian doctors assess your health concerns and provide treatment advice.",
    url: "https://instantmed.com.au/general-consult",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Online GP Consultation | InstantMed",
    description: "A proper GP consult without the clinic visit. Get treatment advice, prescriptions, or referrals.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/general-consult",
  },
}

// FAQ data for schema
const faqSchemaData = [
  { question: "What can I consult about?", answer: "Most non-urgent health concerns including skin conditions, minor infections, cold/flu symptoms, allergies, mental health check-ins, and requests for new medications or treatment advice." },
  { question: "Will the doctor call me?", answer: "Usually yes. General consultations often require a phone or video call so the doctor can properly assess your situation. You will be notified when to expect the call." },
  { question: "Can I get a prescription?", answer: "Yes, if clinically appropriate. The doctor will assess your needs and prescribe medication if suitable. We cannot prescribe Schedule 8 medications or benzodiazepines." },
  { question: "How long does it take?", answer: "Most consultations are completed within 2 hours. The doctor will review your information and typically call within this timeframe." },
]

export default function GeneralConsultLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* SEO Structured Data */}
      <FAQSchema faqs={faqSchemaData} />
      <BreadcrumbSchema 
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "General Consultation", url: "https://instantmed.com.au/general-consult" }
        ]} 
      />
      <MedicalServiceSchema 
        name="Online GP Consultation"
        description="A proper GP consult without the clinic visit. Get treatment advice, prescriptions, or referrals from Australian-registered doctors."
        price="49.95"
      />
      {children}
    </>
  )
}
