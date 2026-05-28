/**
 * Stage 2b: Claude Opus vision critique.
 *
 * Gemini reviews the full WebM. Claude reviews the representative PNG
 * frames captured during the same Playwright journey. This keeps every
 * video review multi-model by default while avoiding provider-specific
 * video upload support assumptions.
 *
 * Output: <runOutDir>/claude-critique.json
 */

import { readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { generateText } from "ai"

import { getClaudeCredentialSource, getClaudeModel, getClaudeModelLabel } from "./claude-model"
import { buildRubricPrompt } from "./rubric"
import { RUBRIC_CATEGORIES } from "./rubric-categories"
import { withTimeout } from "./retry"
import { CritiqueSchema, type StructuredCritique } from "./schema"

const CLAUDE_VISION_TIMEOUT_MS = 4 * 60_000
const MAX_CLAUDE_FRAMES = 8

export interface ClaudeCritiqueOptions {
  framesDir: string
  outDir: string
  journeyLabel: string
  capturedUrl: string
}

export interface ClaudeCritiqueResult {
  critique: StructuredCritique
  critiqueJsonPath: string
}

export async function critiqueWithClaudeVision(
  opts: ClaudeCritiqueOptions,
): Promise<ClaudeCritiqueResult> {
  if (!getClaudeCredentialSource()) {
    throw new Error("No Claude credential set (pre-flight should have caught this)")
  }

  const frames = await loadFrames(opts.framesDir)
  if (frames.length === 0) {
    throw new Error(
      `No PNG frames found in ${opts.framesDir}. Claude vision critique needs captured frames.`,
    )
  }

  const claudeModel = await getClaudeModel()
  const claudeModelLabel = await getClaudeModelLabel()

  console.log(
    `[claude-critique] generating vision critique with ${claudeModelLabel} from ${frames.length} frames ` +
      `(timeout ${CLAUDE_VISION_TIMEOUT_MS / 1000}s)...`,
  )

  const promptText = `${buildRubricPrompt()}

# Capture metadata
- Journey: ${opts.journeyLabel}
- URL: ${opts.capturedUrl}
- Source: representative PNG frames extracted from the same Playwright video capture.

Review the attached frames as a chronological screencast. The filename tells you the approximate timestamp. Return the structured JSON only.`
  const schemaReminder = `

# Exact JSON shape
Return this exact shape. Do not rename keys.
{
  "summary": "2-3 sentence overall impression.",
  "overall_score": 1,
  "categories": {
    "brand_spine": { "score": 1, "observation": "Concrete observation.", "findings": [{ "severity": 1, "timestamp_seconds": 0, "issue": "Issue sentence.", "recommendation": "Concrete fix." }] },
    "typography": { "score": 1, "observation": "Concrete observation.", "findings": [] },
    "color_and_surface": { "score": 1, "observation": "Concrete observation.", "findings": [] },
    "motion": { "score": 1, "observation": "Concrete observation.", "findings": [] },
    "copy_voice": { "score": 1, "observation": "Concrete observation.", "findings": [] },
    "hierarchy_and_layout": { "score": 1, "observation": "Concrete observation.", "findings": [] },
    "conversion_friction": { "score": 1, "observation": "Concrete observation.", "findings": [] },
    "signature_devices": { "score": 1, "observation": "Concrete observation.", "findings": [] }
  },
  "top_three_actions": [
    { "action": "Concrete action.", "why": "Specific reason.", "estimated_impact": "high" },
    { "action": "Concrete action.", "why": "Specific reason.", "estimated_impact": "medium" },
    { "action": "Concrete action.", "why": "Specific reason.", "estimated_impact": "low" }
  ]
}`

  try {
    const result = await withTimeout(
      generateText({
        model: claudeModel,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${promptText}${schemaReminder}` },
              ...frames.flatMap((frame) => [
                {
                  type: "text" as const,
                  text: `Frame ${frame.label} (${frame.fileName})`,
                },
                {
                  type: "file" as const,
                  mediaType: "image/png",
                  data: frame.data,
                },
              ]),
            ],
          },
        ],
        maxOutputTokens: 8000,
        maxRetries: 3,
        // Temperature intentionally omitted. Some Claude Opus versions reject it.
      }),
      CLAUDE_VISION_TIMEOUT_MS,
      "Claude vision generateText",
    )

    let parsed: unknown
    try {
      parsed = JSON.parse(extractClaudeJson(result.text))
    } catch (err) {
      const debugPath = join(opts.outDir, "claude-critique.raw.txt")
      await writeFile(debugPath, result.text, "utf8")
      throw new Error(
        `Claude response is not valid JSON. Raw saved to ${debugPath}. Parse error: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
    const validation = CritiqueSchema.safeParse(parsed)
    const repaired = validation.success
      ? validation
      : CritiqueSchema.safeParse(normalizeClaudeCritique(parsed))
    if (!repaired.success) {
      const debugPath = join(opts.outDir, "claude-critique.raw.txt")
      await writeFile(debugPath, result.text, "utf8")
      const issues = repaired.error.issues
        .slice(0, 8)
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n")
      throw new Error(`Claude JSON failed Zod validation:\n${issues}\nRaw saved to ${debugPath}`)
    }

    const critiqueJsonPath = join(opts.outDir, "claude-critique.json")
    await writeFile(critiqueJsonPath, JSON.stringify(repaired.data, null, 2), "utf8")
    return { critique: repaired.data, critiqueJsonPath }
  } catch (err) {
    const debugPath = join(opts.outDir, "claude-critique.error.txt")
    await writeFile(debugPath, err instanceof Error ? err.stack ?? err.message : String(err), "utf8")
    throw new Error(
      `Claude vision critique failed. Error saved to ${debugPath}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }
}

function extractClaudeJson(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  return fenced?.[1]?.trim() ?? trimmed
}

function normalizeClaudeCritique(parsed: unknown): unknown {
  if (!isRecord(parsed)) return parsed
  if (isRecord(parsed.categories)) {
    return normalizeStructuredClaudeCritique(parsed)
  }
  if (!isRecord(parsed.scores) || !isRecord(parsed.findings) || !Array.isArray(parsed.top_actions)) {
    return parsed
  }

  const categories: Record<string, unknown> = {}
  const allIssues: string[] = []

  for (const category of RUBRIC_CATEGORIES) {
    const rawScore = parsed.scores[category.key]
    const rawFindings: unknown[] = Array.isArray(parsed.findings[category.key])
      ? (parsed.findings[category.key] as unknown[])
      : []
    const findings = rawFindings
      .filter(isRecord)
      .map((finding) => {
        const note = String(finding.note ?? finding.issue ?? "")
        if (note) allIssues.push(note)
        return {
          severity: clampScore(Number(finding.severity ?? 2), 1, 5),
          timestamp_seconds: Number(finding.timestamp_seconds ?? finding.timestamp ?? 0),
          issue: note || `Issue observed in ${category.label}.`,
          recommendation: String(finding.recommendation ?? finding.fix ?? (note || `Review ${category.label}.`)),
        }
      })

    categories[category.key] = {
      score: clampScore(Number(rawScore ?? 5), 1, 10),
      observation:
        findings[0]?.issue ??
        `Claude vision did not return a specific ${category.label} observation.`,
      findings,
    }
  }

  const topThree = parsed.top_actions
    .filter(isRecord)
    .slice(0, 3)
    .map((action, index) => ({
      action: String(action.action ?? action.issue ?? `Review action ${index + 1}.`),
      why: String(action.why ?? action.note ?? `Claude ranked this as action ${index + 1}.`),
      estimated_impact: impactFromSeverity(Number(action.severity ?? (index === 0 ? 4 : 3))),
    }))

  while (topThree.length < 3) {
    topThree.push({
      action: "Review the captured dashboard friction.",
      why: "Claude returned fewer than three ranked actions.",
      estimated_impact: "low",
    })
  }

  const scores = Object.values(parsed.scores)
    .map((score) => Number(score))
    .filter((score) => Number.isFinite(score))
  const overall = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 5

  return {
    summary:
      allIssues.slice(0, 2).join(" ") ||
      "Claude vision reviewed the captured frames and found operator-dashboard polish issues.",
    overall_score: clampScore(overall, 1, 10),
    categories,
    top_three_actions: topThree,
  }
}

function normalizeStructuredClaudeCritique(parsed: Record<string, unknown>): unknown {
  const rawCategories = isRecord(parsed.categories) ? parsed.categories : {}
  const categories: Record<string, unknown> = {}

  for (const category of RUBRIC_CATEGORIES) {
    const rawCategory = rawCategories[category.key]
    const raw: Record<string, unknown> = isRecord(rawCategory)
      ? rawCategory
      : {}
    const rawFindings: unknown[] = Array.isArray(raw.findings) ? raw.findings : []
    categories[category.key] = {
      score: clampScore(Number(raw.score ?? 5), 1, 10),
      observation: String(raw.observation ?? `Review ${category.label}.`),
      findings: rawFindings.filter(isRecord).map((finding) => {
        const issue = String(finding.issue ?? finding.note ?? `Issue observed in ${category.label}.`)
        return {
          severity: clampScore(Number(finding.severity ?? 2), 1, 5),
          timestamp_seconds: Number(finding.timestamp_seconds ?? finding.timestamp ?? 0),
          issue,
          recommendation: String(finding.recommendation ?? finding.fix ?? finding.action ?? issue),
        }
      }),
    }
  }

  const rawTopActions = Array.isArray(parsed.top_three_actions) ? parsed.top_three_actions : []
  const topThree = rawTopActions.filter(isRecord).slice(0, 3).map((action, index) => ({
    action: String(action.action ?? `Review action ${index + 1}.`),
    why: String(action.why ?? action.reason ?? `Claude ranked this as action ${index + 1}.`),
    estimated_impact: normalizeImpact(action.estimated_impact, index),
  }))

  while (topThree.length < 3) {
    topThree.push({
      action: "Review the captured dashboard friction.",
      why: "Claude returned fewer than three ranked actions.",
      estimated_impact: "low",
    })
  }

  return {
    summary: String(parsed.summary ?? "Claude vision reviewed the captured frames."),
    overall_score: clampScore(Number(parsed.overall_score ?? 5), 1, 10),
    categories,
    top_three_actions: topThree,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function clampScore(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
}

function impactFromSeverity(severity: number): "high" | "medium" | "low" {
  if (severity >= 4) return "high"
  if (severity >= 3) return "medium"
  return "low"
}

function normalizeImpact(value: unknown, index: number): "high" | "medium" | "low" {
  if (value === "high" || value === "medium" || value === "low") return value
  return index === 0 ? "high" : index === 1 ? "medium" : "low"
}

async function loadFrames(framesDir: string): Promise<
  Array<{ fileName: string; label: string; data: Buffer }>
> {
  const fileNames = (await readdir(framesDir))
    .filter((file) => file.endsWith(".png"))
    .sort()
  const sampledFileNames = sampleEvenly(fileNames, MAX_CLAUDE_FRAMES)

  return Promise.all(
    sampledFileNames.map(async (fileName) => ({
      fileName,
      label: frameLabel(fileName),
      data: await readFile(join(framesDir, fileName)),
    })),
  )
}

function sampleEvenly<T>(items: T[], maxItems: number): T[] {
  if (items.length <= maxItems) return items
  if (maxItems <= 1) return items.slice(0, 1)
  const last = items.length - 1
  const selected: T[] = []
  const seen = new Set<number>()
  for (let i = 0; i < maxItems; i += 1) {
    const index = Math.round((i * last) / (maxItems - 1))
    if (!seen.has(index)) {
      selected.push(items[index] as T)
      seen.add(index)
    }
  }
  return selected
}

function frameLabel(fileName: string): string {
  const seconds = Number.parseInt(fileName.replace(/[^0-9]/g, ""), 10)
  return Number.isFinite(seconds) ? `${seconds}s` : fileName
}
