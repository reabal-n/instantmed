import { getActiveClinicIdentity, getClinicLogoUrl } from "@/lib/data/clinic-identity"
import { ClinicIdentityClient } from "./clinic-client"

export const dynamic = "force-dynamic"

export default async function ClinicIdentityPage() {
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
