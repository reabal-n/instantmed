import { execFileSync } from "node:child_process"
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { evaluateAutoApprovalEligibility } from "@/lib/clinical/auto-approval"
import {
  checkHighStakesUseCase,
  MAX_MED_CERT_DURATION_DAYS,
} from "@/lib/clinical/intake-validation"
import { getBodyText, getReturnText, getSupportText, renderTemplatePdf } from "@/lib/pdf/template-renderer"

const ROOT = path.resolve(__dirname, "../..")
const EXTENSIONS = new Set([".mdx", ".ts", ".tsx"])

const PUBLIC_MED_CERT_TARGETS = [
  "app/compare",
  "app/alternatives",
  "app/blog",
  "app/employers",
  "app/for",
  "app/locations",
  "app/medical-certificate",
  "app/online-doctor-australia",
  "app/trust",
  "components/marketing",
  "components/seo",
  "content/blog",
  "lib/data",
  "lib/marketing",
  "lib/seo",
]

const UNSUPPORTED_ACCEPTANCE_PATTERNS = [
  /\blegally valid\b/i,
  /\blegal validity\b/i,
  /\blegally equivalent\b/i,
  /\blegally identical\b/i,
  /\bexactly the same legal standing\b/i,
  /\b(?:carry|carries) (?:the )?(?:same|identical) legal weight\b/i,
  /\b(?:carry|carries|has|have|holds?) (?:the )?same legal standing\b/i,
  /\bidentical legal weight\b/i,
  /\bvalid medical certificate\b/i,
  /\baccepted on the same basis\b/i,
  /\bvalid for (?:work|school|university|institutions|court|centrelink|services australia)\b/i,
  /\bcannot reject\b/i,
  /\bcan't reject\b/i,
  /\blegally,? they can'?t reject\b/i,
  /\bmust accept\b/i,
  /\baccept(?:ed|s)? .*without question\b/i,
  /\bmeet(?:s)? (?:all|the same|standard|Services Australia|Centrelink|school|university|retail|mining|platform|documentation) requirements\b/i,
  /\ball required details\b/i,
  /\ball the details employers need\b/i,
  /\beverything HR needs\b/i,
  /\bfitness-for-duty documentation\b/i,
  /\bfit-for-duty documentation\b/i,
  /\bvalid for court purposes\b/i,
  /\bvalid evidence for leave purposes\b/i,
]

const HIGH_STAKES_CLAIM_PATTERNS = [
  /\bInstantMed (?:can|does|will|provides|issues?).{0,120}(?:exam|deferr|special consideration|court|jury|Centrelink|NDIS|WorkCover|workers'? compensation|insurance claim|fitness[- ]?for[- ]?duty|fit[- ]?for[- ]?duty)/i,
  /\bmedical certificates?.{0,120}(?:Centrelink mutual obligation|insurance claims?|platform compliance|official summons|court purposes|fitness[- ]?for[- ]?duty)/i,
]

function walk(target: string, acc: string[] = []): string[] {
  const full = path.join(ROOT, target)
  let st
  try {
    st = statSync(full)
  } catch {
    return acc
  }

  if (st.isFile()) {
    if (EXTENSIONS.has(path.extname(full)) && !full.endsWith(".test.ts") && !full.endsWith(".test.tsx")) {
      acc.push(full)
    }
    return acc
  }

  for (const entry of readdirSync(full)) {
    if (entry.startsWith(".") || entry === "node_modules") continue
    walk(path.join(target, entry), acc)
  }

  return acc
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
}

function findPublicHits(patterns: RegExp[]) {
  const files = PUBLIC_MED_CERT_TARGETS.flatMap((target) => walk(target))
  const hits: Array<{ file: string; line: number; pattern: string; snippet: string }> = []

  for (const file of files) {
    const source = stripComments(readFileSync(file, "utf8"))
    const lines = source.split("\n")
    for (let index = 0; index < lines.length; index++) {
      for (const pattern of patterns) {
        if (pattern.test(lines[index])) {
          const lowerLine = lines[index].toLowerCase()
          const isPrescriptionOnly =
            (lowerLine.includes("escript") || lowerLine.includes("prescription")) &&
            !lowerLine.includes("medical certificate") &&
            !lowerLine.includes("sick certificate")
          const isClearSafetyBoundary =
            lowerLine.includes("does not issue") ||
            lowerLine.includes("do not issue") ||
            lowerLine.includes("doesn't issue") ||
            lowerLine.includes("does not complete") ||
            lowerLine.includes("does not handle") ||
            lowerLine.includes("do not handle") ||
            lowerLine.includes("requires in-person") ||
            lowerLine.includes("need in-person") ||
            lowerLine.includes("need a different pathway") ||
            lowerLine.includes("outside instantmed")
          if (
            isPrescriptionOnly ||
            isClearSafetyBoundary
          ) {
            continue
          }
          hits.push({
            file: path.relative(ROOT, file),
            line: index + 1,
            pattern: pattern.source,
            snippet: lines[index].trim().slice(0, 180),
          })
        }
      }
    }
  }

  return hits
}

function expectNoPublicHits(title: string, patterns: RegExp[]) {
  const hits = findPublicHits(patterns)
  if (hits.length > 0) {
    throw new Error(
      `${title}: ${hits.length} hit(s).\n` +
        hits.map((hit) => `  ${hit.file}:${hit.line} [${hit.pattern}] ${hit.snippet}`).join("\n"),
    )
  }
  expect(hits).toEqual([])
}

const baseCertificateInput = {
  certificateType: "work" as const,
  patientName: "sam martin",
  patientDateOfBirth: "01/02/1990",
  consultationDate: "8 May 2026",
  startDate: "8 May 2026",
  endDate: "8 May 2026",
  certificateRef: "IM-WORK-20260508-12345678",
  issueDate: "08/05/2026",
}

function hasPdfToText() {
  try {
    execFileSync("pdftotext", ["-v"], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

describe("medical certificate medicolegal scope", () => {
  it("keeps public med-cert claims away from guaranteed acceptance or legal-equivalence language", () => {
    expectNoPublicHits("Unsupported certificate acceptance claim", UNSUPPORTED_ACCEPTANCE_PATTERNS)
  })

  it("keeps InstantMed out of high-stakes certificate use-case claims", () => {
    expectNoPublicHits("High-stakes certificate claim", HIGH_STAKES_CLAIM_PATTERNS)
  })

  it("renders certificate body text as simple absence evidence, not a fitness clearance", () => {
    const bodyText = getBodyText(baseCertificateInput)
    const returnText = getReturnText(baseCertificateInput)
    const supportText = getSupportText()
    const combined = `${bodyText}\n${returnText}\n${supportText}`

    expect(bodyText).toContain("I certify that Sam Martin (DOB: 01/02/1990) consulted me on 8 May 2026.")
    expect(bodyText).toContain("Based on my assessment")
    expect(bodyText).toContain("unable to attend their usual work duties")
    expect(returnText).toBe("This certificate relates to the absence date stated above.")
    expect(supportText).toBe("Please get in touch with us if you have any questions.")
    expect(supportText).not.toMatch(/\bsupport@/i)
    expect(supportText).not.toMatch(/\bconcerns\b/i)
    expect(supportText).not.toMatch(/\bdo not hesitate\b/i)
    expect(combined).not.toMatch(/\broutine sick-leave evidence\b/i)
    expect(combined).not.toMatch(/\b(?:workplace restrictions|capacity assessment)\b/i)
    expect(combined).not.toMatch(/\bfit(?:ness)?[- ]?for[- ]?(?:work|duty|drive|fly)\b/i)
    expect(combined).not.toMatch(/\breturn to (?:work|usual duties|usual academic activities)\b/i)
    expect(combined).not.toMatch(/\b(?:exam|deferr|NDIS|court|workers'? compensation|WorkCover|TAC|insurance|firearm|driving|aviation)\b/i)
  })

  it("uses warm doctor-owned wording for work, study, and carer certificates", () => {
    const cases = [
      ["work", "unable to attend their usual work duties"],
      ["study", "unable to attend their usual study activities"],
      ["carer", "required to provide care and support to an immediate family or household member who was unwell"],
    ] as const

    for (const [certificateType, expectedPhrase] of cases) {
      const bodyText = getBodyText({ ...baseCertificateInput, certificateType })

      expect(bodyText).toContain("I certify that Sam Martin (DOB: 01/02/1990) consulted me on 8 May 2026.")
      expect(bodyText).toContain("Based on my assessment")
      expect(bodyText).toContain(expectedPhrase)
      expect(bodyText).not.toMatch(/\breported being unwell\b/i)
      expect(bodyText).not.toMatch(/\broutine (?:sick|study|carer's)[- ]leave evidence\b/i)
    }
  })

  it("renders all certificate types including the support paragraph without overflow", async () => {
    for (const certificateType of ["work", "study", "carer"] as const) {
      const result = await renderTemplatePdf({ ...baseCertificateInput, certificateType })
      expect(result.success, certificateType).toBe(true)
      expect(result.buffer).toBeInstanceOf(Buffer)
    }
  })

  it.runIf(hasPdfToText())("renders the real certificate PDF without clearance or high-stakes wording", async () => {
    const result = await renderTemplatePdf(baseCertificateInput)
    expect(result.success).toBe(true)
    expect(result.buffer).toBeInstanceOf(Buffer)
    const buffer = result.buffer
    if (!buffer) throw new Error("Expected rendered certificate PDF buffer")

    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "instantmed-cert-"))
    const pdfPath = path.join(tmpDir, "certificate.pdf")
    try {
      writeFileSync(pdfPath, buffer)
      const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], { encoding: "utf8" })
      const normalizedText = text.replace(/\s+/g, " ")

      expect(normalizedText).toContain("I certify that Sam Martin")
      expect(normalizedText).toContain("Based on my assessment")
      expect(normalizedText).toContain("This certificate relates to the absence date stated above. Please get in touch with us if you have any questions")
      expect(normalizedText).toContain("To check this certificate")
      expect(normalizedText).not.toMatch(/\btelehealth consultation\b/i)
      expect(normalizedText).not.toMatch(/\bvalid for the purposes stated above\b/i)
      expect(normalizedText).not.toMatch(/\broutine sick-leave evidence\b/i)
      expect(normalizedText).not.toMatch(/\b(?:workplace restrictions|capacity assessment)\b/i)
      expect(normalizedText).not.toMatch(/\bfit(?:ness)?[- ]?for[- ]?(?:work|duty|drive|fly)\b/i)
      expect(normalizedText).not.toMatch(/\breturn to (?:work|usual duties|usual academic activities)\b/i)
      expect(normalizedText).not.toMatch(/\b(?:exam|deferr|NDIS|court|workers'? compensation|WorkCover|TAC|insurance|firearm|driving|aviation)\b/i)
    } finally {
      rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it("hard-blocks high-stakes certificate requests at intake", () => {
    const examples = [
      "I need a certificate for my NDIS review",
      "Need this for a deferred university exam",
      "This is for fitness to drive",
      "Need a certificate of capacity for workers compensation",
      "Need a medical certificate for Centrelink mutual obligations",
      "Need proof for a court hearing",
      "Need a fit for duty clearance for the mine site",
    ]

    for (const example of examples) {
      expect(checkHighStakesUseCase(example), example).toMatchObject({ isHighStakes: true })
    }
  })

  it("prevents auto-approval for high-stakes certificate wording", () => {
    const result = evaluateAutoApprovalEligibility(
      { service_type: "med_certs" },
      {
        symptomDetails: "I have gastro and need this for a fit for duty clearance at work",
        duration: "1",
      },
      { clinicalNote: { status: "ready", content: { flags: { requiresReview: false } } } },
      { date_of_birth: "1990-01-01" },
    )

    expect(MAX_MED_CERT_DURATION_DAYS).toBe(3)
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.join(" ")).toContain("high_stakes_use_case")
  })
})
