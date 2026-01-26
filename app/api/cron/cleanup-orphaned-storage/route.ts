import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { captureCronError } from "@/lib/observability/sentry"

const logger = createLogger("cron-cleanup-orphaned-storage")

/**
 * Cron job to clean up orphaned storage files
 * 
 * Orphaned files can occur when:
 * - PDF upload succeeds but atomic approval fails
 * - Certificate is revoked but file remains
 * 
 * This job identifies files in storage that have no matching database record
 * and deletes them after a grace period (7 days).
 */

const BUCKET_NAME = "documents"
const ORPHAN_GRACE_PERIOD_DAYS = 7
const MAX_FILES_PER_RUN = 50
// Storage folders to scan for orphans
const STORAGE_FOLDERS = ["med-certs", "pathology", "prescriptions"]

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()
    const stats = { checked: 0, orphaned: 0, deleted: 0, errors: 0 }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - ORPHAN_GRACE_PERIOD_DAYS)

    // Iterate through all storage folders (not just med-certs)
    for (const storageFolder of STORAGE_FOLDERS) {
      // List files in this storage folder
      const { data: folders, error: listError } = await supabase.storage
        .from(BUCKET_NAME)
        .list(storageFolder, { limit: 100 })

      if (listError) {
        logger.warn(`Failed to list storage folder: ${storageFolder}`, {}, listError)
        continue // Try next folder instead of failing entirely
      }

      if (!folders || folders.length === 0) {
        continue
      }

      // Check each patient folder for orphaned files
      for (const folder of folders.slice(0, 10)) {
        if (stats.deleted >= MAX_FILES_PER_RUN) break
        if (!folder.name || folder.id === null) continue

        const { data: files, error: filesError } = await supabase.storage
          .from(BUCKET_NAME)
          .list(`${storageFolder}/${folder.name}`, { limit: 50 })

        if (filesError || !files) continue

        for (const file of files) {
          if (stats.deleted >= MAX_FILES_PER_RUN) break
          if (!file.name || !file.created_at) continue

          stats.checked++
          const storagePath = `${storageFolder}/${folder.name}/${file.name}`
          const fileDate = new Date(file.created_at)

          // Skip files within grace period
          if (fileDate > cutoffDate) continue

          // Check if file has a matching database record
          const { data: certRecord } = await supabase
            .from("issued_certificates")
            .select("id")
            .eq("storage_path", storagePath)
            .maybeSingle()

          const { data: docRecord } = await supabase
            .from("intake_documents")
            .select("id")
            .eq("storage_path", storagePath)
            .maybeSingle()

          // If no matching record, this file is orphaned
          if (!certRecord && !docRecord) {
            stats.orphaned++

            // Delete the orphaned file
            const { error: deleteError } = await supabase.storage
              .from(BUCKET_NAME)
              .remove([storagePath])

            if (deleteError) {
              logger.warn("Failed to delete orphaned file", { storagePath }, deleteError)
              stats.errors++
            } else {
              stats.deleted++
              logger.info("Deleted orphaned file", { storagePath, createdAt: file.created_at })
            }
          }
        }
      }
    } // End storageFolder loop

    logger.info("Orphaned storage cleanup completed", stats)

    return NextResponse.json({
      success: true,
      ...stats,
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error("Orphaned storage cleanup failed", { error: err.message })
    captureCronError(err, { jobName: "cleanup-orphaned-storage" })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
