/* eslint-disable no-console */
/**
 * Playwright Global Teardown
 * 
 * Runs after all tests to clean up E2E test data.
 * Uses the same E2E_RUN_ID that was generated in global setup.
 */

import { execSync } from "child_process"
import * as fs from "fs"
import * as path from "path"
import * as dotenv from "dotenv"

// Load .env.local for Supabase credentials
dotenv.config({ path: path.join(__dirname, "..", ".env.local") })

// File where global setup stored the E2E_RUN_ID
const RUN_ID_FILE = path.join(__dirname, ".e2e-run-id")

export default async function globalTeardown() {
  let runId = "e2e-test-run-001"
  
  // Read the run ID from the file created by global setup
  if (fs.existsSync(RUN_ID_FILE)) {
    runId = fs.readFileSync(RUN_ID_FILE, "utf-8").trim()
  }

  console.log("\n" + "=".repeat(60))
  console.log("🧹 E2E Global Teardown")
  console.log("=".repeat(60))
  console.log(`E2E_RUN_ID: ${runId}`)
  console.log("")

  try {
    // Run the teardown script
    execSync("pnpm tsx scripts/e2e/teardown.ts", {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
      env: {
        ...process.env,
        E2E_RUN_ID: runId,
      },
    })
    
    console.log("\n✅ Global teardown completed successfully")
    console.log("=".repeat(60) + "\n")
  } catch (error) {
    console.error("\n⚠️ Global teardown encountered errors (non-fatal)")
    console.error(error)
    // Don't throw - teardown errors shouldn't fail the test run
  } finally {
    // Always clean up the run ID file
    if (fs.existsSync(RUN_ID_FILE)) {
      fs.unlinkSync(RUN_ID_FILE)
    }
  }
}
