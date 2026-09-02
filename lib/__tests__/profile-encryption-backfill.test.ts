import { execFile } from "node:child_process"
import { createServer } from "node:http"
import { promisify } from "node:util"

import { expect, it } from "vitest"

import { SEEDED_E2E_PATIENT_PROFILE_IDS } from "@/lib/data/seeded-e2e-data"

const execFileAsync = promisify(execFile)
const TEST_ENCRYPTION_KEY = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
const SEEDED_E2E_STAFF_PROFILE_IDS = [
  "e2e00000-0000-0000-0000-000000000001",
  "e2e00000-0000-0000-0000-000000000003",
  "e2e00000-0000-0000-0000-000000000004",
] as const

it("backfills a missing phone twin when another PHI field already set the profile encryption timestamp", async () => {
  const profile = {
    date_of_birth: "1985-04-01",
    date_of_birth_encrypted: "encrypted-dob",
    id: "00000000-0000-4000-8000-000000000001",
    medicare_number: "2123456701",
    medicare_number_encrypted: "encrypted-medicare",
    phi_encrypted_at: "2026-08-01T00:00:00.000Z",
    phone: "0400000000",
    phone_encrypted: null,
  }

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host}`)
    if (requestUrl.pathname !== "/rest/v1/profiles") {
      response.writeHead(404).end()
      return
    }

    const incorrectlyExcludedBySharedTimestamp =
      requestUrl.searchParams.get("phi_encrypted_at") === "is.null"
    const rows = incorrectlyExcludedBySharedTimestamp ? [] : [profile]
    response.setHeader("Content-Range", rows.length === 0 ? "*/0" : "0-0/1")

    if (request.method === "HEAD") {
      response.writeHead(200).end()
      return
    }

    response.setHeader("Content-Type", "application/json")
    response.writeHead(200).end(JSON.stringify(rows))
  })

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Failed to start the test Supabase server")
  }

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["--import", "tsx", "scripts/encrypt-phi-backfill.ts", "--dry"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ENCRYPTION_KEY: TEST_ENCRYPTION_KEY,
          NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${address.port}`,
          NODE_OPTIONS: [process.env.NODE_OPTIONS, "--conditions=react-server"].filter(Boolean).join(" "),
          SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
        },
      },
    )

    expect(stdout).toContain("Found 1 profiles needing encryption")
    expect(stdout).toContain("Total profiles processed: 1")
    expect(stdout).toContain("Successfully encrypted: 1")
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
  }
}, 15_000)

it("continues to later profiles when an earlier backfill update fails", async () => {
  const firstProfile = {
    date_of_birth: null,
    date_of_birth_encrypted: null,
    id: "00000000-0000-4000-8000-000000000001",
    medicare_number: null,
    medicare_number_encrypted: null,
    phi_encrypted_at: null,
    phone: "0400000001",
    phone_encrypted: null,
  }
  const secondProfile = {
    ...firstProfile,
    id: "00000000-0000-4000-8000-000000000002",
    phone: "0400000002",
  }
  const attemptedProfileIds: string[] = []

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host}`)

    if (requestUrl.pathname === "/rest/v1/profiles" && request.method === "HEAD") {
      response.setHeader("Content-Range", "0-1/2")
      response.writeHead(200).end()
      return
    }

    if (requestUrl.pathname === "/rest/v1/profiles" && request.method === "GET") {
      const afterId = requestUrl.searchParams
        .getAll("id")
        .find((value) => value.startsWith("gt."))
      const row = afterId?.startsWith("gt.") ? secondProfile : firstProfile
      response.setHeader("Content-Range", "0-0/1")
      response.setHeader("Content-Type", "application/json")
      response.writeHead(200).end(JSON.stringify([row]))
      return
    }

    if (requestUrl.pathname === "/rest/v1/profiles" && request.method === "PATCH") {
      const profileId = requestUrl.searchParams.get("id")?.replace(/^eq\./, "") || ""
      attemptedProfileIds.push(profileId)
      if (profileId === firstProfile.id) {
        response.setHeader("Content-Type", "application/json")
        response.writeHead(400).end(JSON.stringify({
          code: "TEST_FAILURE",
          details: null,
          hint: null,
          message: "synthetic update failure",
        }))
        return
      }
      response.writeHead(204).end()
      return
    }

    if (requestUrl.pathname === "/rest/v1/encryption_migration_status" && request.method === "POST") {
      response.setHeader("Content-Type", "application/json")
      response.writeHead(201).end(JSON.stringify({ id: "00000000-0000-4000-8000-000000000010" }))
      return
    }

    if (requestUrl.pathname === "/rest/v1/encryption_migration_status" && request.method === "PATCH") {
      response.writeHead(204).end()
      return
    }

    response.writeHead(404).end()
  })

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Failed to start the test Supabase server")
  }

  try {
    let stdout = ""
    try {
      const execution = await execFileAsync(
        process.execPath,
        ["--import", "tsx", "scripts/encrypt-phi-backfill.ts", "--batch=1"],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            ENCRYPTION_KEY: TEST_ENCRYPTION_KEY,
            NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${address.port}`,
            NODE_OPTIONS: [process.env.NODE_OPTIONS, "--conditions=react-server"].filter(Boolean).join(" "),
            SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
          },
        },
      )
      stdout = execution.stdout
    } catch (error) {
      const executionError = error as Error & { stderr?: string; stdout?: string }
      stdout = executionError.stdout || ""
    }

    expect(attemptedProfileIds).toEqual([firstProfile.id, secondProfile.id])
    expect(stdout).toContain("Successfully encrypted: 1")
    expect(stdout).toContain("Errors: 1")
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
  }
}, 15_000)

it("excludes every canonical seeded E2E profile from backfill counts and pages", async () => {
  const candidate = (id: string, phone: string) => ({
    date_of_birth: null,
    date_of_birth_encrypted: null,
    id,
    medicare_number: null,
    medicare_number_encrypted: null,
    phi_encrypted_at: null,
    phone,
    phone_encrypted: null,
  })
  const nonFixtureProfile = candidate("f0000000-0000-4000-8000-000000000001", "0400000099")
  const rows = [
    ...SEEDED_E2E_STAFF_PROFILE_IDS.map((id, index) => candidate(id, `041000000${index}`)),
    ...SEEDED_E2E_PATIENT_PROFILE_IDS.map((id, index) => candidate(id, `040000000${index}`)),
    nonFixtureProfile,
  ]

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host}`)
    if (requestUrl.pathname !== "/rest/v1/profiles") {
      response.writeHead(404).end()
      return
    }

    const excludedIdsFilter = requestUrl.searchParams
      .getAll("id")
      .find((value) => value.startsWith("not.in.")) || ""
    const filteredRows = rows.filter((row) => !excludedIdsFilter.includes(row.id))
    response.setHeader(
      "Content-Range",
      filteredRows.length === 0 ? "*/0" : `0-${filteredRows.length - 1}/${filteredRows.length}`,
    )

    if (request.method === "HEAD") {
      response.writeHead(200).end()
      return
    }

    response.setHeader("Content-Type", "application/json")
    response.writeHead(200).end(JSON.stringify(filteredRows))
  })

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Failed to start the test Supabase server")
  }

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["--import", "tsx", "scripts/encrypt-phi-backfill.ts", "--dry"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ENCRYPTION_KEY: TEST_ENCRYPTION_KEY,
          NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${address.port}`,
          NODE_OPTIONS: [process.env.NODE_OPTIONS, "--conditions=react-server"].filter(Boolean).join(" "),
          SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
        },
      },
    )

    expect(stdout).toContain("Found 1 profiles needing encryption")
    expect(stdout).toContain("Total profiles processed: 1")
    expect(stdout).toContain("Successfully encrypted: 1")
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
  }
}, 15_000)
