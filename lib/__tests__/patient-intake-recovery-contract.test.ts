import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  resolvePatientIntakeNextStep,
  resolvePatientIntakeStatusConfig,
} from "@/components/patient/intake-types"

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

const intakeCardSource = readProjectFile("components/patient/intake-card.tsx")
const intakeDrawerSource = readProjectFile("components/patient/intake-detail-drawer.tsx")
const intakeDetailSource = readProjectFile("app/patient/intakes/[id]/client.tsx")
const intakesListSource = readProjectFile("app/patient/intakes/intakes-client.tsx")
const requestCardSource = readProjectFile("components/patient/request-card.tsx")
const paymentHistorySource = readProjectFile("components/patient/payment-history-content.tsx")
const panelDashboardSource = readProjectFile("components/patient/panel-dashboard.tsx")

describe("patient intake missing-information presentation", () => {
  const heldIntake = {
    status: "checkout_failed",
    payment_recovery_reason: "more_information_required" as const,
  }

  it("overrides checkout failure with calm information-required presentation", () => {
    expect(resolvePatientIntakeStatusConfig(heldIntake).label).toBe("More information needed")
    expect(resolvePatientIntakeNextStep(heldIntake)).toMatchObject({
      actionLabel: "View options",
    })
    expect(resolvePatientIntakeNextStep(heldIntake)?.message).not.toContain("payment again")
  })

  it("preserves ordinary checkout failure retry presentation", () => {
    const ordinaryFailure = {
      status: "checkout_failed",
      payment_recovery_reason: null,
    }

    expect(resolvePatientIntakeStatusConfig(ordinaryFailure).label).toBe("Checkout Failed")
    expect(resolvePatientIntakeNextStep(ordinaryFailure)?.actionLabel).toBe("Try payment again")
  })

  it("uses the patient-safe resolver in every dashboard interaction", () => {
    expect(intakeCardSource).toContain("resolvePatientIntakeStatusConfig(intake)")
    expect(intakeDrawerSource).toContain("resolvePatientIntakeStatusConfig(intake)")
    expect(intakeDrawerSource).toContain("resolvePatientIntakeNextStep(intake)")
  })

  it("projects the safe reason into the requests list without merging raw realtime rows", () => {
    expect(intakesListSource).toContain("paymentRecoveryReason={intake.payment_recovery_reason}")
    expect(intakesListSource).not.toContain("{ ...intake, ...payload.new }")
    expect(requestCardSource).toContain("resolvePatientIntakeStatusConfig")
  })

  it("suppresses visible and query-param retry paths for the held detail", () => {
    expect(intakeDetailSource).toContain("isMoreInformationRequiredPaymentRecovery(intake)")
    expect(intakeDetailSource).toContain("!isMoreInformationRequiredRecovery")
    expect(intakeDetailSource).toContain("Start a fresh request")
    expect(intakeDetailSource).toContain("Contact support")
  })

  it("replaces both payment-history retry affordances with View request", () => {
    expect(paymentHistorySource).toContain('invoice.payment_recovery_reason === "more_information_required"')
    expect(paymentHistorySource).toContain("View request")
    expect(paymentHistorySource).toContain("request_href")
    expect(paymentHistorySource).toContain("canRetryInvoice")
    expect(paymentHistorySource).toContain("payment_retry_blocked")
  })

  it("does not count the clinical hold as stale payment analytics", () => {
    expect(panelDashboardSource).toContain("moreInformationRequiredIntakes")
    expect(panelDashboardSource).toContain("information_required_requests")
    expect(panelDashboardSource).toContain("!isMoreInformationRequiredPaymentRecovery(r)")
  })
})
