import { Suspense } from "react"
import { IdentitySettingsClient } from "./identity-settings-client"
import { loadDoctorIdentityAction } from "@/app/actions/doctor-identity"
import { Loader2 } from "lucide-react"

export const metadata = {
  title: "Certificate Identity | Settings | InstantMed",
  description: "Configure your certificate identity settings",
}

async function IdentitySettingsLoader() {
  const result = await loadDoctorIdentityAction()

  if (!result.success || !result.data) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Failed to load identity settings</p>
        <p className="text-sm text-muted-foreground mt-2">
          {result.error || "Unknown error"}
        </p>
      </div>
    )
  }

  return <IdentitySettingsClient initialData={result.data} />
}

export default function IdentitySettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <IdentitySettingsLoader />
      </Suspense>
    </div>
  )
}
