import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Get Started",
  description: "Start your telehealth consultation with InstantMed. Get medical certificates, prescriptions, or doctor consultations online in minutes.",
}

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

/**
 * /start route now redirects to the unified /request flow
 * Preserves service query parameter for backwards compatibility
 */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>
}) {
  const params = await searchParams
  
  // Map legacy service params to unified service types
  const serviceMap: Record<string, string> = {
    "med-cert": "med-cert",
    "medical-certificate": "med-cert",
    "medcert": "med-cert",
    "repeat-script": "prescription",
    "repeat-rx": "prescription",
    "prescription": "prescription",
    "prescriptions": "prescription",
    "new-script": "consult",
    "new-prescription": "consult",
    "consult": "consult",
    "consultation": "consult",
  }

  const service = params?.service
    ? serviceMap[params.service.toLowerCase()]
    : undefined

  // Redirect to unified /request with mapped service
  const targetUrl = service ? `/request?service=${service}` : "/request"
  redirect(targetUrl)
}
