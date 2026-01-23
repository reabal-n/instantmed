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
// Only include tables that actually exist in the production database
const REQUIRED_SCHEMA = {
  profiles: ["id", "auth_user_id", "full_name", "email", "role"],
  intakes: ["id", "patient_id", "service_id", "status", "claimed_by", "claimed_at"],
  intake_answers: ["id", "intake_id", "answers"],
  audit_logs: ["id", "action", "actor_id", "created_at"],
} as const

// Critical RPC functions that must exist
// Note: These are optional - only warn if missing, don't fail
const OPTIONAL_FUNCTIONS = [
  "claim_intake_for_review",
  "release_stale_intake_claims", 
  "get_queue_position",
] as const

// Functions that MUST exist for core functionality
const REQUIRED_FUNCTIONS: readonly string[] = [] as const

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
  
  // Check required RPC functions (errors if missing)
  for (const funcName of REQUIRED_FUNCTIONS) {
    try {
      const { error } = await supabase.rpc(funcName, {})
      if (error && error.message.includes("function") && error.message.includes("does not exist")) {
        errors.push(`RPC function '${funcName}' does not exist`)
      }
    } catch (err) {
      warnings.push(`Could not verify function '${funcName}': ${err instanceof Error ? err.message : "unknown"}`)
    }
  }
  
  // Check optional RPC functions (warnings only if missing)
  for (const funcName of OPTIONAL_FUNCTIONS) {
    try {
      const { error } = await supabase.rpc(funcName, {})
      if (error && error.message.includes("function") && error.message.includes("does not exist")) {
        warnings.push(`Optional RPC function '${funcName}' does not exist`)
      }
    } catch {
      // Ignore errors for optional functions
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    tablesChecked: Object.keys(REQUIRED_SCHEMA).length,
    functionsChecked: REQUIRED_FUNCTIONS.length + OPTIONAL_FUNCTIONS.length,
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
