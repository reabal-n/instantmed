import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"

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

    // List files in the med-certs directory
    const { data: folders, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list("med-certs", { limit: 100 })

    if (listError) {
      logger.error("Failed to list storage folders", {}, listError)
      return NextResponse.json({ error: "Failed to list storage" }, { status: 500 })
    }

    if (!folders || folders.length === 0) {
      return NextResponse.json({ success: true, ...stats })
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - ORPHAN_GRACE_PERIOD_DAYS)

    // Check each patient folder for orphaned files
    for (const folder of folders.slice(0, 10)) {
      if (!folder.name || folder.id === null) continue

      const { data: files, error: filesError } = await supabase.storage
        .from(BUCKET_NAME)
        .list(`med-certs/${folder.name}`, { limit: 50 })

      if (filesError || !files) continue

      for (const file of files) {
        if (stats.deleted >= MAX_FILES_PER_RUN) break
        if (!file.name || !file.created_at) continue

        stats.checked++
        const storagePath = `med-certs/${folder.name}/${file.name}`
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

    logger.info("Orphaned storage cleanup completed", stats)

    return NextResponse.json({
      success: true,
      ...stats,
    })
  } catch (error) {
    logger.error("Orphaned storage cleanup failed", {}, error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
