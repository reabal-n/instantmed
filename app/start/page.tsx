import { EnhancedIntakeFlow } from "@/components/intake/enhanced-intake-flow"
import { Suspense } from "react"

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>
}) {
  // Await searchParams (Next.js 15+ always returns Promise)
  const params = await searchParams
  
  // Map URL service params to EnhancedIntakeFlow service types
  const serviceMap: Record<string, "med-cert" | "repeat-script" | "new-script" | "consult"> = {
    "med-cert": "med-cert",
    "medical-certificate": "med-cert",
    "medcert": "med-cert",
    "repeat-script": "repeat-script",
    "repeat-rx": "repeat-script",
    "prescription": "repeat-script",
    "prescriptions": "repeat-script",
    "new-script": "new-script",
    "new-prescription": "new-script",
    "consult": "consult",
    "consultation": "consult",
  }

  const initialService = params?.service
    ? serviceMap[params.service.toLowerCase()]
    : undefined

  return (
    <Suspense fallback={<LoadingFallback />}>
      <EnhancedIntakeFlow initialService={initialService} />
    </Suspense>
  )
}
