export const dynamic = "force-dynamic"
export const revalidate = 86400 // AUDIT FIX: Explicit ISR for static marketing pages

import MedicalCertificatePage from "./medical-certificate-client"

export default function Page() {
  return <MedicalCertificatePage />
}
