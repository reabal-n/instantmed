export const dynamic = "force-dynamic"
export const revalidate = 86400 // AUDIT FIX: Explicit ISR for static marketing pages

import MedicalCertificatePage from "./medical-certificate-client"
import { SpeakableSchema, MedCertHowToSchema } from "@/components/seo/healthcare-schema"

export default function Page() {
  return (
    <>
      <SpeakableSchema
        name="Online Medical Certificate Australia"
        description="Get a medical certificate for work or study in under an hour. Reviewed by an AHPRA-registered Australian doctor. From $19.95. No appointment needed."
        url="/medical-certificate"
      />
      <MedCertHowToSchema />
      <MedicalCertificatePage />
    </>
  )
}
