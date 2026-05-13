import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("queue filter simplicity contract", () => {
  it("keeps the staff queue to one status-filter system and search", () => {
    const routesSource = read("lib/dashboard/routes.ts")
    const dashboardSource = read("app/dashboard/page.tsx")
    const queueSource = read("app/doctor/queue/queue-client.tsx")
    const filtersSource = read("app/doctor/queue/queue-filters.tsx")

    expect(routesSource).not.toContain("QUEUE_SAVED_VIEWS")
    expect(routesSource).not.toContain("parseQueueSavedView")
    expect(dashboardSource).not.toContain("parseQueueSavedView")
    expect(dashboardSource).not.toContain("initialSavedView")
    expect(queueSource).not.toContain("QueueSavedView")
    expect(queueSource).not.toContain("matchesSavedView")
    expect(queueSource).not.toContain('params.set("view"')
    expect(queueSource).not.toContain("savedViewCounts")
    expect(filtersSource).not.toContain("Saved views")
    expect(filtersSource).not.toContain("onSavedViewChange")
  })
})
