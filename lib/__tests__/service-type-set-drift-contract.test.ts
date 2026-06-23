/**
 * Service-type Set drift contract.
 *
 * Background: 2026-05-24 shipped a fix for a silent revenue bug where
 * `lib/request/prescribing-identity.ts` `MED_CERT_SERVICE_TYPES` Set was
 * checking for `"med_cert"` (underscore) while the canonical
 * `UnifiedServiceType` per `types/services.ts` is `"med-cert"` (hyphen,
 * matching the /request URL convention). The mismatch meant every med-cert
 * intake hit the prescription identity gate and demanded Medicare +
 * prescribing-only fields. Conversion silently bled out for weeks.
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

import { getDraftCategory, normalizeServiceType } from "@/lib/constants/service-types"
import {
  getParchmentPatientSyncEligibility,
  getParchmentPrescribingEligibility,
  getParchmentScriptCompletionEligibility,
  type ParchmentPrescribingEligibilityState,
} from "@/lib/doctor/parchment-claim"
import { buildDoctorQueueServiceFilter } from "@/lib/doctor/queue-capability-scope"
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

// Subtypes that are gated/blocked from checkout per AGENTS.md
// (BLOCKED_CONSULT_SUBTYPES). Listed here so the contract knows which
// consult subtypes should NOT be Parchment-eligible even if `consult` is
// otherwise valid.
const GATED_CONSULT_SUBTYPES = new Set<string>(["weight_loss"])

describe("service-type Set drift contract", () => {
  // ── requiresPrescribingIdentityForRequest gate ────────────────────────────
  //
  // Rule: med certs do NOT require the full prescribing identity bundle
  // (Medicare-or-IHI + sex + phone). Every other service does. Med cert
  // address is enforced by the checkout details contract instead.
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
  // Repeat-script + new-prescription do. Consult+ED, consult+hair_loss,
  // and consult+womens_health do. Gated subtypes (weight_loss) do not
  // until that service is launched.
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

    it("accepts active consult subtypes (ed, hair_loss, womens_health)", () => {
      const activeConsultSubtypes = ALL_CONSULT_SUBTYPES.filter(
        (s) => !GATED_CONSULT_SUBTYPES.has(s),
      )
      // Sanity: the inventory above must contain the active
      // prescribing consult subtypes; if it shrinks below this, the
      // canonical type changed and other gates need re-auditing.
      expect(activeConsultSubtypes).toEqual(["ed", "hair_loss", "womens_health"])

      for (const subtype of activeConsultSubtypes) {
        const result = getParchmentPrescribingEligibility({
          ...baseIntake(),
          category: "consult",
          subtype,
        })
        expect(result.eligible, `consult subtype=${subtype}`).toBe(true)
      }
    })

    it("rejects gated consult subtypes (weight_loss)", () => {
      for (const subtype of ALL_CONSULT_SUBTYPES) {
        if (!GATED_CONSULT_SUBTYPES.has(subtype)) continue
        const result = getParchmentPrescribingEligibility({
          ...baseIntake(),
          category: "consult",
          subtype,
        })
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
      for (const subtype of ["ed", "hair_loss", "womens_health"]) {
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
        "approved",
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

  // ── buildDoctorQueueServiceFilter ─────────────────────────────────────────
  //
  // The queue filter operates on the `services` table's `service_type`
  // ENUM (db values: "med_certs", "common_scripts", "consults", etc.),
  // NOT the UnifiedServiceType URL values. Different namespace — same
  // bug class would still hurt: an unrecognised type string means doctors
  // see an empty queue. Pin the behaviour through the public API.
  describe("buildDoctorQueueServiceFilter", () => {
    const adminProfile = { role: "admin" as const }
    const doctorProfileAllCapabilities = {
      role: "doctor" as const,
      can_review_med_certs: true,
      can_review_repeat_rx: true,
      can_review_consults: true,
      can_review_ed: true,
      can_review_hair_loss: true,
    }
    const services = [
      { id: "11111111-1111-1111-1111-111111111111", type: "med_certs" },
      { id: "22222222-2222-2222-2222-222222222222", type: "common_scripts" },
      { id: "33333333-3333-3333-3333-333333333333", type: "consults" },
    ]

    it("returns null for admins (admins see all services)", () => {
      expect(buildDoctorQueueServiceFilter(adminProfile, services)).toBeNull()
    })

    it("includes the med_cert service id when the doctor has review_med_certs", () => {
      const filter = buildDoctorQueueServiceFilter(doctorProfileAllCapabilities, services)
      expect(filter).toContain("11111111-1111-1111-1111-111111111111")
    })

    it("includes the consult service id when the doctor has any consult capability", () => {
      const filter = buildDoctorQueueServiceFilter(doctorProfileAllCapabilities, services)
      expect(filter).toContain("33333333-3333-3333-3333-333333333333")
    })

    it("includes the common_scripts service id when the doctor has review_repeat_rx", () => {
      const filter = buildDoctorQueueServiceFilter(doctorProfileAllCapabilities, services)
      expect(filter).toContain("22222222-2222-2222-2222-222222222222")
    })

    it("returns the empty-result sentinel when the doctor has zero capabilities", () => {
      // Doctor capabilities default to true unless explicitly set false
      // (per CLAUDE.md "All default true except can_prescribe_s8"). To
      // simulate a freshly-hired doctor with no verified service lines,
      // every clinical flag must be explicitly false.
      const profile = {
        role: "doctor" as const,
        can_review_med_certs: false,
        can_review_repeat_rx: false,
        can_review_consults: false,
        can_review_ed: false,
        can_review_hair_loss: false,
      }
      const filter = buildDoctorQueueServiceFilter(profile, services)
      expect(filter).toBe("id.is.null")
    })
  })

  // ── Draft category mapping (generate-drafts.ts) ───────────────────────────
  //
  // The DB `services.type` value flows into draft generation via
  // normalizeServiceType -> getDraftCategory. The shared `consult` service row
  // (the parent for ed/hair_loss/womens_health) has type "consult", which is NOT
  // a canonical ServiceType, so normalizeServiceType("consult") is null. It MUST
  // draft as a CONSULT — a med-cert draft for a consult is clinically wrong and
  // was the live bug behind Sentry INSTANTMED-2Q (fixed in #169). Lock it.
  describe("draft category mapping (services.type -> draft category)", () => {
    const expectedDraftByDbServiceType: Record<string, "med_cert" | "repeat_rx" | "consult"> = {
      med_certs: "med_cert",
      common_scripts: "repeat_rx",
      mens_health: "consult",
      womens_health: "consult",
      weight_loss: "consult",
      referrals: "consult",
      pathology: "consult",
      consult: "consult", // stray parent type — must NEVER fall back to a med-cert
    }

    for (const [dbType, expected] of Object.entries(expectedDraftByDbServiceType)) {
      it(`services.type "${dbType}" drafts as "${expected}"`, () => {
        expect(getDraftCategory(normalizeServiceType(dbType))).toBe(expected)
      })
    }

    it("an unmapped / null service type drafts as a consult, never a med-cert", () => {
      expect(normalizeServiceType("consult")).toBeNull()
      expect(getDraftCategory(null)).toBe("consult")
      expect(getDraftCategory(null)).not.toBe("med_cert")
    })
  })

  // ── Audit inventory: other service-type Sets in the codebase ──────────────
  //
  // The 2026-05-24 audit found these other Sets that gate behaviour on
  // service-type / category / subtype strings. Each is either covered by
  // the tests above, OR is in a server-only module that can't be unit
  // tested without restructuring, OR is display-surface code where drift
  // shows up as a generic "request" label instead of breaking a flow.
  //
  // When extending coverage:
  // - Move display-surface gates here once they have a pure helper to test
  // - For server-only modules, extract the predicate into a non-server module
  //   and test the predicate, OR add a `__testOnly` export and import it here
  //
  //   lib/doctor/renewal-detection.ts                PRESCRIPTION_SERVICE_TYPES
  //                                                  (server-only — covered by
  //                                                  the existing repeat-rx
  //                                                  gates indirectly; if
  //                                                  ever extracted, add here)
  //   lib/email/send-status.ts                       formatRequestType (display)
  //   lib/notifications/paid-request-telegram.ts     category aliases (display)
  //   lib/parchment/fulfilment-dashboard.ts          row.category === "prescription"
  //                                                  (single check, low drift
  //                                                  risk; display dashboard)
  //   app/doctor/queue/actions.ts                    getScriptCompletionRequestType
  //                                                  (covered indirectly by the
  //                                                  Parchment tests above)
  //   lib/auth/staff-capabilities.ts                 describeServiceCapability
  //                                                  (display — falls through to
  //                                                  "this service" which is fine)

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

  describe("getParchmentPatientSyncEligibility", () => {
    it("treats approved prescribing cases as active so identity is rechecked before script handoff", () => {
      const result = getParchmentPatientSyncEligibility({
        status: "approved",
        payment_status: "paid",
        category: "consult",
        subtype: "ed",
        serviceType: "consult",
      })

      expect(result.eligible).toBe(true)
    })
  })
})
