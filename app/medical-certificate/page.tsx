export const revalidate = 86400

import { MedCertLanding } from "@/components/marketing/med-cert-landing"
import { SpeakableSchema, MedCertHowToSchema, FAQSchema, BreadcrumbSchema, MedicalServiceSchema } from "@/components/seo/healthcare-schema"
import { MED_CERT_FAQ } from "@/lib/data/med-cert-faq"

export default function Page() {
  return (
    <>
      <SpeakableSchema
        name="Online Medical Certificate Australia"
        description="Get a medical certificate for work or study in under an hour. Reviewed by an AHPRA-registered Australian doctor. From $19.95. No appointment needed."
        url="/medical-certificate"
      />
      <MedCertHowToSchema />
      <FAQSchema faqs={[...MED_CERT_FAQ]} />
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
      <MedCertLanding />
    </>
  )
}
