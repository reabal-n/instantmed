import type { Metadata } from "next"
import IntakeDemoPage from "./intake-demo/page"

// Force dynamic rendering and disable caching
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

export const metadata: Metadata = {
  title: "Get Medical Certificate | InstantMed",
  description: "Get a legitimate medical certificate online in minutes. Reviewed by Australian-registered doctors. Fast, secure, and convenient.",
}

export default function NewMedCertPage() {
  return <IntakeDemoPage />
}

