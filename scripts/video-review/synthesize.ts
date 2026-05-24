/**
 * Stage 3: Claude voice-aware synthesis.
 *
 * Model: claude-sonnet-4-20250514. Matches the existing production
 * Claude usage in lib/ai/provider.ts (AI_MODEL_CONFIG.clinical). Sonnet
 * is 5x cheaper than Opus, ~2x faster, and the voice-correction task
 * (structured JSON → markdown in the InstantMed voice) does not need
 * Opus-grade reasoning. To switch to Opus later, swap the constant
 * AND verify the model ID is current on the key's plan.
 *
 * Hardening:
 *   - generateText wrapped in withTimeout (3 min cap) so a hung stream
 *     cannot block the pipeline.
 *   - maxRetries explicitly set on the SDK call.
 *   - Output validated non-empty + minimum length before writing.
 *   - temperature explicitly set to 0.2 - low enough for voice
 *     consistency, high enough to avoid robotic paraphrase. Sonnet
 *     accepts temperature without issue (only the 1M-context Opus
 *     variant deprecated it).
 *
 * Takes the validated Critique JSON and rewrites it as a ranked
 * markdown report in the InstantMed voice. Every sentence is the
 * model's output - never re-uses Gemini's text verbatim because its
 * English bleeds through and breaks the voice guard.
 */

import { readdirSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { join, relative } from "node:path"

import { anthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"

import { withTimeout } from "./retry"
import type { StructuredCritique } from "./schema"
import { SYNTHESIZE_SYSTEM_PROMPT } from "./voice-prompt"

const CLAUDE_MODEL = "claude-sonnet-4-20250514"
const SYNTHESIZE_TIMEOUT_MS = 3 * 60_000
const MIN_REPORT_BYTES = 500

export interface SynthesizeOptions {
  critique: StructuredCritique
  outDir: string
  runId: string
  journeyLabel: string
  capturedUrl: string
  capturedAt: string
  framesDir: string
}

export interface SynthesizeResult {
  reportPath: string
  reportMarkdown: string
}

export async function synthesize(opts: SynthesizeOptions): Promise<SynthesizeResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set (pre-flight should have caught this)")
  }

  console.log(`[synthesize] generating report with ${CLAUDE_MODEL} (timeout ${SYNTHESIZE_TIMEOUT_MS / 1000}s)...`)

  const userMessage = buildUserMessage(opts)

  const { text } = await withTimeout(
    generateText({
      model: anthropic(CLAUDE_MODEL),
      system: SYNTHESIZE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      maxOutputTokens: 4000,
      maxRetries: 3,
      temperature: 0.2,
    }),
    SYNTHESIZE_TIMEOUT_MS,
    "Claude generateText",
  )

  if (!text || text.trim().length < MIN_REPORT_BYTES) {
    throw new Error(
      `Claude returned an unexpectedly short report (${text?.length ?? 0} chars, ` +
        `minimum ${MIN_REPORT_BYTES}). Likely a model refusal or truncation. ` +
        `Re-run with --from-run=${opts.runId} after checking the prompt.`,
    )
  }

  const markdownWithFrames = injectFrameReferences(text, opts.framesDir, opts.outDir)

  const reportPath = join(opts.outDir, "report.md")
  await writeFile(reportPath, markdownWithFrames, "utf8")

  return { reportPath, reportMarkdown: markdownWithFrames }
}

function buildUserMessage(opts: SynthesizeOptions): string {
  return `Rewrite the following Gemini video-review JSON into the InstantMed brand voice. Follow the system-prompt rules exactly.

# Frontmatter values (copy verbatim into the report)

runId: ${opts.runId}
journey: ${opts.journeyLabel}
url: ${opts.capturedUrl}
overallScore: ${opts.critique.overall_score}
capturedAt: ${opts.capturedAt}

# Gemini critique JSON

\`\`\`json
${JSON.stringify(opts.critique, null, 2)}
\`\`\`

Generate the markdown report now. No preamble. Start with the frontmatter block.`
}

/**
 * Append a "Frames" section listing the screenshot stills, sorted by
 * timestamp. Lets readers cross-reference the narrative against
 * captured frames without watching the full webm.
 */
function injectFrameReferences(
  markdown: string,
  framesDir: string,
  reportOutDir: string,
): string {
  try {
    const files: string[] = readdirSync(framesDir)
      .filter((f) => f.endsWith(".png"))
      .sort()
    if (files.length === 0) return markdown
    const relPrefix = relative(reportOutDir, framesDir) || "frames"
    const list = files
      .map((f) => {
        const seconds = parseInt(f.replace(/[^0-9]/g, ""), 10)
        const label = isFinite(seconds) ? `${seconds}s` : f
        return `- [${label}](${relPrefix}/${f})`
      })
      .join("\n")
    return `${markdown.trimEnd()}\n\n## Frames\n\n${list}\n`
  } catch {
    return markdown
  }
}
