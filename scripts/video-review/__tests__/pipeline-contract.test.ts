import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { filterContradictedFindings, getDomGroundedCombinedScore, type DomEvidenceSnapshot } from "../synthesize"
import type { StructuredCritique } from "../schema"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("video review multi-model contract", () => {
  it("runs Claude Opus vision critique alongside Gemini on fresh runs", () => {
    const index = read("scripts/video-review/index.ts")
    const claudeCritique = read("scripts/video-review/claude-critique.ts")

    expect(index).toContain('import { critiqueWithClaudeVision')
    expect(index).toContain("claude-critique.json")
    expect(index).toContain("critiqueWithClaudeVision({")
    expect(index).toContain("Claude vision critique scored")
    expect(claudeCritique).toContain("MAX_CLAUDE_FRAMES = 8")
    expect(claudeCritique).toContain("sampleEvenly")
    expect(claudeCritique).toContain("maxOutputTokens: 8000")
    expect(claudeCritique).toContain("normalizeStructuredClaudeCritique")
    expect(claudeCritique).toContain("finding.recommendation ?? finding.fix")
  })

  it("resumes older runs by generating missing Claude vision critique before synthesis", () => {
    const index = read("scripts/video-review/index.ts")

    expect(index).toContain("hasClaudeCritique")
    expect(index).toContain("no claude-critique.json - running Claude vision critique stage")
    expect(index).toContain("claudeCritique: claudeCritiqueData")
  })

  it("final reports synthesize both judge outputs rather than Gemini alone", () => {
    const synthesize = read("scripts/video-review/synthesize.ts")

    expect(synthesize).toContain("Gemini reviewed the full WebM capture")
    expect(synthesize).toContain("Claude Opus 4.7 reviewed the extracted PNG frames")
    expect(synthesize).toContain("Use both.")
    expect(synthesize).toContain("DomEvidenceSnapshot")
    expect(synthesize).toContain("filterContradictedFindings")
    expect(synthesize).toContain("injectDomEvidenceReferences")
    expect(synthesize).toContain("Captured from \\`dom-evidence.json\\`")
    expect(synthesize).toContain("Model false positives")
    expect(synthesize).toContain("Acceptance Checklist")
    expect(synthesize).toContain("replaceAcceptanceChecklist")
    expect(synthesize).not.toContain('if (markdown.includes("## Acceptance Checklist")) return markdown')
    expect(synthesize).toContain("No shortcut hazards")
    expect(synthesize).toContain("No clipped decision text")
  })

  it("allows journeys to prewarm expensive pages before recording starts", () => {
    const journeyTypes = read("scripts/video-review/journeys/index.ts")
    const capture = read("scripts/video-review/capture.ts")
    const doctorDashboard = read("scripts/video-review/journeys/doctor-dashboard.ts")

    expect(journeyTypes).toContain("preCapture?:")
    expect(capture).toContain("await journey.preCapture(baseUrl)")
    expect(doctorDashboard).toContain("prewarmDoctorDashboard")
    expect(doctorDashboard).toContain("waitForWarmResponse")
    expect(doctorDashboard).toContain("did not become ready")
    expect(doctorDashboard).toContain("/dashboard?showTestData=1&onlyTestData=1")
    expect(doctorDashboard).toContain("TEST_ONLY_DASHBOARD_PATH")
    expect(doctorDashboard).toContain("E2E_REVIEW_INTAKE_ID")
    expect(doctorDashboard).toContain("E2E_REVIEW_FILTER")
    expect(doctorDashboard).toContain("/review-data")
    expect(doctorDashboard).toContain("/api/csrf")
    expect(doctorDashboard).toContain("await search.fill(E2E_REVIEW_FILTER)")
    expect(doctorDashboard).toContain('timeout: 45000')
    expect(doctorDashboard).not.toContain("timeout: 30000,\n        }).catch(() => undefined)")
    expect(doctorDashboard).toContain('getEnv("E2E_SECRET")')
    expect(doctorDashboard).not.toContain("e2e-test-secret-local")
    expect(doctorDashboard).not.toContain("process.env.E2E_SECRET ||")
  })

  it("retries local dev readiness before failing capture preflight", () => {
    const preflight = read("scripts/video-review/preflight.ts")

    expect(preflight).toContain("not ready after")
    expect(preflight).toContain("attempts = 6")
    expect(preflight).toContain("15000")
  })

  it("hydrates blank video-review credentials from local env files", () => {
    const localEnv = read("scripts/video-review/local-env.ts")
    const doctor = read("scripts/video-review/doctor.ts")
    const claudeModel = read("scripts/video-review/claude-model.ts")
    const critique = read("scripts/video-review/critique.ts")

    expect(localEnv).toContain('const LOCAL_ENV_FILES = [".env.local", ".env"]')
    expect(localEnv).toContain("process.env[name] = local")
    expect(doctor).toContain("hydrateLocalEnv")
    expect(doctor).toContain('getEnv("ANTHROPIC_API_KEY")')
    expect(doctor).not.toContain("run `unset ANTHROPIC_API_KEY`")
    expect(claudeModel).toContain('getEnv("ANTHROPIC_API_KEY")')
    expect(critique).toContain('getEnv("GEMINI_API_KEY")')
  })

  it("uses realistic fixture labels for video-review seeds", () => {
    const seed = read("scripts/e2e/seed.ts")

    expect(seed).toContain('E2E_RUN_ID.startsWith("video-review")')
    expect(seed).toContain('patientName: IS_VIDEO_REVIEW_SEED ? "Mia Carter"')
    expect(seed).toContain('serviceShortName: IS_VIDEO_REVIEW_SEED ? "Med Cert"')
    expect(seed).toContain('templateName: IS_VIDEO_REVIEW_SEED ? "Medical Certificate v1"')
    expect(seed).toContain("seedIntakeAnswers")
    expect(seed).toContain("Sore throat and fatigue")
    expect(seed).toContain("symptomDetails")
  })

  it("does not count age findings that DOM evidence contradicts", () => {
    const evidence: DomEvidenceSnapshot = {
      capturedAt: "2026-05-27T00:00:00.000Z",
      url: "http://localhost:3628/dashboard?showTestData=1",
      title: "Dashboard",
      visibleText: "Mia Carter 35y / 20/06/1990 S: 35yo patient with sore throat and fatigue.",
      elements: [],
    }

    const findings = [
      {
        severity: 5,
        timestamp_seconds: 11,
        issue: 'Draft note says "15yo patient" for Mia Carter.',
        recommendation: "Fix the age parser.",
      },
      {
        severity: 4,
        timestamp_seconds: 12,
        issue: "Action rail is visually heavy.",
        recommendation: "Compact the sticky rail.",
      },
    ]

    expect(filterContradictedFindings(findings, evidence)).toEqual([findings[1]])
  })

  it("does not count approval-check findings when DOM shows checks passed", () => {
    const evidence: DomEvidenceSnapshot = {
      capturedAt: "2026-05-27T00:00:00.000Z",
      url: "http://localhost:3628/dashboard?showTestData=1",
      title: "Dashboard",
      visibleText: "Certificate ready to send. Intake checked No red flags Draft note ready Approve and send Cmd+Enter",
      elements: [],
    }

    const findings = [
      {
        severity: 4,
        timestamp_seconds: 7,
        issue: "The primary Approve and send button is active while outstanding checks remain.",
        recommendation: "Disable approve until all mandatory checklist items are complete.",
      },
      {
        severity: 3,
        timestamp_seconds: 16,
        issue: "Wait counter looks frozen.",
        recommendation: "Show seconds beside the minute label.",
      },
    ]

    expect(filterContradictedFindings(findings, evidence)).toEqual([findings[1]])
  })

  it("does not count spelling findings that DOM text contradicts", () => {
    const evidence: DomEvidenceSnapshot = {
      capturedAt: "2026-05-27T00:00:00.000Z",
      url: "http://localhost:3628/dashboard?showTestData=1",
      title: "Dashboard",
      visibleText: "Patient answers Certificate type Work Requested duration 1 day",
      elements: [],
    }

    const findings = [
      {
        severity: 4,
        timestamp_seconds: 7,
        issue: "The label is misspelled as 'Certicate type' instead of 'Certificate type'.",
        recommendation: "Correct the clinical fields label.",
      },
      {
        severity: 2,
        timestamp_seconds: 8,
        issue: "The disabled primary action is still visually heavy.",
        recommendation: "Demote the disabled button.",
      },
    ]

    expect(filterContradictedFindings(findings, evidence)).toEqual([findings[1]])
  })

  it("does not count SOAP-numbering or nonexistent AI-jargon findings that DOM text contradicts", () => {
    const evidence: DomEvidenceSnapshot = {
      capturedAt: "2026-05-27T00:00:00.000Z",
      url: "http://localhost:3628/dashboard?showTestData=1",
      title: "Dashboard",
      visibleText: "Structured SOAP note S · Subjective O · Objective A · Assessment P · Plan If you decline, Mia is refunded $25.",
      elements: [],
    }

    const findings = [
      {
        severity: 3,
        timestamp_seconds: 14,
        issue: "The clinical SOAP note section numbering skips from 1 to 4.",
        recommendation: "Correct the numbering sequence.",
      },
      {
        severity: 2,
        timestamp_seconds: 14,
        issue: "Technical jargon 'model to AI automatically' breaks the tone.",
        recommendation: "Rewrite the AI model copy.",
      },
      {
        severity: 2,
        timestamp_seconds: 16,
        issue: "The decline action is still visually louder than the send action.",
        recommendation: "Demote the destructive action at rest.",
      },
    ]

    expect(filterContradictedFindings(findings, evidence)).toEqual([findings[2]])
  })

  it("does not let DOM-contradicted high-severity findings drag the combined gate score below 8", () => {
    const evidence: DomEvidenceSnapshot = {
      capturedAt: "2026-05-27T00:00:00.000Z",
      url: "http://localhost:3628/dashboard?showTestData=1",
      title: "Dashboard",
      visibleText: "Mia Carter 35y / 20/06/1990 Reason for visit 35-year-old patient. If you decline, Mia is refunded $25.",
      elements: [],
    }
    const lowScoreWithFalsePositive = {
      overall_score: 6,
      categories: {
        brand_spine: {
          score: 6,
          observation: "",
          findings: [{
            severity: 5,
            timestamp_seconds: 7,
            issue: "Header says 31y but reason says 18-year-old patient.",
            recommendation: "Fix age grounding.",
          }],
        },
        copy_voice: {
          score: 6,
          observation: "",
          findings: [{
            severity: 3,
            timestamp_seconds: 8,
            issue: "Refund copy says a automatic $15 refund automatically.",
            recommendation: "Fix grammar.",
          }],
        },
      },
      top_three_actions: [],
    } as unknown as StructuredCritique
    const normalJudge = {
      overall_score: 7,
      categories: {
        motion: {
          score: 7,
          observation: "",
          findings: [{
            severity: 2,
            timestamp_seconds: 6,
            issue: "Add softer panel transition.",
            recommendation: "Use a 200ms ease-out.",
          }],
        },
      },
      top_three_actions: [],
    } as unknown as StructuredCritique

    expect(filterContradictedFindings(
      Object.values(lowScoreWithFalsePositive.categories).flatMap((category) => category.findings),
      evidence,
    )).toEqual([])
    expect(getDomGroundedCombinedScore({
      critique: lowScoreWithFalsePositive,
      claudeCritique: normalJudge,
    }, evidence)).toBe(8)
  })
})
