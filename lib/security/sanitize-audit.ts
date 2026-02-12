/**
 * PHI Sanitization for Audit Logs
 * 
 * Removes or redacts PHI fields from state snapshots before storing in audit_logs.
 * This ensures compliance with privacy requirements while maintaining audit trail integrity.
 */

// Keys that contain PHI and must be redacted
const PHI_KEYS = new Set([
  // Medical/clinical data
  "doctor_notes",
  "notes",
  "clinical_notes",
  "draft_notes",
  "ai_draft",
  "answers",
  "messages",
  "transcript",
  "chat_transcript",
  "symptoms",
  "medical_history",
  "conditions",
  "allergies",
  "medications",
  "diagnosis",
  
  // Personal identifiers
  "medicare_number",
  "medicare",
  "dob",
  "date_of_birth",
  "birth_date",
  "phone",
  "phone_number",
  "mobile",
  "email",
  "address",
  "street_address",
  "address_line1",
  "address_line2",
  "full_name",
  "first_name",
  "last_name",
  "given_name",
  "family_name",
  
  // Free text fields that may contain PHI
  "free_text",
  "additional_info",
  "patient_notes",
  "reason",
  "description",
  "details",
  "comment",
  "comments",
  
  // Document/attachment references (contain PHI indirectly)
  "pdf_url",
  "document_url",
  "attachment_url",
  "attachments",
  "signed_url",
  "storage_path",
  
  // AI/ML content
  "ai_response",
  "ai_content",
  "generated_content",
])

// Keys that are safe to keep in audit logs
const SAFE_KEYS = new Set([
  // IDs and references
  "id",
  "intake_id",
  "profile_id",
  "user_id",
  "doctor_id",
  "admin_id",
  "actor_id",
  "session_id",
  "stripe_session_id",
  "stripe_payment_intent_id",
  "stripe_refund_id",
  
  // Status and state
  "status",
  "payment_status",
  "state",
  "from_state",
  "to_state",
  "previous_status",
  "new_status",
  
  // Service/type info
  "service_type",
  "service_slug",
  "service_name",
  "intake_type",
  "document_type",
  "email_type",
  "action_type",
  
  // Timestamps
  "created_at",
  "updated_at",
  "reviewed_at",
  "submitted_at",
  "paid_at",
  "completed_at",
  "deleted_at",
  
  // Financial (non-PHI)
  "amount",
  "amount_cents",
  "currency",
  "refund_amount",
  
  // Flags and counts
  "is_active",
  "is_urgent",
  "is_test",
  "retried",
  "attempt_count",
  "version",
  
  // Error info (should not contain PHI)
  "error_code",
  "error_type",
  
  // Setting types
  "settingType",
  "serviceId",
  "targetDoctorId",
  "updatedFields",
])

const REDACTED = "[REDACTED]"

/**
 * Check if a key potentially contains PHI
 */
function isPHIKey(key: string): boolean {
  const lowerKey = key.toLowerCase()
  
  // Direct match
  if (PHI_KEYS.has(lowerKey)) return true
  
  // Pattern matching for common PHI field patterns
  if (lowerKey.includes("note") && !lowerKey.includes("notification")) return true
  if (lowerKey.includes("answer")) return true
  if (lowerKey.includes("message")) return true
  if (lowerKey.includes("transcript")) return true
  if (lowerKey.includes("medicare")) return true
  if (lowerKey.includes("address") && !lowerKey.includes("ip_address")) return true
  if (lowerKey.includes("phone")) return true
  if (lowerKey.includes("symptom")) return true
  if (lowerKey.includes("diagnosis")) return true
  if (lowerKey.includes("medical")) return true
  if (lowerKey.includes("clinical")) return true
  if (lowerKey.includes("patient") && !lowerKey.includes("patient_id")) return true
  
  return false
}

/**
 * Check if a key is explicitly safe
 */
function isSafeKey(key: string): boolean {
  const lowerKey = key.toLowerCase()
  return SAFE_KEYS.has(lowerKey) || lowerKey.endsWith("_id") || lowerKey.endsWith("_at")
}

/**
 * Recursively sanitize an object, redacting PHI fields
 */
function sanitizeObject(obj: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) return REDACTED
  
  if (obj === null || obj === undefined) return obj
  
  if (Array.isArray(obj)) {
    // For arrays, check if they might contain PHI (like answers array)
    // If array contains objects with PHI keys, redact the whole array
    if (obj.length > 0 && typeof obj[0] === "object") {
      return `[REDACTED_ARRAY:${obj.length} items]`
    }
    // For simple arrays (like IDs), keep them
    return obj.map(item => sanitizeObject(item, depth + 1))
  }
  
  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {}
    
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (isPHIKey(key)) {
        // Redact PHI fields but indicate they existed
        sanitized[key] = REDACTED
      } else if (isSafeKey(key)) {
        // Keep safe fields as-is (but still recurse for nested objects)
        sanitized[key] = typeof value === "object" ? sanitizeObject(value, depth + 1) : value
      } else if (typeof value === "object" && value !== null) {
        // Unknown object field - recurse but be cautious
        sanitized[key] = sanitizeObject(value, depth + 1)
      } else if (typeof value === "string" && value.length > 100) {
        // Long strings might contain PHI - redact
        sanitized[key] = `[REDACTED_LONG_STRING:${value.length} chars]`
      } else {
        // Keep short primitive values
        sanitized[key] = value
      }
    }
    
    return sanitized
  }
  
  // Primitive values - check if they look like PHI
  if (typeof obj === "string") {
    // Redact strings that look like medicare numbers, phones, or emails
    if (/^\d{10,11}$/.test(obj)) return REDACTED // Medicare/phone
    if (/^[\w.-]+@[\w.-]+\.\w+$/.test(obj)) return REDACTED // Email
    if (obj.length > 200) return `[REDACTED_LONG_STRING:${obj.length} chars]`
  }
  
  return obj
}

/**
 * Sanitize audit log state snapshots to remove PHI
 * 
 * @param state - The state object (previous_state or new_state)
 * @returns Sanitized state safe for audit logging
 */
export function sanitizeAuditState(state: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!state) return null
  return sanitizeObject(state) as Record<string, unknown>
}

/**
 * Sanitize metadata object for audit logging
 * 
 * @param metadata - The metadata object
 * @returns Sanitized metadata safe for audit logging
 */
export function sanitizeAuditMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!metadata) return null
  return sanitizeObject(metadata) as Record<string, unknown>
}

/**
 * Sanitize a complete audit log entry before insertion
 */
export function sanitizeAuditEntry(entry: {
  metadata?: Record<string, unknown> | null
  previous_state?: Record<string, unknown> | null
  new_state?: Record<string, unknown> | null
}): {
  metadata: Record<string, unknown> | null
  previous_state: Record<string, unknown> | null
  new_state: Record<string, unknown> | null
} {
  return {
    metadata: sanitizeAuditMetadata(entry.metadata),
    previous_state: sanitizeAuditState(entry.previous_state),
    new_state: sanitizeAuditState(entry.new_state),
  }
}

// Development assertion - log if PHI might be leaking
export function assertNoPHI(obj: unknown, context: string): void {
  if (process.env.NODE_ENV !== "development") return
  
  const check = (o: unknown, path: string): void => {
    if (!o || typeof o !== "object") return
    
    for (const [key, value] of Object.entries(o as Record<string, unknown>)) {
      const currentPath = `${path}.${key}`
      if (isPHIKey(key) && value !== REDACTED && !String(value).startsWith("[REDACTED")) {
        // eslint-disable-next-line no-console
        console.warn(`[AUDIT PHI WARNING] Potential unsanitized PHI at ${currentPath} in ${context}`)
      }
      if (typeof value === "object" && value !== null) {
        check(value, currentPath)
      }
    }
  }
  
  check(obj, "root")
}
