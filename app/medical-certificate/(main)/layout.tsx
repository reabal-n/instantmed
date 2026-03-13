import { FAQSchema, BreadcrumbSchema, MedicalServiceSchema } from "@/components/seo/healthcare-schema"

const faqSchemaData = [
  { question: "Will my employer accept this?", answer: "Yes. Our certificates are issued by AHPRA-registered doctors and are legally valid for all employers. Same as what you'd get from a clinic." },
  { question: "Can I use this for uni or TAFE?", answer: "Yes. Our certificates are accepted by all Australian universities and TAFEs for special consideration, extensions, or deferred exams." },
  { question: "What if I'm actually quite sick?", answer: "Then you definitely need one. If our doctors spot anything concerning, they'll let you know whether in-person care would be better." },
  { question: "How do I receive my certificate?", answer: "Once approved, it lands in your inbox as a PDF. You can also grab it from your dashboard anytime." },
  { question: "Is this legal?", answer: "Yes. Our doctors are AHPRA-registered and practicing in Australia. Medical certificates issued through telehealth are legally equivalent to in-person consultations." },
  { question: "What if my request is declined?", answer: "Full refund, no questions. Sometimes our doctors recommend in-person care instead — we'd rather be honest than just take your money." },
]

export default function MedicalCertificateMainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
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
      {children}
    </>
  )
}
