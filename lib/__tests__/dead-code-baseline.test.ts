import { describe, expect, it } from "vitest"

import {
  assertCanonicalDeadCodeKeys,
  compareDeadCodeKeys,
  normalizeKnipReport,
  serializeKey,
} from "@/scripts/dead-code-baseline-lib"

describe("dead-code baseline", () => {
  it("serializes a normalized issue key", () => {
    expect(
      serializeKey({
        mode: "production",
        issueType: "exports",
        file: "lib/example.ts",
        symbol: "unusedExport",
      }),
    ).toBe("production|exports|lib/example.ts|unusedExport")
  })

  it("normalizes, deduplicates, and sorts Knip JSON issues", () => {
    const report = {
      issues: [
        {
          file: "src/zeta.ts",
          exports: [{ name: "unusedZeta" }],
          types: [{ name: "UnusedType" }],
        },
        {
          file: "src/alpha.ts",
          files: [{ name: "src/alpha.ts" }],
        },
        {
          file: "src/zeta.ts",
          exports: [{ name: "unusedZeta" }],
        },
      ],
    }

    expect(normalizeKnipReport("full", report)).toEqual([
      "full|exports|src/zeta.ts|unusedZeta",
      "full|files|src/alpha.ts|src/alpha.ts",
      "full|types|src/zeta.ts|UnusedType",
    ])
  })

  it("ignores ownership metadata and normalizes duplicate symbol groups", () => {
    const report = {
      issues: [
        {
          file: "src/schema.ts",
          owners: [{ name: "@platform" }],
          duplicates: [[{ name: "SecondarySchema" }, { name: "PrimarySchema" }]],
        },
      ],
    }

    expect(normalizeKnipReport("production", report)).toEqual([
      "production|duplicates|src/schema.ts|PrimarySchema,SecondarySchema",
    ])
  })

  it("accepts an exact baseline match", () => {
    expect(compareDeadCodeKeys(["full|files|a.ts|a.ts"], ["full|files|a.ts|a.ts"])).toEqual({
      newKeys: [],
      staleKeys: [],
    })
  })

  it("reports findings that are new relative to the baseline", () => {
    expect(
      compareDeadCodeKeys(
        ["full|files|a.ts|a.ts", "production|exports|b.ts|unused"],
        ["full|files|a.ts|a.ts"],
      ),
    ).toEqual({
      newKeys: ["production|exports|b.ts|unused"],
      staleKeys: [],
    })
  })

  it("reports baseline entries that Knip no longer finds", () => {
    expect(
      compareDeadCodeKeys(
        ["full|files|a.ts|a.ts"],
        ["full|files|a.ts|a.ts", "production|exports|b.ts|unused"],
      ),
    ).toEqual({
      newKeys: [],
      staleKeys: ["production|exports|b.ts|unused"],
    })
  })

  it("rejects baseline keys that are not sorted and unique", () => {
    expect(() =>
      assertCanonicalDeadCodeKeys([
        "production|files|b.ts|b.ts",
        "full|files|a.ts|a.ts",
        "full|files|a.ts|a.ts",
      ]),
    ).toThrow("sorted and unique")
  })

  it("rejects non-string baseline keys", () => {
    expect(() => assertCanonicalDeadCodeKeys(["full|files|a.ts|a.ts", 42])).toThrow(
      "strings",
    )
  })
})
