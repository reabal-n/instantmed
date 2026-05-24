/**
 * Stage 3: Claude voice-aware synthesis.
 *
 * Model: claude-opus-4-7 (latest Opus). Matches the production
 * AI_MODEL_CONFIG.clinical in lib/ai/provider.ts. Opus is the right
 * call here because voice rewriting on a regulated-health surface
 * benefits from the extra reasoning - the brand voice rules are
 * specific and the cost of off-voice output is real.
 *
 * Hardening:
 *   - generateText wrapped in withTimeout (3 min cap) so a hung stream
 *     cannot block the pipeline.
 *   - maxRetries explicitly set on the SDK call.
 *   - Output validated non-empty + minimum length before writing.
 *   - temperature OMITTED. claude-opus-4-7 deprecated the param; the
 *     SDK will pass through whatever you set and the API will return
 *     400. Per CLAUDE.md gotcha.
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

const CLAUDE_MODEL = "claude-opus-4-7"
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
      // temperature intentionally omitted - claude-opus-4-7 deprecated it
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
