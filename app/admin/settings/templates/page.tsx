import { Loader2 } from "lucide-react"
import { Suspense } from "react"

import { loadTemplateStudioData } from "@/app/actions/template-studio"
import { requireRole } from "@/lib/auth/helpers"

import { TemplateStudioClient } from "./template-studio-client"

export const metadata = {
  title: "Certificate Details | Admin",
  description: "Clinic details and preview for generated medical certificates.",
}

export const dynamic = "force-dynamic"

async function TemplateStudioLoader() {
  const result = await loadTemplateStudioData()

  if (!result.success || !result.data) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">Failed to load template data</p>
        <p className="text-sm text-muted-foreground mt-2">
          {result.error || "Unknown error"}
        </p>
      </div>
    )
  }

  return <TemplateStudioClient initialData={result.data} />
}

export default async function TemplateStudioPage() {
  await requireRole(["admin"])

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <TemplateStudioLoader />
    </Suspense>
  )
}
