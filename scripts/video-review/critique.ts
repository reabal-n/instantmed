/**
 * Stage 2: Gemini 3.5 Flash video critique.
 *
 * Hardening:
 *   - Upload + every Files API op wrapped in withRetry (3 attempts,
 *     exponential backoff). Gemini's Files API is flaky on transient
 *     5xx and quota throttles.
 *   - generateContent wrapped in a hard 4-minute withTimeout so a hung
 *     stream cannot block the pipeline indefinitely.
 *   - Response parsed + validated through the Zod schema in schema.ts
 *     (single source of truth shared with Gemini's responseSchema).
 *   - On parse OR Zod validation failure: raw text written to disk for
 *     debugging without re-burning the upload cost.
 *   - Best-effort cleanup of the uploaded file regardless of success
 *     path; orphan files expire after 48h.
 *
 * Returns the parsed structured-critique JSON, also written to
 * <runOutDir>/critique.json.
 */

import { writeFile } from "node:fs/promises"
import { join } from "node:path"

import { GoogleGenAI } from "@google/genai"

import { buildRubricPrompt, RESPONSE_SCHEMA } from "./rubric"
import { withRetry, withTimeout } from "./retry"
import { CritiqueSchema, type StructuredCritique } from "./schema"

const GEMINI_MODEL = "gemini-3.5-flash"
const FILE_POLL_BUDGET_MS = 120_000
const GENERATE_TIMEOUT_MS = 4 * 60_000

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

export type { StructuredCritique } from "./schema"

export async function critique(opts: CritiqueOptions): Promise<CritiqueResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY not set (pre-flight should have caught this)")

  const ai = new GoogleGenAI({ apiKey })

  console.log(`[critique] uploading ${opts.videoPath} to Gemini Files API...`)
  const uploaded = await withRetry(
    () => ai.files.upload({ file: opts.videoPath, config: { mimeType: "video/webm" } }),
    { label: "files.upload", attempts: 3, initialDelayMs: 2000 },
  )
  if (!uploaded.name) {
    throw new Error("Gemini Files API returned no file name after upload")
  }
  const fileName = uploaded.name

  console.log(`[critique] polling for ACTIVE state on ${fileName}...`)
  const ready = await pollUntilActive(ai, fileName)
  if (!ready.uri) {
    throw new Error(`Gemini file ${fileName} reached ACTIVE but has no URI`)
  }

  console.log(`[critique] generating critique with ${GEMINI_MODEL} (timeout ${GENERATE_TIMEOUT_MS / 1000}s)...`)
  const promptText = `${buildRubricPrompt()}\n\n# Capture metadata\n- Journey: ${opts.journeyLabel}\n- URL: ${opts.capturedUrl}\n\nReview the attached video and return the structured JSON.`

  const response = await withTimeout(
    withRetry(
      () =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [
            {
              role: "user",
              parts: [
                { fileData: { fileUri: ready.uri!, mimeType: ready.mimeType ?? "video/webm" } },
                { text: promptText },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      {
        label: "models.generateContent",
        attempts: 2,
        initialDelayMs: 5000,
        shouldRetry: isTransientGeminiError,
      },
    ),
    GENERATE_TIMEOUT_MS,
    "Gemini generateContent",
  )

  const rawText = response.text ?? ""
  if (!rawText) {
    const debugPath = join(opts.outDir, "critique.raw.txt")
    await writeFile(debugPath, JSON.stringify(response, null, 2), "utf8")
    void cleanupUpload(ai, fileName)
    throw new Error(`Gemini returned empty text. Raw response saved to ${debugPath}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch (err) {
    const debugPath = join(opts.outDir, "critique.raw.txt")
    await writeFile(debugPath, rawText, "utf8")
    void cleanupUpload(ai, fileName)
    throw new Error(
      `Gemini response is not valid JSON. Raw saved to ${debugPath}. Parse error: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }

  const result = CritiqueSchema.safeParse(parsed)
  if (!result.success) {
    const debugPath = join(opts.outDir, "critique.raw.txt")
    await writeFile(debugPath, rawText, "utf8")
    void cleanupUpload(ai, fileName)
    const issues = result.error.issues
      .slice(0, 8)
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n")
    throw new Error(
      `Gemini JSON failed Zod validation:\n${issues}\nRaw saved to ${debugPath}`,
    )
  }

  const critiqueJsonPath = join(opts.outDir, "critique.json")
  await writeFile(critiqueJsonPath, JSON.stringify(result.data, null, 2), "utf8")

  void cleanupUpload(ai, fileName)

  return { critique: result.data, critiqueJsonPath }
}

/**
 * Poll Gemini Files API until file is ACTIVE. Failure modes:
 *   - PROCESSING for too long → throw with name so user can retry
 *   - FAILED state → throw with the failure reason
 *
 * Backoff: 2s, doubling, capped at 10s. Total budget: 120s.
 * Wrapped in withRetry on the underlying ai.files.get call so a single
 * transient lookup failure does not abort the whole poll.
 */
async function pollUntilActive(
  ai: GoogleGenAI,
  fileName: string,
): Promise<{ uri: string | undefined; mimeType: string | undefined }> {
  const deadline = Date.now() + FILE_POLL_BUDGET_MS
  let delay = 2000
  while (Date.now() < deadline) {
    const file = await withRetry(() => ai.files.get({ name: fileName }), {
      label: `files.get(${fileName})`,
      attempts: 2,
      initialDelayMs: 1000,
    })
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
    `Gemini file ${fileName} did not reach ACTIVE within ${FILE_POLL_BUDGET_MS / 1000}s. Try again.`,
  )
}

/**
 * Cleanup the uploaded file regardless of pipeline success. Orphaned
 * Files API uploads expire after 48h on Google's side; this just keeps
 * the storage list tidy.
 */
async function cleanupUpload(ai: GoogleGenAI, fileName: string): Promise<void> {
  try {
    await ai.files.delete({ name: fileName })
  } catch {
    // best-effort
  }
}

/**
 * Retry only on errors that look transient. Permanent errors (bad
 * model name, bad API key, schema rejection) should fail fast.
 */
function isTransientGeminiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  if (msg.includes("api key") || msg.includes("permission")) return false
  if (msg.includes("not found") && msg.includes("model")) return false
  if (msg.includes("invalid") && msg.includes("schema")) return false
  return (
    msg.includes("rate") ||
    msg.includes("quota") ||
    msg.includes("timeout") ||
    msg.includes("network") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("500") ||
    msg.includes("unavailable") ||
    msg.includes("deadline")
  )
}
