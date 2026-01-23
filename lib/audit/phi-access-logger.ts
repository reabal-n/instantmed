import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { headers } from "next/headers"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("PHI Audit")

interface PHIAccessLog {
  tableName: string
  recordId: string
  operation: "encrypt" | "decrypt" | "rotate"
  actorId?: string
  actorRole?: string
  requestPath?: string
}

/**
 * Logs PHI encryption/decryption operations to the phi_encryption_audit table.
 * Required for HIPAA compliance and security auditing.
 */
export async function logPHIAccess(params: PHIAccessLog): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    
    // Get request context if available
    let ipAddress: string | null = null
    let requestPath = params.requestPath
    
    try {
      const headersList = await headers()
      ipAddress = headersList.get("x-forwarded-for")?.split(",")[0] || 
                  headersList.get("x-real-ip") || 
                  null
      if (!requestPath) {
        requestPath = headersList.get("x-invoke-path") || undefined
      }
    } catch {
      // Headers not available (not in request context)
    }

    const { error } = await supabase.from("phi_encryption_audit").insert({
      table_name: params.tableName,
      record_id: params.recordId,
      key_id: "default", // Could be extended to support key rotation
      operation: params.operation,
      actor_id: params.actorId || null,
      actor_role: params.actorRole || null,
      request_path: requestPath || null,
      ip_address: ipAddress,
    })

    if (error) {
      // Log but don't throw - audit logging should not break the main operation
      logger.warn("Failed to log PHI access", { error: error.message })
    }
  } catch (err) {
    logger.warn("Error logging PHI access", {}, err instanceof Error ? err : undefined)
  }
}

/**
 * Wrapper for encrypting PHI that automatically logs the operation
 */
export async function encryptWithAudit(
  value: string,
  encryptFn: (value: string) => Promise<string>,
  context: Omit<PHIAccessLog, "operation">
): Promise<string> {
  const encrypted = await encryptFn(value)
  await logPHIAccess({ ...context, operation: "encrypt" })
  return encrypted
}

/**
 * Wrapper for decrypting PHI that automatically logs the operation
 */
export async function decryptWithAudit(
  encryptedValue: string,
  decryptFn: (value: string) => Promise<string>,
  context: Omit<PHIAccessLog, "operation">
): Promise<string> {
  const decrypted = await decryptFn(encryptedValue)
  await logPHIAccess({ ...context, operation: "decrypt" })
  return decrypted
}
