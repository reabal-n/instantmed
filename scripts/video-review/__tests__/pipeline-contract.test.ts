import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { filterContradictedFindings, type DomEvidenceSnapshot } from "../synthesize"

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
  })

  it("retries local dev readiness before failing capture preflight", () => {
    const preflight = read("scripts/video-review/preflight.ts")

    expect(preflight).toContain("not ready after")
    expect(preflight).toContain("attempts = 6")
    expect(preflight).toContain("15000")
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
})
