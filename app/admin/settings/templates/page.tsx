import { Loader2 } from "lucide-react"
import { Suspense } from "react"

import { loadCertificateDetailsData } from "@/app/actions/certificate-details"
import { requireRole } from "@/lib/auth/helpers"

import { CertificateDetailsClient } from "./certificate-details-client"

export const metadata = {
  title: "Certificate Details | Admin",
  description: "Clinic details and preview for generated medical certificates.",
}

export const dynamic = "force-dynamic"

async function CertificateDetailsLoader() {
  const result = await loadCertificateDetailsData()

  if (!result.success || !result.data) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">Failed to load certificate details</p>
        <p className="text-sm text-muted-foreground mt-2">
          {result.error || "Unknown error"}
        </p>
      </div>
    )
  }

  return <CertificateDetailsClient initialData={result.data} />
}

export default async function CertificateDetailsPage() {
  await requireRole(["admin"])

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CertificateDetailsLoader />
    </Suspense>
  )
}
