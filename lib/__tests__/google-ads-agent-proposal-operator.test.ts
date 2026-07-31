import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { readAdsProposalDraftPacket } from "@/lib/ads-agent/proposal-operator"

describe("Google Ads proposal operator packet", () => {
  it("normalizes one exact restricted schedule packet", () => {
    const directory = mkdtempSync(join(tmpdir(), "instantmed-ads-packet-"))
    const packetPath = join(directory, "packet.json")
    writeFileSync(packetPath, JSON.stringify({
      mutationFamily: "schedule_replace",
      operations: [{
        campaignResourceName: "customers/9205010513/campaigns/23651537255",
        expected: [{
          dayOfWeek: "MONDAY",
          endHour: 20,
          endMinute: "ZERO",
          startHour: 8,
          startMinute: "ZERO",
        }],
        kind: "schedule_replace",
        next: [{
          dayOfWeek: "MONDAY",
          endHour: 24,
          endMinute: "ZERO",
          startHour: 0,
          startMinute: "ZERO",
        }],
      }],
      rationale: {
        boundedImpact: "  No budget change; A$20 average daily budget  ",
        campaign: "  IM | Search | Med Certs  ",
        currentValue: "  08:00-20:00 daily  ",
        reason: "  Test qualified after-hours demand as one variable  ",
        requestedValue: "  24/7 daily  ",
        service: "med_certs",
      },
      rollbackPlan: {
        value: "  08:00-20:00 daily  ",
      },
    }))

    try {
      expect(readAdsProposalDraftPacket(packetPath)).toEqual({
        mutationFamily: "schedule_replace",
        operations: [{
          campaignResourceName: "customers/9205010513/campaigns/23651537255",
          expected: [{
            dayOfWeek: "MONDAY",
            endHour: 20,
            endMinute: "ZERO",
            startHour: 8,
            startMinute: "ZERO",
          }],
          kind: "schedule_replace",
          next: [{
            dayOfWeek: "MONDAY",
            endHour: 24,
            endMinute: "ZERO",
            startHour: 0,
            startMinute: "ZERO",
          }],
        }],
        rationale: {
          boundedImpact: "No budget change; A$20 average daily budget",
          campaign: "IM | Search | Med Certs",
          currentValue: "08:00-20:00 daily",
          reason: "Test qualified after-hours demand as one variable",
          requestedValue: "24/7 daily",
          service: "med_certs",
        },
        rollbackPlan: {
          value: "08:00-20:00 daily",
        },
      })
    } finally {
      rmSync(directory, { force: true, recursive: true })
    }
  })
})
