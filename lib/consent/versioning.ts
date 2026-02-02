import { createHash } from "crypto"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("consent-versioning")

export function hashConsentContent(content: string): string {
  return createHash("sha256").update(content).digest("hex")
}

export async function createConsentVersion(
  consentType: string,
  content: string
): Promise<string | null> {
  const supabase = createServiceRoleClient()
  const contentHash = hashConsentContent(content)

  // Get latest version number
  const { data: latest } = await supabase
    .from("consent_versions")
    .select("version_number")
    .eq("consent_type", consentType)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (latest?.version_number || 0) + 1

  const { data, error } = await supabase
    .from("consent_versions")
    .insert({
      consent_type: consentType,
      version_number: nextVersion,
      content,
      content_hash: contentHash,
    })
    .select("id")
    .single()

  if (error) {
    log.error("Failed to create consent version", { consentType, error: error.message })
    return null
  }

  return data.id
}

export async function recordPatientConsent(params: {
  patientId: string
  consentVersionId: string
  intakeId?: string
  ipAddress?: string
  userAgent?: string
}): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase.from("patient_consents").upsert(
    {
      patient_id: params.patientId,
      consent_version_id: params.consentVersionId,
      intake_id: params.intakeId || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    },
    { onConflict: "patient_id,consent_version_id,intake_id" }
  )

  if (error) {
    log.error("Failed to record consent", { error: error.message })
    return false
  }

  return true
}

export async function getLatestConsentVersion(consentType: string) {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from("consent_versions")
    .select("*")
    .eq("consent_type", consentType)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}

export async function getPatientConsentHistory(patientId: string) {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from("patient_consents")
    .select("*, consent_version:consent_versions(*)")
    .eq("patient_id", patientId)
    .order("granted_at", { ascending: false })

  return data || []
}
