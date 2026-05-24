/**
 * Stage 2: Gemini 2.5 Pro video critique.
 *
 * Workflow:
 *   1. Upload the .webm to Gemini via the Files API
 *   2. Poll until state === "ACTIVE" (PROCESSING is normal; videos take
 *      several seconds even on the fast path)
 *   3. generateContent with responseSchema for structured JSON
 *   4. Validate the JSON shape before passing downstream
 *   5. On parse/validation failure: write raw response to disk
 *      (critique.raw.txt) so the next iteration can debug without
 *      re-running the upload
 *
 * Returns the parsed structured-critique JSON, also written to
 * <runOutDir>/critique.json.
 */

import { writeFile } from "node:fs/promises"
import { join } from "node:path"

import { GoogleGenAI } from "@google/genai"

import { buildRubricPrompt, RESPONSE_SCHEMA, RUBRIC_CATEGORIES } from "./rubric"

const GEMINI_MODEL = "gemini-2.5-pro"

export interface CritiqueOptions {
  videoPath: string
  outDir: string
  journeyLabel: string
  capturedUrl: string
}

export interface CritiqueResult {
  critique: StructuredCritique
  critiqueJsonPath: string
}

export interface StructuredCritique {
  summary: string
  overall_score: number
  categories: Record<
    string,
    {
      score: number
      observation: string
      findings: Array<{
        severity: number
        timestamp_seconds: number
        issue: string
        recommendation: string
      }>
    }
  >
  top_three_actions: Array<{
    action: string
    why: string
    estimated_impact: "high" | "medium" | "low"
  }>
}

export async function critique(opts: CritiqueOptions): Promise<CritiqueResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY not set (pre-flight should have caught this)")

  const ai = new GoogleGenAI({ apiKey })

  console.log(`[critique] uploading ${opts.videoPath} to Gemini Files API...`)
  const uploaded = await ai.files.upload({
    file: opts.videoPath,
    config: { mimeType: "video/webm" },
  })
  if (!uploaded.name) {
    throw new Error("Gemini Files API returned no file name after upload")
  }
  const fileName = uploaded.name

  console.log(`[critique] polling for ACTIVE state on ${fileName}...`)
  const ready = await pollUntilActive(ai, fileName)
  if (!ready.uri) {
    throw new Error(`Gemini file ${fileName} reached ACTIVE but has no URI`)
  }

  console.log(`[critique] generating critique with ${GEMINI_MODEL}...`)
  const promptText = `${buildRubricPrompt()}\n\n# Capture metadata\n- Journey: ${opts.journeyLabel}\n- URL: ${opts.capturedUrl}\n\nReview the attached video and return the structured JSON.`

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { fileData: { fileUri: ready.uri, mimeType: ready.mimeType ?? "video/webm" } },
          { text: promptText },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  })

  const rawText = response.text ?? ""
  if (!rawText) {
    const debugPath = join(opts.outDir, "critique.raw.txt")
    await writeFile(debugPath, JSON.stringify(response, null, 2), "utf8")
    throw new Error(`Gemini returned empty text. Raw response saved to ${debugPath}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch (err) {
    const debugPath = join(opts.outDir, "critique.raw.txt")
    await writeFile(debugPath, rawText, "utf8")
    throw new Error(
      `Gemini response is not valid JSON. Raw saved to ${debugPath}. Parse error: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }

  const validated = validateCritique(parsed, opts.outDir, rawText)

  const critiqueJsonPath = join(opts.outDir, "critique.json")
  await writeFile(critiqueJsonPath, JSON.stringify(validated, null, 2), "utf8")

  void deleteUploaded(ai, fileName).catch(() => {
    // best-effort cleanup; orphaned files expire after 48h
  })

  return { critique: validated, critiqueJsonPath }
}

/**
 * Poll Gemini Files API until file is ACTIVE. Failure modes:
 *   - PROCESSING for too long → throw with name so user can retry
 *   - FAILED state → throw with the failure reason
 *
 * Backoff: 2s, doubling, capped at 10s. Total budget: ~2 minutes.
 */
async function pollUntilActive(
  ai: GoogleGenAI,
  fileName: string,
): Promise<{ uri: string | undefined; mimeType: string | undefined }> {
  const deadline = Date.now() + 120_000
  let delay = 2000
  while (Date.now() < deadline) {
    const file = await ai.files.get({ name: fileName })
    if (file.state === "ACTIVE") {
      return { uri: file.uri, mimeType: file.mimeType }
    }
    if (file.state === "FAILED") {
      throw new Error(`Gemini file ${fileName} entered FAILED state during processing`)
    }
    await new Promise((r) => setTimeout(r, delay))
    delay = Math.min(delay * 2, 10_000)
  }
  throw new Error(
    `Gemini file ${fileName} did not reach ACTIVE within 120s. Last poll returned non-ACTIVE state.`,
  )
}

/**
 * Light runtime validation. We trust Gemini's structured-output mode
 * to honor responseSchema in the happy path, but defensive parsing
 * protects Stage 3 from a malformed Stage 2.
 */
function validateCritique(
  parsed: unknown,
  outDir: string,
  rawText: string,
): StructuredCritique {
  const errors: string[] = []
  const obj = parsed as Record<string, unknown> | null

  if (!obj || typeof obj !== "object") errors.push("root is not an object")
  else {
    if (typeof obj.summary !== "string") errors.push("summary missing or not string")
    if (typeof obj.overall_score !== "number") errors.push("overall_score missing or not number")
    if (!obj.categories || typeof obj.categories !== "object") {
      errors.push("categories missing or not object")
    } else {
      for (const cat of RUBRIC_CATEGORIES) {
        if (!(cat.key in (obj.categories as Record<string, unknown>))) {
          errors.push(`categories.${cat.key} missing`)
        }
      }
    }
    if (!Array.isArray(obj.top_three_actions) || obj.top_three_actions.length !== 3) {
      errors.push("top_three_actions must be an array of exactly 3 items")
    }
  }

  if (errors.length > 0) {
    void writeFile(join(outDir, "critique.raw.txt"), rawText, "utf8").catch(() => {})
    throw new Error(
      `Gemini JSON failed validation:\n  - ${errors.join("\n  - ")}\nRaw saved to critique.raw.txt`,
    )
  }

  return parsed as StructuredCritique
}

async function deleteUploaded(ai: GoogleGenAI, fileName: string): Promise<void> {
  await ai.files.delete({ name: fileName })
}
