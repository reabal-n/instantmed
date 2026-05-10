import { Loader2 } from "lucide-react"
import { Suspense } from "react"

import { loadDoctorIdentityAction } from "@/app/actions/doctor-identity"
import { IdentitySettingsClient } from "@/app/doctor/settings/identity/identity-settings-client"
import { resolveProfileAvatarUrl } from "@/lib/account/avatar-storage"
import { requireRole } from "@/lib/auth/helpers"
import { getParchmentEnvironment } from "@/lib/parchment/client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Doctor Identity | InstantMed Admin",
  description: "Manage owner-operator doctor security, availability, Parchment, and certificate identity settings.",
}

async function AdminDoctorIdentitySettingsLoader() {
  const authUser = await requireRole(["admin"], { redirectTo: "/admin" })
  const result = await loadDoctorIdentityAction()

  if (!result.success || !result.data) {
    return (
      <div className="rounded-xl border border-destructive-border bg-destructive-light p-6 text-center">
        <p className="text-sm font-medium text-destructive">Failed to load doctor identity settings</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.error || "Unknown error"}
        </p>
      </div>
    )
  }

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
    parchmentUserId = null
  }

  const avatarUrl = await resolveProfileAvatarUrl(authUser.profile.avatar_url)

  return (
    <IdentitySettingsClient
      initialData={result.data}
      avatarUrl={avatarUrl}
      parchmentUserId={parchmentUserId}
      parchmentEnvironment={getParchmentEnvironment()}
      settingsPath="/admin/settings/doctor-identity"
      backHref="/admin/settings"
      backLabel="Back to admin settings"
    />
  )
}

export default function AdminDoctorIdentitySettingsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <Suspense
        fallback={
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <AdminDoctorIdentitySettingsLoader />
      </Suspense>
    </div>
  )
}
