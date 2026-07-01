import { readFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

const root = process.cwd()

const conventionOgFiles = [
  "app/opengraph-image.tsx",
  "app/medical-certificate/opengraph-image.tsx",
] as const

function styleBlocks(source: string): string[] {
  return Array.from(source.matchAll(/style=\{\{([\s\S]*?)\}\}/g), (match) => match[1])
}

describe("convention Open Graph image contracts", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("keeps flex layout declarations explicit for the edge OG renderer", () => {
    for (const file of conventionOgFiles) {
      const source = readFileSync(join(root, file), "utf8")

      for (const block of styleBlocks(source)) {
        if (!/(?:flexDirection|alignItems|justifyContent|gap):/.test(block)) continue

        expect(block, `${file} flex-style block must declare display: flex`).toMatch(
          /display:\s*['"]flex['"]/,
        )
      }
    }
  })

  it("renders the convention OG images without Satori layout failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network disabled for OG image contract")
    }))

    const rootOgImage = await import("@/app/opengraph-image")
    const medCertOgImage = await import("@/app/medical-certificate/opengraph-image")

    for (const [name, createImage] of [
      ["root", rootOgImage.default],
      ["medical-certificate", medCertOgImage.default],
    ] as const) {
      const response = await createImage()

      expect(response.headers.get("content-type"), name).toContain("image/png")
      await expect(response.arrayBuffer(), name).resolves.toBeInstanceOf(ArrayBuffer)
    }
  })
})
