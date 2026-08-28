import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { SPECIALTY_EXPERIENCES } from "@/lib/growth/specialty-experiences"

const PRODUCTION_READY_AT = "2026-08-28T05:13:53.870Z"
const RECEIPT_PATH = join(
  process.cwd(),
  "docs/superpowers/receipts/2026-08-28-specialty-profitability-opening.json",
)

describe("specialty experience opening receipt", () => {
  it("opens active cohorts at the exact production-ready boundary", () => {
    const activeExperiences = SPECIALTY_EXPERIENCES.filter(
      (experience) => experience.status === "active",
    )

    expect(activeExperiences).toHaveLength(2)
    expect(
      activeExperiences.map((experience) => experience.activationTimestamp),
    ).toEqual([PRODUCTION_READY_AT, PRODUCTION_READY_AT])
  })

  it("pins the opening controls and closed pre-window economics immutably", () => {
    expect(existsSync(RECEIPT_PATH)).toBe(true)

    const receipt = JSON.parse(readFileSync(RECEIPT_PATH, "utf8")) as {
      deployment: { commitSha: string; readyAt: string; state: string }
      tracking: {
        state: string
        scaleAllowed: boolean
        reasonCodes: string[]
        evidenceAsOf: string
        sourceRunId: string
      }
      experiences: Array<{
        versionId: string
        service: string
        serviceAvailable: boolean
        priceCents: number
        campaign: { status: string; budgetCentsPerDay: number }
        closedPreWindow: {
          clicks: number
          retainedOrders: number
          firstOrderContributionCents: number
          contributionMargin: number | null
        }
      }>
      constraints: {
        adsMutationsApplied: boolean
        laterApproachesActive: boolean
      }
    }

    expect(receipt.deployment).toMatchObject({
      commitSha: "ad2c450c1fa28b19c953e384d647fec11b42c58f",
      readyAt: PRODUCTION_READY_AT,
      state: "READY",
    })
    expect(receipt.tracking).toEqual({
      state: "GREEN",
      scaleAllowed: true,
      reasonCodes: [],
      evidenceAsOf: "2026-08-27T23:01:00.137Z",
      sourceRunId: "1bc1f6be-63ee-481b-82ef-27eb55d28438",
    })
    expect(receipt.experiences).toEqual([
      expect.objectContaining({
        versionId: "spx_h1_20260828",
        service: "hair_loss",
        serviceAvailable: true,
        priceCents: 4995,
        campaign: expect.objectContaining({
          status: "ENABLED",
          budgetCentsPerDay: 1000,
        }),
        closedPreWindow: expect.objectContaining({
          clicks: 44,
          retainedOrders: 0,
          firstOrderContributionCents: -13232,
          contributionMargin: null,
        }),
      }),
      expect.objectContaining({
        versionId: "spx_e1_20260828",
        service: "ed",
        serviceAvailable: true,
        priceCents: 4995,
        campaign: expect.objectContaining({
          status: "ENABLED",
          budgetCentsPerDay: 1200,
        }),
        closedPreWindow: expect.objectContaining({
          clicks: 97,
          retainedOrders: 8,
          firstOrderContributionCents: 5102,
          contributionMargin: 0.1246,
        }),
      }),
    ])
    expect(receipt.constraints).toEqual({
      adsMutationsApplied: false,
      laterApproachesActive: false,
    })
  })
})
