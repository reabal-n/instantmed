import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it, vi } from "vitest"

import { requestPatientCertificateDownload } from "@/lib/patient/download-certificate"

function response({
  status = 200,
  contentType = "application/pdf",
}: {
  status?: number
  contentType?: string
} = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": contentType }),
    blob: vi.fn(async () => new Blob(["pdf"], { type: contentType })),
  }
}

describe("requestPatientCertificateDownload", () => {
  it.each([
    "app/api/patient/certificates/[id]/download/route.ts",
    "app/api/patient/documents/[intakeId]/download/route.ts",
    "app/api/certificates/[id]/download/route.ts",
  ])("requires a durable audit write before %s releases certificate access", (routePath) => {
    const routeSource = readFileSync(join(process.cwd(), routePath), "utf8")

    expect(routeSource).toContain("await logCertificateEvent")
    expect(routeSource).toContain("auditResult.success")
    expect(routeSource).toContain("x-forwarded-for")
    expect(routeSource).toContain("user-agent")
    expect(routeSource).toContain("Certificate access is temporarily unavailable")
    expect(routeSource).not.toContain("void logCertificateEvent")
  })

  it("records the signed-URL download once at the route with the real requester", () => {
    const dataSource = readFileSync(
      join(process.cwd(), "lib/data/issued-certificates.ts"),
      "utf8",
    )
    const helperStart = dataSource.indexOf("export async function getSecureDownloadUrl")
    const helperEnd = dataSource.indexOf("// CERTIFICATE EDIT TRACKING", helperStart)
    const helperSource = dataSource.slice(helperStart, helperEnd)

    expect(helperStart).toBeGreaterThan(-1)
    expect(helperEnd).toBeGreaterThan(helperStart)
    expect(helperSource).not.toContain("logCertificateEvent")
  })

  it("returns the PDF only after the authenticated app route succeeds", async () => {
    const fetcher = vi.fn(async () => response())

    const result = await requestPatientCertificateDownload({
      href: "/api/patient/certificates/cert-id/download",
      fetcher,
    })

    expect(result.status).toBe("success")
    expect(fetcher).toHaveBeenCalledWith(
      "/api/patient/certificates/cert-id/download",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    )
  })

  it("turns an expired session into a context-preserving sign-in result", async () => {
    const result = await requestPatientCertificateDownload({
      href: "/api/patient/certificates/cert-id/download",
      fetcher: vi.fn(async () => response({ status: 401, contentType: "application/json" })),
    })

    expect(result).toEqual({ status: "unauthorized" })
  })

  it.each([403, 404, 410])("surfaces a patient-readable recovery message for %s", async (status) => {
    const result = await requestPatientCertificateDownload({
      href: "/api/patient/certificates/cert-id/download",
      fetcher: vi.fn(async () => response({ status, contentType: "application/json" })),
    })

    expect(result.status).toBe("error")
    if (result.status === "error") {
      expect(result.message).not.toMatch(/unauthorized|json|status/i)
    }
  })

  it("rejects a successful non-PDF response", async () => {
    await expect(requestPatientCertificateDownload({
      href: "/api/patient/certificates/cert-id/download",
      fetcher: vi.fn(async () => response({ contentType: "text/html" })),
    })).resolves.toEqual({
      status: "error",
      message: "We couldn't open this certificate. Please try again.",
    })
  })
})
