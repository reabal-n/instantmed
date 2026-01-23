import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Repeat Prescription | InstantMed",
  description:
    "Request a repeat of your existing medication online. AHPRA-registered doctors, same-day electronic scripts.",
}

/**
 * /prescriptions/repeat now redirects to the unified /request flow
 */
export default function RepeatPrescriptionPage() {
  redirect("/request?service=prescription")
}
