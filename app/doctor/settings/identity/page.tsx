import { Loader2 } from "lucide-react"
import { Suspense } from "react"

import { loadDoctorIdentityAction } from "@/app/actions/doctor-identity"
import { resolveProfileAvatarUrl } from "@/lib/account/avatar-storage"
import { requireRole } from "@/lib/auth/helpers"
import { getParchmentEnvironment } from "@/lib/parchment/client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { IdentitySettingsClient } from "./identity-settings-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Doctor Settings | InstantMed",
  description: "Manage doctor account security, Parchment prescribing, and certificate identity settings",
}

async function IdentitySettingsLoader() {
  const authUser = await requireRole(["doctor", "admin"])
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
    const supabase = createServiceRoleClient()
    const { data } = await supabase
      .from("profiles")
      .select("parchment_user_id")
      .eq("id", authUser.profile.id)
      .single()
    parchmentUserId = data?.parchment_user_id ?? null
  } catch {
    // Non-fatal - just won't show linked status
  }

  const avatarUrl = await resolveProfileAvatarUrl(authUser.profile.avatar_url)

  return (
    <IdentitySettingsClient
      initialData={result.data}
      avatarUrl={avatarUrl}
      parchmentUserId={parchmentUserId}
      parchmentEnvironment={getParchmentEnvironment()}
    />
  )
}

export default function IdentitySettingsPage() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
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
