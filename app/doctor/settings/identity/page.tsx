import { Suspense } from "react"
import { IdentitySettingsClient } from "./identity-settings-client"
import { loadDoctorIdentityAction } from "@/app/actions/doctor-identity"
import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { Loader2 } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Certificate Identity | Settings",
  description: "Configure your certificate identity settings",
}

async function IdentitySettingsLoader() {
  const result = await loadDoctorIdentityAction()

  if (!result.success || !result.data) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">Failed to load identity settings</p>
        <p className="text-sm text-muted-foreground mt-2">
          {result.error || "Unknown error"}
        </p>
      </div>
    )
  }

  // Fetch parchment_user_id for integration section
  let parchmentUserId: string | null = null
  try {
    const authUser = await getAuthenticatedUserWithProfile()
    if (authUser) {
      const supabase = createServiceRoleClient()
      const { data } = await supabase
        .from("profiles")
        .select("parchment_user_id")
        .eq("id", authUser.profile.id)
        .single()
      parchmentUserId = data?.parchment_user_id ?? null
    }
  } catch {
    // Non-fatal - just won't show linked status
  }

  return <IdentitySettingsClient initialData={result.data} parchmentUserId={parchmentUserId} />
}

export default function IdentitySettingsPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
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
