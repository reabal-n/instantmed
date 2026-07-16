import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function makeBuildOutput({
  dashboardRouteKb,
  dashboardFirstLoadKb,
}: {
  dashboardRouteKb: number
  dashboardFirstLoadKb: number
}) {
  const routes = [
    ["/request", 25, 158],
    ["/patient", 14, 156],
    ["/dashboard", dashboardRouteKb, dashboardFirstLoadKb],
    ["/admin/intakes", 14.2, 244],
    ["/medical-certificate", 5.26, 310],
    ["/consult", 10.6, 308],
    ["/pricing", 6.55, 307],
    ["/prescriptions", 14.9, 316],
    ["/erectile-dysfunction", 11.9, 313],
    ["/hair-loss", 15.4, 316],
  ] as const

  return [
    "+ First Load JS shared by all 129 kB",
    ...routes.map(([route, routeKb, firstLoadKb]) =>
      `ƒ ${route} ${routeKb} kB ${firstLoadKb} kB`,
    ),
  ].join("\n")
}

function runBundleGate(buildOutput: string) {
  const directory = mkdtempSync(join(tmpdir(), "instantmed-bundle-gate-"))
  const buildOutputPath = join(directory, "next-build-output.txt")
  writeFileSync(buildOutputPath, buildOutput, "utf8")

  try {
    return spawnSync("bash", ["scripts/check-bundle-size.sh"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, BUILD_OUT: buildOutputPath },
    })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe("bundle-size gate", () => {
  it("warns on a high unique route-chunk estimate when real first-load stays safe", () => {
    const result = runBundleGate(
      makeBuildOutput({ dashboardRouteKb: 99, dashboardFirstLoadKb: 389 }),
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain(
      "warning: /dashboard unique route-chunk estimate is 99 kB",
    )
    expect(result.stdout).toContain(
      "ok: /dashboard first-load JS is 389 kB (budget: 400 kB)",
    )
  })

  it("fails when dashboard first-load exceeds its measured ceiling", () => {
    const result = runBundleGate(
      makeBuildOutput({ dashboardRouteKb: 1, dashboardFirstLoadKb: 401 }),
    )

    expect(result.status).toBe(1)
    expect(result.stdout).toContain(
      "FAIL: /dashboard first-load JS is 401 kB (budget: 400 kB)",
    )
  })
})
