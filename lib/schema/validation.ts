/**
 * Schema Validation on Startup
 * 
 * Detects drift between code expectations and actual database schema.
 * Runs once at server startup via instrumentation.ts
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("schema-validation")

// Critical tables that must exist with specific columns
const REQUIRED_SCHEMA = {
  profiles: ["id", "auth_user_id", "full_name", "email", "role"],
  intakes: ["id", "patient_id", "service_id", "status", "claimed_by", "claimed_at"],
  intake_answers: ["id", "intake_id", "answers"],
  services: ["id", "name", "slug", "price_cents", "enabled"],
  payments: ["id", "intake_id", "stripe_payment_intent_id", "status"],
  audit_logs: ["id", "action", "actor_id", "intake_id", "created_at"],
} as const

// Critical RPC functions that must exist
const REQUIRED_FUNCTIONS = [
  "claim_intake_for_review",
  "release_stale_intake_claims",
  "get_queue_position",
] as const

export interface SchemaValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  tablesChecked: number
  functionsChecked: number
}

/**
 * Validate database schema matches code expectations
 */
export async function validateSchema(): Promise<SchemaValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  
  const supabase = createServiceRoleClient()
  
  // Check tables and columns
  for (const [tableName, requiredColumns] of Object.entries(REQUIRED_SCHEMA)) {
    try {
      // Query a single row to check if table exists and columns are accessible
      const { error } = await supabase
        .from(tableName)
        .select(requiredColumns.join(","))
        .limit(1)
      
      if (error) {
        if (error.code === "42P01") {
          errors.push(`Table '${tableName}' does not exist`)
        } else if (error.code === "42703") {
          // Column doesn't exist - extract column name from error
          const match = error.message.match(/column ["']?(\w+)["']?/)
          const column = match ? match[1] : "unknown"
          errors.push(`Table '${tableName}' missing column '${column}'`)
        } else {
          warnings.push(`Table '${tableName}': ${error.message}`)
        }
      }
    } catch (err) {
      errors.push(`Failed to check table '${tableName}': ${err instanceof Error ? err.message : "unknown error"}`)
    }
  }
  
  // Check RPC functions
  for (const funcName of REQUIRED_FUNCTIONS) {
    try {
      // Try to call function with invalid params - we just want to check it exists
      // A "function not found" error means it doesn't exist
      // Any other error (like invalid params) means it exists
      const { error } = await supabase.rpc(funcName, {})
      
      // If no error or error is about params, function exists
      if (error && error.message.includes("function") && error.message.includes("does not exist")) {
        errors.push(`RPC function '${funcName}' does not exist`)
      }
      // Ignore other errors - they just mean wrong params which is expected
    } catch (err) {
      // Network errors etc
      warnings.push(`Could not verify function '${funcName}': ${err instanceof Error ? err.message : "unknown"}`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    tablesChecked: Object.keys(REQUIRED_SCHEMA).length,
    functionsChecked: REQUIRED_FUNCTIONS.length,
  }
}

/**
 * Run schema validation and log results
 * Called from instrumentation.ts on server startup
 */
export async function runSchemaValidation(): Promise<void> {
  log.info("Starting schema validation...")
  
  try {
    const result = await validateSchema()
    
    if (result.valid) {
      log.info("Schema validation passed", {
        tablesChecked: result.tablesChecked,
        functionsChecked: result.functionsChecked,
        warnings: result.warnings.length,
      })
      
      // Log warnings if any
      for (const warning of result.warnings) {
        log.warn("Schema warning", { message: warning })
      }
    } else {
      // Log all errors
      for (const error of result.errors) {
        log.error("Schema validation error", { message: error })
      }
      
      // In production, this is critical - fail fast
      if (process.env.NODE_ENV === "production") {
        throw new Error(`Schema validation failed: ${result.errors.join("; ")}`)
      } else {
        log.warn("Schema validation failed (non-production, continuing)", {
          errors: result.errors,
        })
      }
    }
  } catch (err) {
    log.error("Schema validation crashed", {}, err instanceof Error ? err : undefined)
    
    if (process.env.NODE_ENV === "production") {
      throw err
    }
  }
}
