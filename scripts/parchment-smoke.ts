#!/usr/bin/env npx tsx
/* eslint-disable no-console */

import path from "node:path"

import dotenv from "dotenv"

import { runParchmentSmokeValidation } from "@/lib/parchment/smoke-runner"

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false, quiet: true })
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false, quiet: true })

async function main(): Promise<void> {
  console.log("Running Parchment production smoke validation...")

  const result = await runParchmentSmokeValidation({ includeSso: true })

  console.log("Parchment production smoke validation passed")
  console.log(`Parchment API host: ${result.apiHost}`)
  if (result.requestId) {
    console.log(`Parchment request id: ${result.requestId}`)
  }
  if (result.sso) {
    console.log(`Parchment SSO expires in: ${result.sso.expiresIn}s`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
