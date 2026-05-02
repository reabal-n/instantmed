import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Repeat Prescription",
  description:
    "Request a repeat of your existing medication online. AHPRA-registered doctors, electronic scripts after doctor approval.",
}

/**
 * /prescriptions/repeat now redirects to the unified /request flow
 */
export default function RepeatPrescriptionPage() {
  redirect("/request?service=repeat-script")
}
