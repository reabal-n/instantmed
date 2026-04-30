#!/usr/bin/env npx tsx
/* eslint-disable no-console */

import { validateIntegration } from "@/lib/parchment/client"
import { assertParchmentSmokeConfig } from "@/lib/parchment/smoke"

async function main(): Promise<void> {
  const config = assertParchmentSmokeConfig()

  console.log("Running Parchment sandbox smoke validation...")
  console.log(`Endpoint: ${config.apiUrl}`)

  const result = await validateIntegration(config.userId)
  if (!result.validated) {
    throw new Error("Parchment validation endpoint returned validated=false")
  }

  console.log("Parchment sandbox smoke validation passed")
  if (result.requestId) {
    console.log(`Parchment request id: ${result.requestId}`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
