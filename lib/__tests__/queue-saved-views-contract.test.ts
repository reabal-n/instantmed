import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { parseQueueSavedView } from "@/lib/dashboard/routes"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("queue saved views contract", () => {
  it("parses the saved queue views used by the dashboard query string", () => {
    expect(parseQueueSavedView("priority")).toBe("priority")
    expect(parseQueueSavedView("scripts")).toBe("scripts")
    expect(parseQueueSavedView("pending_info")).toBe("pending_info")
    expect(parseQueueSavedView("stale")).toBe("stale")
    expect(parseQueueSavedView("mine")).toBe("mine")
    expect(parseQueueSavedView("unknown")).toBe("all")
  })

  it("wires saved views through the canonical dashboard page and queue client", () => {
    const dashboardSource = read("app/dashboard/page.tsx")
    const queueSource = read("app/doctor/queue/queue-client.tsx")
    const filtersSource = read("app/doctor/queue/queue-filters.tsx")

    expect(dashboardSource).toContain("parseQueueSavedView(params.view)")
    expect(dashboardSource).toContain("initialSavedView={initialSavedView}")
    expect(queueSource).toContain("matchesSavedView")
    expect(queueSource).toContain('params.set("view", value)')
    expect(queueSource).toContain("savedViewCounts")
    expect(filtersSource).toContain("Saved views")
    expect(filtersSource).toContain("Priority")
    expect(filtersSource).toContain("Stale")
    expect(filtersSource).toContain("Mine")
  })
})
