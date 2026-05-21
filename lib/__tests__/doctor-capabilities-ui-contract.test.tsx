import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
  updateDoctorCapabilitiesAction: vi.fn(),
  getSignatureUrlAction: vi.fn(),
  updateDoctorIdentityAction: vi.fn(),
  uploadDoctorSignatureAction: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
    replace: mocks.replace,
    back: mocks.back,
    forward: mocks.forward,
    prefetch: mocks.prefetch,
  }),
  redirect: vi.fn(),
}))

vi.mock("next/link", () => {
  return {
    default: (props: { href: string; children?: React.ReactNode }) =>
      React.createElement("a", { href: props.href }, props.children),
  }
})

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/app/actions/admin-doctor-capabilities", () => ({
  updateDoctorCapabilitiesAction: mocks.updateDoctorCapabilitiesAction,
}))

vi.mock("@/app/actions/admin-settings", () => ({
  getSignatureUrlAction: mocks.getSignatureUrlAction,
  updateDoctorIdentityAction: mocks.updateDoctorIdentityAction,
  uploadDoctorSignatureAction: mocks.uploadDoctorSignatureAction,
}))

import { DoctorProfilesClient } from "@/app/admin/doctors/doctors-client"

const SAMPLE_DOCTOR = {
  id: "doc-1",
  full_name: "Dr Test",
  email: "doc@instantmed.com.au",
  role: "doctor",
  provider_number: null,
  ahpra_number: null,
  certificate_identity_complete: true,
  can_review_med_certs: true,
  can_review_repeat_rx: true,
  can_review_consults: true,
  can_review_ed: true,
  can_review_hair_loss: true,
  can_prescribe_s4: true,
  can_prescribe_s8: false,
  created_at: "2026-05-01T00:00:00Z",
}

describe("DoctorProfilesClient capability UI", () => {
  it("renders a Capabilities column in the practitioners table", () => {
    const html = renderToStaticMarkup(
      <DoctorProfilesClient initialDoctors={[SAMPLE_DOCTOR]} />,
    )
    expect(html).toContain(">Capabilities<")
  })

  it("summarizes capability count on the row when a doctor lacks S8", () => {
    const html = renderToStaticMarkup(
      <DoctorProfilesClient initialDoctors={[SAMPLE_DOCTOR]} />,
    )
    expect(html).toContain("All clinical")
    expect(html).not.toContain("All clinical + S8")
  })

  it("summarizes capability count with full S8 grant", () => {
    const html = renderToStaticMarkup(
      <DoctorProfilesClient
        initialDoctors={[{ ...SAMPLE_DOCTOR, can_prescribe_s8: true }]}
      />,
    )
    expect(html).toContain("All clinical + S8")
  })

  it("counts partial grants as N of 7", () => {
    const html = renderToStaticMarkup(
      <DoctorProfilesClient
        initialDoctors={[
          {
            ...SAMPLE_DOCTOR,
            can_review_med_certs: false,
            can_review_repeat_rx: false,
            can_prescribe_s4: false,
            can_prescribe_s8: false,
          },
        ]}
      />,
    )
    expect(html).toContain("3 of 7")
  })

  it("renders empty rows table without crashing", () => {
    const html = renderToStaticMarkup(<DoctorProfilesClient initialDoctors={[]} />)
    expect(html).toContain("No practitioners found")
  })
})

describe("Doctor capability registry contract", () => {
  // Reads back the capability metadata at module load to assert the ordered
  // list of labels matches the spec. We import the constants by parsing the
  // source so we never drift between the rendered UI and this test.
  it("declares the seven capability flags in the documented order with the documented labels", async () => {
    const fs = await import("node:fs")
    const path = await import("node:path")
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/doctors/doctors-client.tsx"),
      "utf8",
    )

    // Pull the ordered list of {key, label, restricted?} declarations from
    // CAPABILITY_LABELS. This is brittle on purpose: if the order or labels
    // change, the test fires and forces the spec to be updated alongside.
    const match = source.match(/CAPABILITY_LABELS[\s\S]*?\[([\s\S]*?)\]/)
    expect(match).not.toBeNull()
    const block = match![1]

    const orderedKeys = Array.from(block.matchAll(/key:\s*"([^"]+)"/g)).map((m) => m[1])
    expect(orderedKeys).toEqual([
      "can_review_med_certs",
      "can_review_repeat_rx",
      "can_review_consults",
      "can_review_ed",
      "can_review_hair_loss",
      "can_prescribe_s4",
      "can_prescribe_s8",
    ])

    const orderedLabels = Array.from(block.matchAll(/label:\s*"([^"]+)"/g)).map((m) => m[1])
    expect(orderedLabels).toEqual([
      "Review medical certificates",
      "Review repeat prescriptions",
      "Review consults",
      "Review ED consults",
      "Review hair loss consults",
      "Prescribe Schedule 4 (PBS-listed)",
      "Prescribe Schedule 8 (controlled)",
    ])

    // Only S8 carries the AHPRA-restricted caution annotation
    const restrictedKeys = Array.from(
      block.matchAll(/key:\s*"([^"]+)"[^}]*restricted:\s*true/g),
    ).map((m) => m[1])
    expect(restrictedKeys).toEqual(["can_prescribe_s8"])
  })

  it("renders the AHPRA-restricted caution annotation source for S8", async () => {
    const fs = await import("node:fs")
    const path = await import("node:path")
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/doctors/doctors-client.tsx"),
      "utf8",
    )
    expect(source).toContain("Restricted - explicit grant per AHPRA.")
  })

  it("wires the Save button to the updateDoctorCapabilitiesAction server action", async () => {
    const fs = await import("node:fs")
    const path = await import("node:path")
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/doctors/doctors-client.tsx"),
      "utf8",
    )
    expect(source).toMatch(/updateDoctorCapabilitiesAction\(\s*selectedDoctor\.id\s*,\s*capabilityState\s*\)/)
    expect(source).toContain("data-testid=\"save-capabilities\"")
  })
})
