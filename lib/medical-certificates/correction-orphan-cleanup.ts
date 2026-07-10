import type { SupabaseClient } from "@supabase/supabase-js"

import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("certificate-correction-orphan-cleanup")

const CORRECTION_STORAGE_ROOT = "certificates/corrections"
const LIST_PAGE_SIZE = 100

export interface CorrectionOrphanCleanupStats {
  checked: number
  orphaned: number
  deleted: number
  errors: number
}

async function hasDurableReference(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<"referenced" | "unreferenced" | "unknown"> {
  const [certificate, document, retainedVersion] = await Promise.all([
    supabase
      .from("issued_certificates")
      .select("id")
      .eq("storage_path", storagePath)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("intake_documents")
      .select("id")
      .eq("storage_path", storagePath)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("certificate_audit_log")
      .select("id")
      .eq("event_type", "superseded")
      .eq("event_data->>reissue_reason", "doctor_correction")
      .eq("event_data->>previous_storage_path", storagePath)
      .limit(1)
      .maybeSingle(),
  ])

  if (certificate.error || document.error || retainedVersion.error) {
    logger.error("Correction orphan reference lookup failed; retaining object", {
      storagePath,
      certificateLookupFailed: Boolean(certificate.error),
      documentLookupFailed: Boolean(document.error),
      auditLookupFailed: Boolean(retainedVersion.error),
    })
    return "unknown"
  }

  return certificate.data || document.data || retainedVersion.data
    ? "referenced"
    : "unreferenced"
}

/**
 * Delete process-death correction uploads after the grace period. Current
 * objects are referenced by issued_certificates/intake_documents; deliberately
 * retained prior versions are referenced by the immutable correction audit.
 */
export async function cleanupCorrectionStorageOrphans(
  supabase: SupabaseClient,
  options: { cutoffDate: Date; maxDeletes: number },
): Promise<CorrectionOrphanCleanupStats> {
  const stats: CorrectionOrphanCleanupStats = {
    checked: 0,
    orphaned: 0,
    deleted: 0,
    errors: 0,
  }

  let offset = 0
  while (stats.deleted < options.maxDeletes) {
    const { data: entries, error: listError } = await supabase.storage
      .from("documents")
      .list(CORRECTION_STORAGE_ROOT, { limit: LIST_PAGE_SIZE, offset })

    if (listError) {
      logger.error("Failed to list certificate correction folders", {}, listError)
      stats.errors++
      break
    }

    const page = entries ?? []
    for (const folder of page) {
      if (stats.deleted >= options.maxDeletes) break
      // Supabase Storage represents a folder with id=null. File entries at the
      // root are not part of the correction layout and are left untouched.
      if (!folder.name || folder.id !== null) continue

      const folderPath = `${CORRECTION_STORAGE_ROOT}/${folder.name}`
      let fileOffset = 0
      while (stats.deleted < options.maxDeletes) {
        const { data: files, error: filesError } = await supabase.storage
          .from("documents")
          .list(folderPath, { limit: LIST_PAGE_SIZE, offset: fileOffset })

        if (filesError) {
          logger.error("Failed to list certificate correction versions", { folderPath }, filesError)
          stats.errors++
          break
        }

        const filePage = files ?? []
        for (const file of filePage) {
          if (stats.deleted >= options.maxDeletes) break
          if (!file.name || file.id === null || !file.created_at) continue

          const createdAt = new Date(file.created_at)
          if (Number.isNaN(createdAt.getTime())) {
            stats.errors++
            continue
          }
          if (createdAt > options.cutoffDate) continue

          stats.checked++
          const storagePath = `${folderPath}/${file.name}`
          const reference = await hasDurableReference(supabase, storagePath)
          if (reference === "unknown") {
            stats.errors++
            continue
          }
          if (reference === "referenced") continue

          stats.orphaned++
          const { error: removeError } = await supabase.storage
            .from("documents")
            .remove([storagePath])
          if (removeError) {
            logger.error("Failed to delete orphaned correction PDF", { storagePath }, removeError)
            stats.errors++
            continue
          }

          stats.deleted++
          logger.info("Deleted orphaned correction PDF", { storagePath })
        }

        if (filePage.length < LIST_PAGE_SIZE) break
        fileOffset += LIST_PAGE_SIZE
      }
    }

    if (page.length < LIST_PAGE_SIZE) break
    offset += LIST_PAGE_SIZE
  }

  return stats
}
