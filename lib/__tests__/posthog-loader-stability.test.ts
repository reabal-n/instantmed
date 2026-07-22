import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

describe("PostHog provider tree stability", () => {
  it("keeps one provider wrapper mounted while the analytics client loads", () => {
    const source = readFileSync(
      join(process.cwd(), "components/providers/posthog-loader.tsx"),
      "utf8",
    )

    expect(source).toContain('import { PostHogProvider } from "./posthog-provider"')
    expect(source).toContain("return <PostHogProvider>{children}</PostHogProvider>")
    expect(source).not.toContain("if (!Provider)")
    expect(source).not.toContain("setProvider")
  })

  it("still defers the heavy analytics client outside post-conversion pages", () => {
    const source = readFileSync(
      join(process.cwd(), "components/providers/posthog-provider.tsx"),
      "utf8",
    )

    expect(source).toContain('import { isPostConversionPathname } from "@/lib/browser/post-conversion-path"')
    expect(source).toMatch(
      /if \(isPostConversionPathname\(pathname\)\) \{\s+exposeClient\(\{ requireLoaded: true \}\)\s+\}/,
    )
    expect(source).toContain("const cancelFirstInteraction = onFirstInteraction")
    expect(source).not.toContain("exposeClient({ requireLoaded: false })")
    // Retry callback + post-conversion gate + first-interaction callback.
    // A fourth call would reintroduce an unconditional eager load.
    expect(source.match(/exposeClient\(\{ requireLoaded: true \}\)/g)).toHaveLength(3)
  })
})
