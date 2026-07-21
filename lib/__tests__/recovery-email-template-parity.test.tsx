import { readFileSync } from "node:fs"
import { join } from "node:path"

import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  AbandonedCheckoutEmail,
  AbandonedCheckoutFollowupEmail,
  abandonedCheckoutFollowupSubject,
  abandonedCheckoutSubject,
  PartialIntakeRecoveryEmail,
  partialIntakeRecoverySubject,
} from "@/lib/email/components/templates"

const APP_URL = "https://instantmed.com.au"
const RESUME_URL = `${APP_URL}/patient/intakes/11111111-1111-4111-8111-111111111111?retry=true&utm_source=recovery_email`

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

function expectBaseEmailStructure(html: string) {
  expect(html).toContain("logo.png")
  expect(html).toContain("InstantMed Pty Ltd")
  expect(html).toContain("/privacy")
  expect(html).toContain("/terms")
  expect(html).toContain("Manage preferences")
}

function expectRecoveryCopyCompliance(html: string) {
  const forbidden = [
    "Hey",
    "No worries",
    "Last call",
    "90 seconds",
    "under 2 minutes",
    "industry-standard",
    "⚡",
    "⏱️",
    "📝",
    "no call needed",
    "accepted by all employers",
    "guaranteed prescription",
    "—",
  ]

  for (const phrase of forbidden) {
    expect(html.toLowerCase()).not.toContain(phrase.toLowerCase())
  }

  expect(html).toContain("A doctor reviews your request")
  expect(html).toContain("Full refund if the doctor declines")
  expect(html).toContain("ignore this email")
}

describe("service-fault checkout recovery variant", () => {
  const faultHtml = render(
    <AbandonedCheckoutEmail
      patientName="Sam Patient"
      serviceName="Repeat Prescription"
      resumeUrl={RESUME_URL}
      startedAgoLabel="about 140 hours ago"
      appUrl={APP_URL}
      variant="service_fault"
    />,
  )

  it("never tells a patient they stopped, because our checkout is what failed", () => {
    expect(faultHtml).not.toContain("stopped before payment")
    expect(faultHtml).toContain("fault on our side")
    expect(faultHtml).toContain("we are sorry")
  })

  it("omits the elapsed-time label, which reads absurdly on a days-old fault", () => {
    expect(faultHtml).not.toContain("140 hours")
  })

  it("keeps the default variant byte-identical so the live cron is unchanged", () => {
    const withExplicitDefault = render(
      <AbandonedCheckoutEmail
        patientName="Sam Patient"
        serviceName="Repeat Prescription"
        resumeUrl={RESUME_URL}
        startedAgoLabel="about 35 minutes ago"
        appUrl={APP_URL}
        variant="abandoned"
      />,
    )
    const withoutVariantProp = render(
      <AbandonedCheckoutEmail
        patientName="Sam Patient"
        serviceName="Repeat Prescription"
        resumeUrl={RESUME_URL}
        startedAgoLabel="about 35 minutes ago"
        appUrl={APP_URL}
      />,
    )

    expect(withExplicitDefault).toBe(withoutVariantProp)
    expect(withoutVariantProp).toContain("stopped before payment")
    expect(abandonedCheckoutSubject("Repeat Prescription")).toBe("Complete your request")
  })

  it("uses a distinct subject so the fault notice is not read as a nudge", () => {
    expect(abandonedCheckoutSubject("Repeat Prescription", "service_fault")).toBe(
      "Sorry, our checkout failed on your request",
    )
  })
})

describe("recovery email template parity", () => {
  it("exports and previews partial-intake recovery like other lifecycle emails", () => {
    const indexSource = readFileSync(join(process.cwd(), "lib/email/components/templates/index.ts"), "utf8")
    const previewIndexSource = readFileSync(join(process.cwd(), "app/(dev)/email-preview/page.tsx"), "utf8")
    const previewDetailSource = readFileSync(join(process.cwd(), "app/(dev)/email-preview/[template]/page.tsx"), "utf8")

    expect(indexSource).toContain("PartialIntakeRecoveryEmail")
    expect(indexSource).toContain("partialIntakeRecoverySubject")
    expect(previewIndexSource).toContain('slug: "partial-intake-recovery"')
    expect(previewDetailSource).toContain('"partial-intake-recovery"')
  })

  it("renders all recovery templates through BaseEmail with compliant copy", () => {
    const templates = [
      render(
        <PartialIntakeRecoveryEmail
          firstName="Sam"
          serviceName="Medical Certificate"
          resumeUrl={RESUME_URL}
          appUrl={APP_URL}
        />,
      ),
      render(
        <AbandonedCheckoutEmail
          patientName="Sam Patient"
          serviceName="Medical Certificate"
          resumeUrl={RESUME_URL}
          startedAgoLabel="about 35 minutes ago"
          appUrl={APP_URL}
        />,
      ),
      render(
        <AbandonedCheckoutEmail
          patientName="Sam Patient"
          serviceName="Medical Certificate"
          resumeUrl={RESUME_URL}
          startedAgoLabel="about 35 minutes ago"
          appUrl={APP_URL}
          variant="service_fault"
        />,
      ),
      render(
        <AbandonedCheckoutFollowupEmail
          patientName="Sam Patient"
          serviceName="Medical Certificate"
          resumeUrl={RESUME_URL}
          appUrl={APP_URL}
        />,
      ),
    ]

    for (const html of templates) {
      expectBaseEmailStructure(html)
      expectRecoveryCopyCompliance(html)
    }
  })

  it("uses calm subject lines without urgency or cute language", () => {
    expect(partialIntakeRecoverySubject("Medical Certificate")).toBe("Your request is still saved")
    expect(abandonedCheckoutSubject("Medical Certificate")).toBe("Complete your request")
    expect(abandonedCheckoutFollowupSubject("Medical Certificate")).toBe("Still need this request?")
  })
})
