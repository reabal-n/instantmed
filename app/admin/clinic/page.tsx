import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getActiveClinicIdentity, getClinicLogoUrl } from "@/lib/data/clinic-identity"
import { ClinicIdentityClient } from "./clinic-client"

export const dynamic = "force-dynamic"

export default async function ClinicIdentityPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  if (authUser.profile.role !== "admin") {
    redirect("/")
  }

  const clinicIdentity = await getActiveClinicIdentity()
  const logoUrl = clinicIdentity?.logo_storage_path
    ? await getClinicLogoUrl(clinicIdentity.logo_storage_path)
    : null

  return (
    <ClinicIdentityClient
      initialData={clinicIdentity}
      logoUrl={logoUrl}
    />
  )
}
