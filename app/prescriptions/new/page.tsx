import type { Metadata } from "next"
import RepeatPrescriptionDemoPage from "./intake-demo/page"

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Request Prescription Online | InstantMed",
  description: "Request your repeat prescription online. Reviewed by AHPRA-registered Australian doctors. E-script sent to your phone if approved.",
}

export default function NewPrescriptionPage() {
  return <RepeatPrescriptionDemoPage />
}
