import type { Metadata } from "next"
import IntakeDemoPage from "./intake-demo/page"

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Get Medical Certificate | InstantMed",
  description: "Get a legitimate medical certificate online in minutes. Reviewed by Australian-registered doctors. Fast, secure, and convenient.",
}

export default function NewMedCertPage() {
  return <IntakeDemoPage />
}

