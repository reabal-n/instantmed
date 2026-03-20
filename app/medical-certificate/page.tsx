export const dynamic = "force-dynamic"
export const revalidate = 86400 // AUDIT FIX: Explicit ISR for static marketing pages

import MedicalCertificatePage from "./medical-certificate-client"
import { SpeakableSchema, MedCertHowToSchema, FAQSchema, BreadcrumbSchema, MedicalServiceSchema } from "@/components/seo/healthcare-schema"

const faqSchemaData = [
  { question: "Will my employer accept this?", answer: "Yes. Our certificates are issued by AHPRA-registered doctors and are legally valid for all employers. Same as what you'd get from a clinic." },
  { question: "Can I use this for uni or TAFE?", answer: "Yes. Our certificates are accepted by all Australian universities and TAFEs for special consideration, extensions, or deferred exams." },
  { question: "What if I'm actually quite sick?", answer: "Then you definitely need one. If our doctors spot anything concerning, they'll let you know whether in-person care would be better." },
  { question: "How do I receive my certificate?", answer: "Once approved, it lands in your inbox as a PDF. You can also grab it from your dashboard anytime." },
  { question: "Is this legal?", answer: "Yes. Our doctors are AHPRA-registered and practicing in Australia. Medical certificates issued through telehealth are legally equivalent to in-person consultations." },
  { question: "What if my request is declined?", answer: "Full refund, no questions. Sometimes our doctors recommend in-person care instead — we'd rather be honest than just take your money." },
]

export default function Page() {
  return (
    <>
      <SpeakableSchema
        name="Online Medical Certificate Australia"
        description="Get a medical certificate for work or study in under an hour. Reviewed by an AHPRA-registered Australian doctor. From $19.95. No appointment needed."
        url="/medical-certificate"
      />
      <MedCertHowToSchema />
      <FAQSchema faqs={faqSchemaData} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Medical Certificate", url: "https://instantmed.com.au/medical-certificate" },
        ]}
      />
      <MedicalServiceSchema
        name="Online Medical Certificate"
        description="Get a valid medical certificate for work or study reviewed by an Australian registered doctor. Available same day."
        price="19.95"
      />
      <MedicalCertificatePage />
    </>
  )
}
