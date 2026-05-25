/**
 * Returning-patient shortcut contract.
 *
 * PR5 (2026-05-25) added a personalised "Start another [last service]"
 * CTA to the patient dashboard's default hero state — surfacing the
 * single most-recent service so a returning patient hits one tap on the
 * dashboard, one tap to pay (identity already auto-skipped by the step
 * registry).
 *
 * This file pins the resolver behaviour so the shortcut can't silently
 * regress to a generic "Pick a service" grid for patients we already know.
 */

import { describe, expect, it } from "vitest"

import { resolveHeroState } from "@/components/patient/dashboard-hero"
import type { Intake } from "@/components/patient/intake-types"

// Use a date >7 days old by default so completed intakes drop out of the
// "documents-ready" hero state and land on "default", where the shortcut lives.
const OLD_DATE = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

function makeIntake(overrides: Partial<Intake> & { id: string }): Intake {
  return {
    status: "completed",
    created_at: OLD_DATE,
    updated_at: OLD_DATE,
    service: { type: "med_certs", name: "Medical Certificate" },
    ...overrides,
  } as Intake
}

describe("returning-patient shortcut contract", () => {
  it("returns no lastService for an empty patient (hero falls through to 'empty')", () => {
    const resolved = resolveHeroState({ intakes: [], prescriptions: [] })
    expect(resolved.state).toBe("empty")
    expect(resolved.lastService).toBeUndefined()
  })

  it("surfaces 'Start another medical certificate' for a med-cert returning patient", () => {
    const resolved = resolveHeroState({
      intakes: [
        makeIntake({
          id: "i1",
          status: "completed",
          service: { type: "med_certs", name: "Medical Certificate" } as Intake["service"],
        }),
      ],
      prescriptions: [],
    })
    expect(resolved.state).toBe("default")
    expect(resolved.lastService?.serviceParam).toBe("med-cert")
    expect(resolved.lastService?.label).toBe("Start another medical certificate")
  })

  it("surfaces 'Repeat a prescription' for a repeat-Rx returning patient", () => {
    const resolved = resolveHeroState({
      intakes: [
        makeIntake({
          id: "i1",
          status: "completed",
          service: { type: "common_scripts", name: "Prescription" } as Intake["service"],
        }),
      ],
      prescriptions: [],
    })
    expect(resolved.state).toBe("default")
    expect(resolved.lastService?.serviceParam).toBe("prescription")
  })

  it("preserves consult subtype (ED) so the deep link skips the picker", () => {
    const resolved = resolveHeroState({
      intakes: [
        makeIntake({
          id: "i1",
          status: "completed",
          service: { type: "consult", name: "ED Consultation" } as Intake["service"],
          subtype: "ed",
        } as Partial<Intake> & { id: string; subtype: string }),
      ],
      prescriptions: [],
    })
    expect(resolved.lastService?.serviceParam).toBe("consult")
    expect(resolved.lastService?.subtype).toBe("ed")
    expect(resolved.lastService?.label).toBe("Start another ED assessment")
  })

  it("preserves consult subtype (hair_loss)", () => {
    const resolved = resolveHeroState({
      intakes: [
        makeIntake({
          id: "i1",
          status: "completed",
          service: { type: "consult", name: "Hair Loss Consultation" } as Intake["service"],
          subtype: "hair_loss",
        } as Partial<Intake> & { id: string; subtype: string }),
      ],
      prescriptions: [],
    })
    expect(resolved.lastService?.serviceParam).toBe("consult")
    expect(resolved.lastService?.subtype).toBe("hair_loss")
  })

  it("uses the most recent intake when the patient has history with multiple services", () => {
    const older = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const newer = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const resolved = resolveHeroState({
      intakes: [
        makeIntake({
          id: "old",
          status: "completed",
          created_at: older,
          updated_at: older,
          service: { type: "med_certs", name: "Medical Certificate" } as Intake["service"],
        }),
        makeIntake({
          id: "new",
          status: "completed",
          created_at: newer,
          updated_at: newer,
          service: { type: "common_scripts", name: "Prescription" } as Intake["service"],
        }),
      ],
      prescriptions: [],
    })
    expect(resolved.lastService?.serviceParam).toBe("prescription")
  })

  it("does NOT override a higher-priority hero state with the shortcut", () => {
    // pending_info beats default, so even though the patient has a last
    // service, the hero owns the moment with "Doctor needs a reply".
    const resolved = resolveHeroState({
      intakes: [
        makeIntake({
          id: "pending",
          status: "pending_info",
          service: { type: "med_certs", name: "Medical Certificate" } as Intake["service"],
        }),
      ],
      prescriptions: [],
    })
    expect(resolved.state).toBe("doctor-question")
    expect(resolved.lastService).toBeUndefined()
  })
})
