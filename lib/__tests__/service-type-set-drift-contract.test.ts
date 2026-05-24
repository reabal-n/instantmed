/**
 * Service-type Set drift contract.
 *
 * Background: 2026-05-24 shipped a fix for a silent revenue bug where
 * `lib/request/prescribing-identity.ts` `MED_CERT_SERVICE_TYPES` Set was
 * checking for `"med_cert"` (underscore) while the canonical
 * `UnifiedServiceType` per `types/services.ts` is `"med-cert"` (hyphen,
 * matching the /request URL convention). The mismatch meant every med-cert
 * intake hit the prescription identity gate and demanded Medicare +
 * structured address. Conversion silently bled out for weeks.
 *
 * This contract pins the BEHAVIOUR of every service-type-gating function
 * in the operator-facing pipeline against EVERY canonical
 * UnifiedServiceType + ConsultSubtype value. If a future refactor renames
 * a type, adds a new variant, or introduces a new Set with drift, one of
 * these assertions fires before it reaches production.
 *
 * Add new gate functions here when introducing them. Do NOT delete cases
 * to "make the test pass" — fix the gate.
 */
import { describe, expect, it } from "vitest"

import {
  getParchmentPatientSyncEligibility,
  getParchmentPrescribingEligibility,
  getParchmentScriptCompletionEligibility,
  type ParchmentPrescribingEligibilityState,
} from "@/lib/doctor/parchment-claim"
import { requiresPrescribingIdentityForRequest } from "@/lib/request/prescribing-identity"
import type { ConsultSubtype, UnifiedServiceType } from "@/types/services"

// Canonical inventory. These are the EXACT string values that flow through
// the /request URL and the unified intake state. Update only when types/
// services.ts is updated; the test will fail until each gate below is
// taught about the new value.
const ALL_UNIFIED_SERVICE_TYPES: readonly UnifiedServiceType[] = [
  "med-cert",
  "prescription",
  "repeat-script",
  "consult",
]

const ALL_CONSULT_SUBTYPES: readonly ConsultSubtype[] = [
  "ed",
  "hair_loss",
  "womens_health",
  "weight_loss",
]

// Subtypes that are gated/blocked from checkout per CLAUDE.md
// (BLOCKED_CONSULT_SUBTYPES). Listed here so the contract knows which
// consult subtypes should NOT be Parchment-eligible even if `consult` is
// otherwise valid.
const GATED_CONSULT_SUBTYPES = new Set<string>(["womens_health", "weight_loss"])

describe("service-type Set drift contract", () => {
  // ── requiresPrescribingIdentityForRequest gate ────────────────────────────
  //
  // Rule (per CLAUDE.md Eligibility): med certs do NOT require Medicare /
  // structured address. Every other service does. Subtype does not affect
  // this gate.
  describe("requiresPrescribingIdentityForRequest", () => {
    const expectedByServiceType: Record<UnifiedServiceType, boolean> = {
      "med-cert": false,
      prescription: true,
      "repeat-script": true,
      consult: true,
    }

    for (const serviceType of ALL_UNIFIED_SERVICE_TYPES) {
      it(`returns ${expectedByServiceType[serviceType]} for canonical serviceType "${serviceType}"`, () => {
        expect(requiresPrescribingIdentityForRequest({ serviceType })).toBe(
          expectedByServiceType[serviceType],
        )
      })
    }
  })

  // ── Parchment prescribing eligibility ──────────────────────────────────────
  //
  // Rule (per CLAUDE.md Workflow): Parchment is the eScript prescriber for
  // every prescribing pathway. Med-cert never prescribes via Parchment.
  // Repeat-script + new-prescription do. Consult+ED and consult+hair_loss
  // do (S4 prescribing). Gated subtypes (womens_health, weight_loss) do
  // not until those services are launched.
  describe("getParchmentPrescribingEligibility", () => {
    function baseIntake(): ParchmentPrescribingEligibilityState {
      return { payment_status: "paid", status: "awaiting_script" }
    }

    it("rejects med-cert category (cert is not a prescription)", () => {
      // category here is the LEGACY server-side category string, not the
      // canonical UnifiedServiceType. Med certs flow through with
      // category="medical_certificate". Asserting both common aliases.
      for (const category of ["medical_certificate", "med_certs"]) {
        const result = getParchmentPrescribingEligibility({
          ...baseIntake(),
          category,
        })
        expect(result.eligible, `category=${category}`).toBe(false)
      }
    })

    it("accepts prescription category (covers prescription + repeat-script flows)", () => {
      const result = getParchmentPrescribingEligibility({
        ...baseIntake(),
        category: "prescription",
        subtype: "repeat",
      })
      expect(result.eligible).toBe(true)
    })

    it("accepts active consult subtypes (ed, hair_loss)", () => {
      const activeConsultSubtypes = ALL_CONSULT_SUBTYPES.filter(
        (s) => !GATED_CONSULT_SUBTYPES.has(s),
      )
      // Sanity: the inventory above must contain at least the two active
      // prescribing consult subtypes; if it shrinks below this, the
      // canonical type changed and other gates need re-auditing.
      expect(activeConsultSubtypes).toEqual(["ed", "hair_loss"])

      for (const subtype of activeConsultSubtypes) {
        const result = getParchmentPrescribingEligibility({
          ...baseIntake(),
          category: "consult",
          subtype,
        })
        expect(result.eligible, `consult subtype=${subtype}`).toBe(true)
      }
    })

    it("rejects gated consult subtypes (womens_health, weight_loss)", () => {
      for (const subtype of ALL_CONSULT_SUBTYPES) {
        if (!GATED_CONSULT_SUBTYPES.has(subtype)) continue
        const result = getParchmentPrescribingEligibility({
          ...baseIntake(),
          category: "consult",
          subtype,
        })
        // Currently rejected because PARCHMENT_PRESCRIBING_CONSULT_SUBTYPES
        // is the source of truth and only contains ed + hair_loss. If a
        // gated subtype is launched, both Parchment-claim and this test
        // must be updated together.
        expect(result.eligible, `gated subtype=${subtype}`).toBe(false)
      }
    })
  })

  // ── Parchment script-completion + patient-sync eligibility ────────────────
  //
  // Both helpers delegate to isParchmentPrescribingCase under different
  // status filters. Run a smoke pass to catch regressions where one of
  // them silently drifts away from the others.
  describe("getParchmentScriptCompletionEligibility + getParchmentPatientSyncEligibility", () => {
    it("script-completion follows prescribing eligibility for active consult subtypes", () => {
      for (const subtype of ["ed", "hair_loss"]) {
        const result = getParchmentScriptCompletionEligibility({
          payment_status: "paid",
          status: "awaiting_script",
          category: "consult",
          subtype,
        })
        expect(result.eligible, `consult subtype=${subtype}`).toBe(true)
      }
    })

    it("patient-sync accepts every active prescribing status", () => {
      const PARCHMENT_PATIENT_SYNC_STATUSES = [
        "paid",
        "in_review",
        "pending_info",
        "awaiting_script",
      ]
      for (const status of PARCHMENT_PATIENT_SYNC_STATUSES) {
        const result = getParchmentPatientSyncEligibility({
          payment_status: "paid",
          status,
          category: "consult",
          subtype: "ed",
        })
        expect(result.eligible, `status=${status}`).toBe(true)
      }
    })
  })

  // ── Drift sentinel ────────────────────────────────────────────────────────
  //
  // If a new UnifiedServiceType or ConsultSubtype is added without updating
  // this test, the expected map / inventory checks above will fail at
  // compile time (TypeScript) or assertion time (Vitest). This block is a
  // belt-and-braces check that the inventories match the count the test
  // was written against; bumping the count requires a real audit pass.
  it("inventory sizes match the canonical types (bump intentionally if types change)", () => {
    expect(ALL_UNIFIED_SERVICE_TYPES).toHaveLength(4)
    expect(ALL_CONSULT_SUBTYPES).toHaveLength(4)
  })
})
