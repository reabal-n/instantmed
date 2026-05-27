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
 * Takes the validated Gemini + Claude-vision critique JSON and rewrites
 * it as a ranked markdown report in the InstantMed voice. Every sentence
 * is the model's output - never re-uses judge text verbatim because the
 * raw English bleeds through and breaks the voice guard.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { join, relative } from "node:path"

import { generateText } from "ai"

import { getClaudeCredentialSource, getClaudeModel, getClaudeModelLabel } from "./claude-model"
import { withTimeout } from "./retry"
import type { StructuredCritique } from "./schema"
import { SYNTHESIZE_SYSTEM_PROMPT } from "./voice-prompt"

const SYNTHESIZE_TIMEOUT_MS = 3 * 60_000
const MIN_REPORT_BYTES = 500

export interface SynthesizeOptions {
  critique: StructuredCritique
  claudeCritique: StructuredCritique
  outDir: string
  runId: string
  journeyLabel: string
  capturedUrl: string
  capturedAt: string
  framesDir: string
  domEvidencePath?: string
}

export interface SynthesizeResult {
  reportPath: string
  reportMarkdown: string
}

export interface DomEvidenceSnapshot {
  capturedAt: string
  url: string
  title: string
  visibleText: string
  elements: Array<{
    selector: string
    text: string
  }>
}

export async function synthesize(opts: SynthesizeOptions): Promise<SynthesizeResult> {
  if (!getClaudeCredentialSource()) {
    throw new Error("No Claude credential set (pre-flight should have caught this)")
  }

  console.log(`[synthesize] generating report with ${getClaudeModelLabel()} (timeout ${SYNTHESIZE_TIMEOUT_MS / 1000}s)...`)

  const domEvidence = loadDomEvidence(opts)
  const userMessage = buildUserMessage(opts, domEvidence)

  const { text } = await withTimeout(
    generateText({
      model: getClaudeModel(),
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

  const markdownWithFalsePositives = injectModelFalsePositives(text, opts, domEvidence)
  const markdownWithChecklist = injectAcceptanceChecklist(markdownWithFalsePositives, opts, domEvidence)
  const markdownWithDomEvidence = injectDomEvidenceReferences(markdownWithChecklist, domEvidence)
  const markdownWithFrames = injectFrameReferences(markdownWithDomEvidence, opts.framesDir, opts.outDir)

  const reportPath = join(opts.outDir, "report.md")
  await writeFile(reportPath, markdownWithFrames, "utf8")

  return { reportPath, reportMarkdown: markdownWithFrames }
}

function buildUserMessage(opts: SynthesizeOptions, domEvidence: DomEvidenceSnapshot | null): string {
  const combinedScore = Math.round((opts.critique.overall_score + opts.claudeCritique.overall_score) / 2)

  return `Rewrite the following multi-model video-review evidence into the InstantMed brand voice. Follow the system-prompt rules exactly.

You have two independent visual judges:
- Gemini reviewed the full WebM capture.
- Claude Opus 4.7 reviewed the extracted PNG frames from the same capture.

Use both. Prioritise issues that both models agree on. When they disagree, call out the more concrete, frame-grounded evidence. Do not silently average vague claims into the report.
When a model claim conflicts with the DOM/text evidence, mark it as a model false positive instead of a product defect.

# Frontmatter values (copy verbatim into the report)

runId: ${opts.runId}
journey: ${opts.journeyLabel}
url: ${opts.capturedUrl}
overallScore: ${combinedScore}
capturedAt: ${opts.capturedAt}

# Gemini critique JSON

\`\`\`json
${JSON.stringify(opts.critique, null, 2)}
\`\`\`

# Claude Opus 4.7 vision critique JSON

\`\`\`json
${JSON.stringify(opts.claudeCritique, null, 2)}
\`\`\`

# DOM/text evidence captured from the same journey

\`\`\`json
${JSON.stringify(domEvidence ?? { visibleText: "No DOM evidence captured for this run." }, null, 2)}
\`\`\`

Generate the markdown report now. No preamble. Start with the frontmatter block.`
}

function injectAcceptanceChecklist(
  markdown: string,
  opts: SynthesizeOptions,
  domEvidence: DomEvidenceSnapshot | null,
): string {
  if (markdown.includes("## Acceptance Checklist")) return markdown
  const combinedScore = Math.round((opts.critique.overall_score + opts.claudeCritique.overall_score) / 2)
  const rawFindings = [
    ...Object.values(opts.critique.categories).flatMap((category) => category.findings),
    ...Object.values(opts.claudeCritique.categories).flatMap((category) => category.findings),
  ]
  const allFindings = filterContradictedFindings(rawFindings, domEvidence)
  const highSeverityCount = allFindings.filter((finding) => finding.severity >= 4).length
  const text = JSON.stringify([
    ...allFindings,
    ...opts.critique.top_three_actions,
    ...opts.claudeCritique.top_three_actions,
  ]).toLowerCase()
  const shortcutHazard = /\bcmd\+a\b|select-all|select all/.test(text)
  const clippedDecisionText = /clip|clipped|truncat|cut off|viewport edge/.test(text)
  const scoreFloorPassed = combinedScore >= 8
  const line = (passed: boolean, label: string) => `- [${passed ? "x" : " "}] ${label}`

  return `${markdown.trimEnd()}

## Acceptance Checklist

${line(highSeverityCount === 0, "No high-severity findings")}
${line(!shortcutHazard, "No shortcut hazards")}
${line(!clippedDecisionText, "No clipped decision text")}
${line(scoreFloorPassed, "Combined video score at or above 8/10")}
`
}

function loadDomEvidence(opts: SynthesizeOptions): DomEvidenceSnapshot | null {
  const path = opts.domEvidencePath ?? join(opts.outDir, "dom-evidence.json")
  if (!existsSync(path)) return null
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as DomEvidenceSnapshot
    if (!parsed || typeof parsed.visibleText !== "string") return null
    return parsed
  } catch {
    return null
  }
}

type Finding = StructuredCritique["categories"][keyof StructuredCritique["categories"]]["findings"][number]

export function filterContradictedFindings(
  findings: Finding[],
  domEvidence: DomEvidenceSnapshot | null,
): Finding[] {
  if (!domEvidence) return findings
  return findings.filter((finding) => !isContradictedByDomEvidence(finding, domEvidence))
}

function injectModelFalsePositives(
  markdown: string,
  opts: SynthesizeOptions,
  domEvidence: DomEvidenceSnapshot | null,
): string {
  const allFindings = [
    ...Object.values(opts.critique.categories).flatMap((category) => category.findings),
    ...Object.values(opts.claudeCritique.categories).flatMap((category) => category.findings),
  ]
  const contradicted = allFindings.filter((finding) => isContradictedByDomEvidence(finding, domEvidence))
  if (contradicted.length === 0 || markdown.includes("## Model false positives")) return markdown

  const list = contradicted
    .slice(0, 5)
    .map((finding) => `- ${finding.issue}`)
    .join("\n")

  return `${markdown.trimEnd()}

## Model false positives

The DOM/text evidence contradicts these model findings, so they do not count against the acceptance checklist:

${list}
`
}

function injectDomEvidenceReferences(
  markdown: string,
  domEvidence: DomEvidenceSnapshot | null,
): string {
  if (!domEvidence || markdown.includes("## DOM Evidence")) return markdown

  const visibleExcerpt = domEvidence.visibleText
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 700)
  const elementLines = domEvidence.elements
    .slice(0, 8)
    .map((element) => {
      const text = element.text.replace(/\s+/g, " ").trim().slice(0, 140)
      return `- ${element.selector}: ${text}`
    })
    .join("\n")

  return `${markdown.trimEnd()}

## DOM Evidence

Captured from \`dom-evidence.json\` for rendered-truth checks beside the frames.

- URL: ${domEvidence.url}
- Title: ${domEvidence.title || "Untitled"}
- Visible text excerpt: ${visibleExcerpt || "No visible text captured."}

${elementLines || "- No element snippets captured."}
`
}

function isContradictedByDomEvidence(
  finding: Finding,
  domEvidence: DomEvidenceSnapshot | null,
): boolean {
  if (!domEvidence) return false
  const findingText = `${finding.issue} ${finding.recommendation}`.toLowerCase()
  const evidenceText = [
    domEvidence.visibleText,
    ...domEvidence.elements.map((element) => element.text),
  ]
    .join(" ")
    .toLowerCase()

  if (/\b15\s*(?:yo|y\/o|years?\s+old)\b/.test(findingText)) {
    return /\b35\s*(?:y|yo|y\/o|years?\s+old)\b/.test(evidenceText)
  }

  const claimedAges = extractAgeClaims(findingText)
  if (claimedAges.length === 0) return false
  const evidenceAges = extractAgeClaims(evidenceText)
  if (evidenceAges.length === 0) return false
  return claimedAges.every((age) => !evidenceAges.includes(age))
}

function extractAgeClaims(text: string): number[] {
  const ages = new Set<number>()
  for (const match of text.matchAll(/\b(\d{1,3})\s*(?:yo|y\/o|years?\s+old|y\b)/g)) {
    const age = Number(match[1])
    if (Number.isInteger(age) && age >= 0 && age < 130) ages.add(age)
  }
  return [...ages]
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
