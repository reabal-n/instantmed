import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

describe("offline connectivity copy", () => {
  it("uses one truthful global connectivity status", () => {
    const globalStatus = read("components/ui/error-recovery.tsx")
    const requestFlow = read("components/request/request-flow.tsx")

    expect(globalStatus).toContain("No internet connection. Reconnect to continue.")
    expect(globalStatus).toContain("You&apos;re back online")
    expect(globalStatus).not.toMatch(/changes will (?:be saved|sync)/i)
    expect(requestFlow).not.toContain("LazyConnectionBanner")
    expect(requestFlow).not.toContain('import("./connection-banner")')
  })

  it("does not retain a fake PHI-bearing replay queue", () => {
    expect(existsSync(join(process.cwd(), "components/request/connection-banner.tsx"))).toBe(false)
    expect(existsSync(join(process.cwd(), "lib/hooks/use-connection-status.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "lib/offline/queue.ts"))).toBe(false)
  })
})
