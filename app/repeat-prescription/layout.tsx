import type { Metadata } from "next"
import { FAQSchema, BreadcrumbSchema, MedicalServiceSchema } from "@/components/seo/healthcare-schema"

export const metadata: Metadata = {
  title: "Repeat Prescription Online Australia | Same Day E-Script | InstantMed",
  description:
    "Renew your regular medication online. Same medication, same dose, delivered to any pharmacy. $29.95 flat fee. AHPRA-registered Australian doctors.",
  keywords: [
    "repeat prescription online",
    "online prescription renewal",
    "escript online",
    "prescription refill online",
    "repeat script australia",
    "medication renewal",
    "telehealth prescription",
    "online doctor prescription",
  ],
  openGraph: {
    title: "Repeat Prescription Online | Same Day E-Script | InstantMed",
    description: "Renew your regular medication online. Same medication, same dose. E-script sent to your phone. $29.95.",
    url: "https://instantmed.com.au/repeat-prescription",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Repeat Prescription Online | InstantMed",
    description: "Renew your regular medication online. E-script sent to your phone. $29.95.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/repeat-prescription",
  },
}

// FAQ data for schema
const faqSchemaData = [
  { question: "What medications can I renew?", answer: "Most regular medications including blood pressure, cholesterol, contraceptives, asthma inhalers, reflux medications, and other routine prescriptions. We cannot prescribe Schedule 8 medications (opioids, stimulants) or benzodiazepines." },
  { question: "How does the e-script work?", answer: "After approval, you receive an SMS with your e-script token. Show this at any pharmacy in Australia to collect your medication. PBS subsidies apply at the pharmacy." },
  { question: "Do I need my previous prescription?", answer: "No, but you should know the name and dose of your medication. The doctor will verify this is appropriate to continue." },
  { question: "What if I need a different dose?", answer: "Dose changes may require a general consultation where the doctor can properly assess your needs." },
]

export default function RepeatPrescriptionLayout({
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
          { name: "Repeat Prescription", url: "https://instantmed.com.au/repeat-prescription" }
        ]} 
      />
      <MedicalServiceSchema 
        name="Online Repeat Prescription"
        description="Renew your regular medication online. Same medication, same dose. eScript sent to your phone via SMS."
        price="29.95"
      />
      {children}
    </>
  )
}
