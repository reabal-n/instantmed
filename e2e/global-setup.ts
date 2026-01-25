/**
 * Playwright Global Setup
 * 
 * Runs before all tests to seed the database with E2E test data.
 * Generates a unique E2E_RUN_ID per test run for isolation.
 */

import { execSync } from "child_process"
import { randomUUID } from "crypto"
import * as fs from "fs"
import * as path from "path"
import * as dotenv from "dotenv"

// Load .env.local for Supabase credentials
dotenv.config({ path: path.join(__dirname, "..", ".env.local") })

// File to store the E2E_RUN_ID for this test run
const RUN_ID_FILE = path.join(__dirname, ".e2e-run-id")

export default async function globalSetup() {
  // Generate unique run ID for this test session
  const runId = `e2e-${randomUUID().slice(0, 8)}-${Date.now()}`
  
  // Store run ID for teardown and tests to use
  fs.writeFileSync(RUN_ID_FILE, runId, "utf-8")
  
  // Set environment variable for seed script
  process.env.E2E_RUN_ID = runId

  console.log("\n" + "=".repeat(60))
  console.log("🚀 E2E Global Setup")
  console.log("=".repeat(60))
  console.log(`E2E_RUN_ID: ${runId}`)
  console.log("")

  try {
    // Run the seed script
    execSync("pnpm tsx scripts/e2e/seed.ts", {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
      env: {
        ...process.env,
        E2E_RUN_ID: runId,
      },
    })
    
    console.log("\n✅ Global setup completed successfully")
    console.log("=".repeat(60) + "\n")
  } catch (error) {
    console.error("\n❌ Global setup failed")
    console.error(error)
    // Clean up run ID file on failure
    if (fs.existsSync(RUN_ID_FILE)) {
      fs.unlinkSync(RUN_ID_FILE)
    }
    throw error
  }
}

// Export helper to get the current run ID
export function getE2ERunId(): string {
  if (fs.existsSync(RUN_ID_FILE)) {
    return fs.readFileSync(RUN_ID_FILE, "utf-8").trim()
  }
  return process.env.E2E_RUN_ID || "e2e-test-run-001"
}
