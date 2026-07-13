import { resolve } from "node:path"

import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

interface AclViolation {
  function_signature: string
  violation: string
}

for (const envFile of [".env.local", ".env"]) {
  config({ path: resolve(process.cwd(), envFile), override: false, quiet: true })
}

function writeError(message: string): void {
  process.stderr.write(`${message}\n`)
}

function isAclViolation(value: unknown): value is AclViolation {
  if (typeof value !== "object" || value === null) return false

  const record = value as Record<string, unknown>
  return (
    typeof record.function_signature === "string" &&
    typeof record.violation === "string"
  )
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    writeError("SECURITY DEFINER ACL check unavailable: Supabase credentials are not configured.")
    process.exitCode = 1
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  const { data, error } = await supabase.rpc("security_definer_acl_violations")

  if (error) {
    writeError("SECURITY DEFINER ACL check failed: the live catalog verifier was unavailable.")
    process.exitCode = 1
    return
  }

  const result: unknown = data
  if (!Array.isArray(result) || !result.every(isAclViolation)) {
    writeError("SECURITY DEFINER ACL check failed: the live catalog verifier returned an invalid result.")
    process.exitCode = 1
    return
  }

  if (result.length > 0) {
    writeError(`SECURITY DEFINER ACL check failed: ${result.length} violation(s).`)
    for (const violation of result) {
      writeError(`${violation.function_signature}: ${violation.violation}`)
    }
    process.exitCode = 1
    return
  }

  process.stdout.write("SECURITY DEFINER ACL check passed: 0 violations.\n")
}

void main().catch(() => {
  writeError("SECURITY DEFINER ACL check failed unexpectedly.")
  process.exitCode = 1
})
