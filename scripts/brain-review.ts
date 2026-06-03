/* eslint-disable no-console */
/**
 * 3-LLM brain review harness.
 * Sends a review prompt to GPT-5.5 and Gemini via the Vercel AI Gateway and
 * prints each model's independent critique. Opus 4.8 (the orchestrator) adds its
 * own review and reconciles the three.
 *
 * Usage: tsx scripts/brain-review.ts <prompt-file>
 * Auth: VERCEL_OIDC_TOKEN (AI Gateway), same as the blog image generator.
 */
import fs from "node:fs"
import path from "node:path"

import { generateText, gateway } from "ai"
import dotenv from "dotenv"

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false, quiet: true })
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false, quiet: true })
process.env.AI_GATEWAY_API_KEY ||= process.env.VERCEL_AI_GATEWAY_API_KEY

const promptPath = process.argv[2]
if (!promptPath) {
  console.error("usage: tsx scripts/brain-review.ts <prompt-file>")
  process.exit(1)
}
const prompt = fs.readFileSync(promptPath, "utf-8")

// Candidate model IDs per reviewer (first that resolves wins).
const reviewers: Record<string, string[]> = {
  "GPT-5.5": ["openai/gpt-5.5", "openai/gpt-5.1", "openai/gpt-5"],
  Gemini: ["google/gemini-3-pro", "google/gemini-2.5-pro", "google/gemini-2.0-flash"],
}

async function run() {
  for (const [label, ids] of Object.entries(reviewers)) {
    let ok = false
    for (const id of ids) {
      try {
        const { text } = await generateText({
          model: gateway(id),
          prompt,
          temperature: 0.4,
          maxRetries: 1,
        })
        console.log(`\n===== ${label} :: ${id} =====\n`)
        console.log(text.trim())
        console.log(`\n===== end ${label} =====\n`)
        ok = true
        break
      } catch (error) {
        console.log(`[${label}] ${id} unavailable: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    if (!ok) console.log(`[${label}] no candidate model resolved`)
  }
}

run()
