import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { formatActorType, formatEventType, getAuditEventTypes } from "@/lib/data/types/audit-logs"

const auditClientSource = readFileSync(
  join(process.cwd(), "app/admin/audit/audit-client.tsx"),
  "utf8",
)

describe("audit log display helpers", () => {
  it("exposes doctor request-more-info events for admin audit visibility", () => {
    expect(formatActorType("doctor")).toBe("Doctor")
    expect(formatEventType("request_more_info")).toBe("Request More Info")
    expect(getAuditEventTypes()).toContainEqual({
      value: "request_more_info",
      label: "Request More Info",
    })
  })

  it("lets admins filter and recognise doctor audit events", () => {
    expect(auditClientSource).toContain('<SelectItem value="doctor">Doctor</SelectItem>')
    expect(auditClientSource).toContain("Stethoscope")
  })
})
