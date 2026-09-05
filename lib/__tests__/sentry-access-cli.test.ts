import { execFile } from "node:child_process"
import { createServer } from "node:http"
import path from "node:path"
import { promisify } from "node:util"

import { describe, expect, it } from "vitest"

const run = promisify(execFile)

async function checkAccess(
  args: string[],
  responses: Record<string, number>,
) {
  const requests: string[] = []
  const server = createServer((request, response) => {
    const requestPath = request.url || "/"
    requests.push(requestPath)
    response.writeHead(responses[requestPath] ?? 500, { "Content-Type": "application/json" })
    response.end(JSON.stringify({ detail: "private provider response must not be printed" }))
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("Test server did not bind")

  try {
    const command = await run(process.execPath, [
      "--import", "tsx", path.join(process.cwd(), "scripts/check-sentry-access.ts"), ...args,
    ], {
      env: {
        ...process.env,
        SENTRY_AUTH_TOKEN: "synthetic-sentry-access-token",
        SENTRY_ORG: "synthetic-org",
        SENTRY_PROJECT: "synthetic-project",
        SENTRY_API_BASE_URL: `http://127.0.0.1:${address.port}`,
      },
      timeout: 10_000,
    }).then(
      (result) => ({ ...result, code: 0 }),
      (error: { stdout: string; stderr: string; code: number }) => error,
    )
    return { ...command, requests }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

const projectPath = "/api/0/projects/synthetic-org/synthetic-project/"
const issuesPath = `${projectPath}issues/?per_page=1&statsPeriod=24h&environment=production`

describe("Sentry access CLI", () => {
  it("never substitutes release permission for denied issue access", async () => {
    const result = await checkAccess(["--issues"], {
      [projectPath]: 200,
      [issuesPath]: 403,
      [`${projectPath}releases/?per_page=1`]: 200,
    })
    expect(result.code).toBe(1)
    expect(result.stderr).toContain("lacks issue-read access")
    expect(result.requests).toEqual([issuesPath])
    expect(result.stderr).not.toContain("private provider response")
    expect(result.stderr).not.toContain("synthetic-sentry-access-token")
  })

  it("reports production issue-list access only after that endpoint succeeds", async () => {
    const result = await checkAccess(["--issues"], { [issuesPath]: 200 })
    expect(result.code).toBe(0)
    expect(result.stdout).toContain("issue-list read access passed")
    expect(result.requests).toEqual([issuesPath])
    expect(result.stdout).not.toContain("private provider response")
  })

  it("keeps release-only tokens valid for the source-map preflight and labels its scope", async () => {
    const result = await checkAccess([], {
      [projectPath]: 403,
      [`${projectPath}releases/?per_page=1`]: 200,
    })
    expect(result.code).toBe(0)
    expect(result.stdout).toContain("release API")
    expect(result.stdout).toContain("Issue/event read access was not checked")
  })

  it("rejects misspelled modes before contacting Sentry", async () => {
    const result = await checkAccess(["--issue"], { [projectPath]: 200 })
    expect(result.code).toBe(1)
    expect(result.stderr).toContain("Usage:")
    expect(result.requests).toEqual([])
  })
})
