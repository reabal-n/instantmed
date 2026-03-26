import FAQPage from "./faq-page-client"
import { BreadcrumbSchema, SpeakableSchema } from "@/components/seo/healthcare-schema"

// Note: metadata and revalidate are exported from layout.tsx → metadata.ts
// force-dynamic removed — layout handles revalidation

export default function Page() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "FAQs", url: "https://instantmed.com.au/faq" },
        ]}
      />
      <SpeakableSchema
        name="InstantMed FAQs"
        description="Frequently asked questions about InstantMed online medical consultations, medication, and certificates."
        url="/faq"
      />
      <FAQPage />
    </>
  )
}
