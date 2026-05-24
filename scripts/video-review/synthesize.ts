/**
 * Stage 3: Claude Opus 4.7 voice-aware synthesis.
 *
 * Takes the Gemini critique JSON and rewrites it as a ranked markdown
 * report in the InstantMed voice. Every sentence is the model's output;
 * we do not re-use Gemini's text verbatim because its English bleeds
 * through and breaks the voice guard.
 *
 * Gotcha: Claude Opus 4.7 deprecated the `temperature` param. The Vercel
 * AI SDK passes whatever you set; we OMIT it entirely (rely on the model
 * default) so we don't get a 400.
 */

import { readdirSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { join, relative } from "node:path"

import { anthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"

import type { CritiqueResult, StructuredCritique } from "./critique"
import { SYNTHESIZE_SYSTEM_PROMPT } from "./voice-prompt"

const CLAUDE_MODEL = "claude-opus-4-7"

export interface SynthesizeOptions {
  critique: CritiqueResult["critique"]
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
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set (pre-flight should have caught this)")

  console.log(`[synthesize] generating report with ${CLAUDE_MODEL}...`)

  const userMessage = buildUserMessage(opts)

  const { text } = await generateText({
    model: anthropic(CLAUDE_MODEL),
    system: SYNTHESIZE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    maxOutputTokens: 4000,
    // temperature intentionally omitted - claude-opus-4-7 deprecated it
  })

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
 * Append a "Frames" section listing the screenshot stills in the frames/
 * directory, sorted by timestamp. Lets readers cross-reference the
 * Synthesize narrative against the captured frames without watching the
 * full webm.
 *
 * If the model already embedded image references (it shouldn't per
 * voice-prompt rules), this still appends a clean index.
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

// Re-export type for orchestrator convenience
export type { StructuredCritique }
