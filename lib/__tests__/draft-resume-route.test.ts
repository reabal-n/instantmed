import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { buildDraftResumePath } from "@/lib/request/draft-resume-route"

const SESSION_ID = "11111111-1111-4111-8111-111111111111"

describe("draft resume route", () => {
  it("uses canonical public request routes", () => {
    expect(buildDraftResumePath({ serviceType: "med-cert" })).toBe(
      "/request?service=med-cert",
    )
    expect(buildDraftResumePath({ serviceType: "prescription" })).toBe(
      "/request?service=repeat-script",
    )
    expect(
      buildDraftResumePath({ serviceType: "consult", consultSubtype: "ed" }),
    ).toBe("/request?service=consult&subtype=ed")
    expect(
      buildDraftResumePath({ serviceType: "consult", consultSubtype: "hair_loss" }),
    ).toBe("/request?service=consult&subtype=hair_loss")
    expect(
      buildDraftResumePath({ serviceType: "consult", consultSubtype: "womens_health" }),
    ).toBe("/request?service=consult&subtype=womens_health")
  })

  it("adds a validated bearer token with URLSearchParams", () => {
    const path = buildDraftResumePath({
      serviceType: "consult",
      consultSubtype: "ed",
      sessionId: SESSION_ID,
    })

    expect(path).not.toBeNull()
    const url = new URL(path!, "https://instantmed.com.au")
    expect(url.pathname).toBe("/request")
    expect(url.searchParams.get("service")).toBe("consult")
    expect(url.searchParams.get("subtype")).toBe("ed")
    expect(url.searchParams.get("d")).toBe(SESSION_ID)
  })

  it("fails closed for unresumable drafts", () => {
    expect(buildDraftResumePath({ serviceType: "consult" })).toBeNull()
    expect(
      buildDraftResumePath({ serviceType: "consult", consultSubtype: "weight_loss" }),
    ).toBeNull()
    expect(
      buildDraftResumePath({ serviceType: "consult", consultSubtype: "general" }),
    ).toBeNull()
    expect(buildDraftResumePath({ serviceType: "unknown" })).toBeNull()
    expect(
      buildDraftResumePath({ serviceType: "med-cert", sessionId: "not-a-uuid" }),
    ).toBeNull()
  })

  it("keeps local draft navigation on the shared fail-closed route owner", () => {
    const serviceHub = readFileSync(
      join(process.cwd(), "components/request/service-hub-screen.tsx"),
      "utf8",
    )
    const consultFlow = readFileSync(
      join(process.cwd(), "lib/request/consult-flow.ts"),
      "utf8",
    )

    expect(serviceHub).toContain("buildDraftResumePath")
    expect(serviceHub).not.toContain("getConsultDraftResumeHref")
    expect(consultFlow).not.toContain("getConsultDraftResumeHref")
  })
})
