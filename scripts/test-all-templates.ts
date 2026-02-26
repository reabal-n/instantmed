/* eslint-disable no-console -- CLI script */
/**
 * Test script: Generate PDFs from all 3 template types and write to /tmp/
 *
 * Imports the production renderer to ensure test output matches real certificates.
 *
 * Run: npx tsx scripts/test-all-templates.ts
 */
import * as fs from "fs/promises"
import { renderTemplatePdf, type TemplatePdfInput } from "@/lib/pdf/template-renderer"

const CERT_TYPES = ["work", "study", "carer"] as const

const TEST_INPUT: Omit<TemplatePdfInput, "certificateType" | "certificateRef"> = {
  patientName: "Sarah Jane Thompson",
  consultationDate: "19 February 2026",
  startDate: "19 February 2026",
  endDate: "21 February 2026",
  issueDate: "19/02/2026",
}

async function main() {
  console.log("Generating test PDFs for all 3 template types...\n")

  const results: Array<{ type: string; path?: string; ok: boolean; error?: string }> = []

  for (const type of CERT_TYPES) {
    try {
      const result = await renderTemplatePdf({
        ...TEST_INPUT,
        certificateType: type,
        certificateRef: `IM-${type.toUpperCase()}-20260219-08347`,
      })

      if (!result.success || !result.buffer) {
        console.error(`  ${type}: FAILED - ${result.error}`)
        results.push({ type, ok: false, error: result.error })
        continue
      }

      const outputPath = `/tmp/test_${type}_certificate.pdf`
      await fs.writeFile(outputPath, result.buffer)
      console.log(`  ${type}: ${result.buffer.length} bytes -> ${outputPath}`)
      results.push({ type, path: outputPath, ok: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ${type}: FAILED - ${msg}`)
      results.push({ type, ok: false, error: msg })
    }
  }

  console.log("\nDone!")
  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    console.error(`\n${failed.length} template(s) FAILED`)
    process.exit(1)
  }
  console.log("\nAll 3 templates generated successfully. Open the PDFs in /tmp/ to verify visually.")
}

main()
