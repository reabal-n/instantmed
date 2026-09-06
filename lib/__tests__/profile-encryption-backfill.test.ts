import { execFile } from "node:child_process"
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { mkdtemp, rm } from "node:fs/promises"
import { createServer, type IncomingMessage } from "node:http"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { promisify } from "node:util"

import { describe, expect, it } from "vitest"

import { SEEDED_E2E_PATIENT_PROFILE_IDS } from "@/lib/data/seeded-e2e-data"

const exec = promisify(execFile)
const key = Buffer.alloc(32, 7)
const wrongKey = Buffer.alloc(32, 9)
const script = resolve("scripts/encrypt-phi-backfill.ts")
const loader = resolve("node_modules/tsx/dist/loader.mjs")
const fixtureUrl = process.env.PROFILE_BACKFILL_FIXTURE_URL
if (fixtureUrl && !/^http:\/\/127\.0\.0\.1:\d+$/.test(fixtureUrl)) throw new Error("Profile DB fixtures require a disposable loopback endpoint")
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
function cipher(value: string, secret = key) {
  const iv = randomBytes(12)
  const enc = createCipheriv("aes-256-gcm", secret, iv)
  const body = Buffer.concat([enc.update(value), enc.final()])
  return Buffer.concat([iv, enc.getAuthTag(), body]).toString("base64")
}
function plain(value: string) {
  const bytes = Buffer.from(value, "base64")
  const dec = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12))
  dec.setAuthTag(bytes.subarray(12, 28))
  return Buffer.concat([dec.update(bytes.subarray(28)), dec.final()]).toString()
}
type Row = Record<string, string | number | null>
const candidate = (n: number, extra: Row = {}): Row => ({ id: id(n), email: null, full_name: null, date_of_birth: null, date_of_birth_encrypted: null, phone: "0400000001", phone_encrypted: null, medicare_number: null, medicare_number_encrypted: null, phi_encrypted_at: null, ...extra })
const evidence = () => candidate(1, { phone_encrypted: cipher("0400000001") })
async function body(request: IncomingMessage) {
  let value = ""
  for await (const part of request) value += part
  return value ? JSON.parse(value) : null
}
async function run(url: string, args: string[] = [], encryptionKey = key.toString("base64")) {
  const cwd = await mkdtemp(resolve(tmpdir(), "profile-backfill-"))
  try {
    const opts = { cwd, timeout: 8000, encoding: "utf8" as const, env: { PATH: process.env.PATH, NODE_ENV: "test" as const, ENCRYPTION_KEY: encryptionKey, NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: "fixture-only" } }
    let stdout = "", stderr = "", exitCode = 0
    try {
      ({ stdout, stderr } = await exec(process.execPath, ["--conditions=react-server", "--import", loader, script, ...args], opts))
    } catch (error) {
      const err = error as Error & { stdout?: string; stderr?: string; code?: number }
      stdout = err.stdout || ""; stderr = err.stderr || ""; exitCode = err.code || 1
    }
    return { stdout, stderr, exitCode, events: stdout.trim().split("\n").filter(Boolean).map(line => JSON.parse(line)), get preflight() { return this.events.find(event => event.phase === "preflight") }, get summary() { return this.events.find(event => event.phase === "summary") } }
  } finally { await rm(cwd, { recursive: true, force: true }) }
}

type Store = { read: () => Promise<Row[]>; patch: (rowId: string, update: Row) => Promise<void>; delete: (rowId: string) => Promise<void> }
type Faults = { beforePatch?: (store: Store, rowId: string) => Promise<void>; failId?: string; failRead?: boolean; failReadAt?: number; failStatus?: boolean; emptyReceipt?: boolean; deleteStatusAt?: "progress" | "completion"; statusReceipt?: "wrong" | "multiple" | "absent" }
async function harness(initial: Row[], real: boolean, faults: Faults = {}) {
  let rows = structuredClone(initial)
  const requests: { method: string; path: string; params: URLSearchParams; payload: Row | null }[] = []
  const statusRows: Row[] = []
  async function database(path: string, method = "GET", payload?: unknown) {
    const response = await fetch(`${fixtureUrl}/${path}`, { method, headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: payload ? JSON.stringify(payload) : undefined })
    if (!response.ok) throw new Error(`Fixture database failure ${response.status}`)
    return response.status === 204 ? null : response.json()
  }
  const store: Store = {
    read: async () => real ? database("profiles?order=id.asc") : structuredClone(rows),
    patch: async (rowId, update) => { if (real) await database(`profiles?id=eq.${rowId}`, "PATCH", update); else Object.assign(rows.find(row => row.id === rowId)!, update) },
    delete: async rowId => { if (real) await database(`profiles?id=eq.${rowId}`, "DELETE"); else rows = rows.filter(row => row.id !== rowId) },
  }
  if (real) {
    await database("profiles?id=not.is.null", "DELETE")
    await database("encryption_migration_status?id=not.is.null", "DELETE")
    if (initial.length) await database("profiles", "POST", initial)
  }
  let beforePatch = faults.beforePatch
  let reads = 0
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://localhost")
      const method = request.method || "GET"
      const payload = await body(request)
      const path = url.pathname.replace("/rest/v1/", "")
      requests.push({ method, path, params: url.searchParams, payload })
      const rowId = url.searchParams.get("id")?.replace("eq.", "") || ""
      if (path === "profiles" && method === "GET") reads++
      if (path === "profiles" && method === "PATCH" && beforePatch) {
        const hook = beforePatch; beforePatch = undefined
        await hook(store, rowId)
      }
      if ((faults.failRead && method === "GET") || (faults.failReadAt === reads && method === "GET") || (path === "profiles" && method === "PATCH" && rowId === faults.failId) || (faults.failStatus && path === "encryption_migration_status")) {
        response.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ code: "RAW_PRIVATE_CODE", message: "private-patient-0400000001-raw-secret", details: "private-details", hint: "private-hint" }))
        return
      }
      if (faults.emptyReceipt && path === "profiles" && method === "PATCH") { response.writeHead(204).end(); return }
      if (path === "encryption_migration_status" && method === "PATCH") {
        const phase = Object.hasOwn(payload, "completed_at") ? "completion" : "progress"
        if (faults.deleteStatusAt === phase) {
          if (real) await database(`encryption_migration_status?id=eq.${rowId}`, "DELETE")
          else statusRows.splice(0)
        }
        if (faults.statusReceipt) {
          const receipt = faults.statusReceipt === "absent" ? null : faults.statusReceipt === "wrong" ? [{ id: "private-wrong-receipt" }] : [{ id: rowId }, { id: "private-extra-receipt" }]
          response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(receipt))
          return
        }
      }
      if (real) {
        const headers = new Headers(request.headers as Record<string, string>)
        for (const name of ["authorization", "host", "content-length", "connection"]) headers.delete(name)
        const result = await fetch(`${fixtureUrl}/${path}${url.search}`, { method, headers, body: payload ? JSON.stringify(payload) : undefined })
        response.writeHead(result.status, Object.fromEntries([...result.headers].filter(([name]) => !["content-encoding", "transfer-encoding"].includes(name)))).end(await result.text())
        return
      }
      response.setHeader("Content-Type", "application/json")
      if (path === "encryption_migration_status") {
        if (method === "POST") {
          const statusId = id(999 + statusRows.length)
          statusRows.push({ id: statusId, ...payload })
          response.end(JSON.stringify({ id: statusId }))
          return
        }
        if (method === "PATCH") {
          const matched = statusRows.filter(row => row.id === rowId)
          for (const row of matched) Object.assign(row, payload)
          response.end(JSON.stringify(matched.map(row => ({ id: row.id }))))
          return
        }
      }
      let matched = rows.filter(row => [...url.searchParams].every(([column, filter]) => {
        if (["select", "order", "limit"].includes(column)) return true
        if (filter === "is.null") return row[column] === null
        if (filter.startsWith("eq.")) return String(row[column]) === filter.slice(3)
        if (filter.startsWith("gt.")) return String(row[column]) > filter.slice(3)
        if (filter.startsWith("lte.")) return String(row[column]) <= filter.slice(4)
        throw new Error("Unsupported fixture filter")
      }))
      if (method === "PATCH") for (const row of matched) Object.assign(row, payload)
      if (url.searchParams.get("order")) matched.sort((a, b) => String(a.id).localeCompare(String(b.id)) * (url.searchParams.get("order")!.endsWith("desc") ? -1 : 1))
      if (url.searchParams.get("limit")) matched = matched.slice(0, Number(url.searchParams.get("limit")))
      const select = url.searchParams.get("select")
      const projected = matched.map(row => select ? Object.fromEntries(select.split(",").map(column => [column, row[column]])) : row)
      const single = request.headers.accept?.includes("vnd.pgrst.object")
      response.end(JSON.stringify(single ? projected[0] : projected))
    } catch { response.writeHead(500).end() }
  })
  await new Promise<void>(done => server.listen(0, "127.0.0.1", done))
  const address = server.address() as { port: number }
  return { store, requests, status: async () => real ? database("encryption_migration_status") : statusRows, run: (args?: string[], secret?: string) => run(`http://127.0.0.1:${address.port}`, args, secret), close: () => new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done())) }
}

for (const real of [false, true]) {
  describe.skipIf(real && !fixtureUrl)(`profile backfill CLI against ${real ? "disposable PostgreSQL/PostgREST" : "HTTP contract fixture"}`, () => {
    async function check(initial: Row[], fn: (h: Awaited<ReturnType<typeof harness>>) => Promise<void>, faults?: Faults) {
      const h = await harness(initial, real, faults)
      try { await fn(h) } finally { await h.close() }
    }
    it("defaults to read-only and counts a missing twin despite an existing timestamp", async () => {
      await check([evidence(), candidate(2, { phi_encrypted_at: "2026-08-01T00:00:00Z", date_of_birth: "1985-04-01", date_of_birth_encrypted: cipher("1985-04-01") })], async h => {
        const result = await h.run()
        expect(result.exitCode).toBe(0)
        expect(result.preflight).toMatchObject({ compatible: true, candidates: 1, missing: { phone: 1 } })
        expect(result.summary.updated).toBe(0)
        expect(h.requests.every(request => request.method === "GET")).toBe(true)
        expect(await h.status()).toHaveLength(0)
      })
    })
    it.each(["--table=intake_answers", "--batch=0", "--batch=-1", "--batch=1x", "--batch=1.5", "--batch=501", "--batch=99999999999999999999", "--unknown", "--apply --dry", "--batch=2 --batch=3"])("rejects invalid CLI before all data work: %s", async flags => {
      await check([evidence()], async h => {
        const result = await h.run(flags.split(" "))
        expect(result.events).toEqual([{ phase: "failure", code: "INVALID_CLI" }])
        expect(result.exitCode).toBe(1)
        expect(h.requests).toHaveLength(0)
      })
    })
    it.each(["wrong", "mixed", "none", "empty-target"])("fails closed before status writes with %s compatibility evidence", async kind => {
      const initial = kind === "none" ? [candidate(2)] : [candidate(1, { phone_encrypted: kind === "empty-target" ? "" : cipher("0400000001", wrongKey) }), candidate(2)]
      if (kind === "mixed") initial.push(candidate(3, { phone_encrypted: cipher("0400000001") }))
      await check(initial, async h => {
        const result = await h.run(["--apply"])
        expect(result.exitCode).toBe(1)
        expect(result.events.at(-1).code).toBe(["none", "empty-target"].includes(kind) ? "KEY_EVIDENCE_MISSING" : "KEY_INCOMPATIBLE")
        expect(h.requests.every(request => request.method === "GET")).toBe(true)
        expect(await h.status()).toHaveLength(0)
      })
    })
    it("preserves authenticated parity exceptions separately from key compatibility", async () => {
      const existing = candidate(1, { phone: "different-format", phone_encrypted: cipher("0400000001"), medicare_number: null, medicare_number_encrypted: cipher("2123456701") })
      const otherExceptions = [3, 4].map(n => candidate(n, { phone_encrypted: cipher("0400000001"), medicare_number: "different-content", medicare_number_encrypted: cipher("2123456701") }))
      await check([existing, candidate(2), ...otherExceptions], async h => {
        const result = await h.run(["--apply"])
        expect(result.exitCode).toBe(0)
        expect(result.preflight).toMatchObject({ compatible: true, parityMismatch: { phone: 1, medicare_number: 3 } })
        const after = await h.store.read()
        for (const preserved of [existing, ...otherExceptions]) expect(after.find(row => row.id === preserved.id)).toMatchObject(preserved)
        expect(result.summary.updated).toBe(1)
      })
    })
    it.each(["source", "target", "identity", "timestamp", "deleted"])("rereads and preserves a concurrent %s change without counting a write", async kind => {
      await check([evidence(), candidate(2)], async h => {
        const result = await h.run(["--apply"])
        expect(result.exitCode).toBe(1)
        expect(result.summary).toMatchObject({ updated: 0, skipped: 1 })
        const patch = h.requests.find(request => request.path === "profiles" && request.method === "PATCH")!
        expect(patch.params.get("phone")).toBe("eq.0400000001")
        expect(patch.params.get("phone_encrypted")).toBe("is.null")
        expect(h.requests.some(request => request.method === "GET" && request.params.get("id") === `eq.${id(2)}`)).toBe(true)
        const row = (await h.store.read()).find(row => row.id === id(2))
        if (kind === "source") expect(row).toMatchObject({ phone: "0499999999", phone_encrypted: null })
        if (kind === "target") expect(plain(row!.phone_encrypted as string)).toBe("concurrent-ciphertext")
        if (kind === "deleted") expect(row).toBeUndefined()
        const status = await h.status()
        expect(status[0]).toMatchObject({ encrypted_records: 0, completed_at: null })
      }, { beforePatch: async (store, rowId) => {
        if (kind === "deleted") await store.delete(rowId)
        else await store.patch(rowId, kind === "source" ? { phone: "0499999999" } : kind === "target" ? { phone_encrypted: cipher("concurrent-ciphertext") } : kind === "identity" ? { email: "fixture@example.com" } : { phi_encrypted_at: "2026-09-01T00:00:00Z" })
      } })
    })
    it("handles null/empty fields and targets, partial batches and idempotent reruns", async () => {
      await check([evidence(), candidate(2, { phone: "", medicare_number: null }), candidate(3, { phone_encrypted: "" }), candidate(4, { date_of_birth: "1985-04-01", medicare_number: "2123456701" }), candidate(5)], async h => {
        const result = await h.run(["--apply", "--batch=2"])
        expect(result.exitCode).toBe(0)
        expect(result.summary).toMatchObject({ updated: 3, updatedFields: { phone: 3, date_of_birth: 1, medicare_number: 1 } })
        for (const row of (await h.store.read()).filter(row => String(row.id) >= id(3))) expect(plain(row.phone_encrypted as string)).toBe(row.phone)
        const rerun = await h.run(["--apply", "--batch=1"])
        expect(rerun.exitCode).toBe(0)
        expect(rerun.preflight).toMatchObject({ candidates: 0, parityMismatch: { phone: 0, date_of_birth: 0, medicare_number: 0 } })
        expect(rerun.summary.updated).toBe(0)
        expect(await h.status()).toHaveLength(1)
      })
    })
    it("continues after a failed row, records bounded errors and resumes only missing work", async () => {
      const faults: Faults = { failId: id(2) }
      await check([evidence(), candidate(2), candidate(3)], async h => {
        const result = await h.run(["--apply", "--batch=1"])
        expect(result.exitCode).toBe(1)
        expect(result.summary).toMatchObject({ updated: 1, errors: { PROFILE_WRITE_FAILED: 1 } })
        expect((await h.status())[0]).toMatchObject({ encrypted_records: 1, error_count: 1, last_error: "PROFILE_WRITE_FAILED", completed_at: null })
        expect(result.stdout + result.stderr + JSON.stringify(await h.status())).not.toMatch(/private-|0400000001|RAW_PRIVATE_CODE/)
        faults.failId = undefined
        const resumed = await h.run(["--apply", "--batch=1"])
        expect(resumed.exitCode).toBe(0)
        expect(resumed.summary.updated).toBe(1)
      }, faults)
    })
    it("excludes all canonical seeded and machine identities from compatibility and writes", async () => {
      const fixtureIds = [...SEEDED_E2E_PATIENT_PROFILE_IDS, "e2e00000-0000-0000-0000-000000000001", "e2e00000-0000-0000-0000-000000000003", "e2e00000-0000-0000-0000-000000000004"]
      const fixtures: Row[] = [
        ...fixtureIds.map(rowId => candidate(10, { id: rowId })),
        ...["x@example.com", "x@example.org", "x@example.net", "x@instantmed-e2e.test", "x@instantmed.test", "browser-123@instantmed.com.au", "test@instantmed.com.au", "e2e-fixture@australia.invalid"].map((email, i) => candidate(20 + i, { email })),
        candidate(30, { full_name: " Test Patient " }), candidate(31, { full_name: "E2E Test Patient" }),
      ].map(row => ({ ...row, medicare_number_encrypted: "not-valid-ciphertext" }))
      await check([evidence(), candidate(2), ...fixtures], async h => {
        const result = await h.run(["--apply", "--batch=2"])
        expect(result.exitCode).toBe(0)
        expect(result.preflight).toMatchObject({ excluded: fixtures.length, eligible: 2, candidates: 1 })
        expect(result.summary.updated).toBe(1)
        const after = await h.store.read()
        for (const fixture of fixtures) expect(after.find(row => row.id === fixture.id)).toMatchObject(fixture)
      })
    })
    it("keeps read failures private and dry-run status untouched", async () => {
      await check([evidence(), candidate(2)], async h => {
        const result = await h.run(["--dry-run"])
        expect(result.events).toEqual([{ phase: "failure", code: "READ_FAILED" }])
        expect(result.stdout + result.stderr).not.toContain("private-")
        expect(h.requests.every(request => request.method === "GET")).toBe(true)
      }, { failRead: true })
    })
    it("stops before profile writes if migration-status creation fails", async () => {
      await check([evidence(), candidate(2)], async h => {
        const result = await h.run(["--apply"])
        expect(result.exitCode).toBe(1)
        expect(result.events.at(-1).code).toBe("STATUS_WRITE_FAILED")
        expect(h.requests.some(request => request.path === "profiles" && request.method === "PATCH")).toBe(false)
        expect(result.stdout + result.stderr).not.toContain("private-")
      }, { failStatus: true })
    })
    it("rejects a wrong supplied key and an invalid key without revealing either", async () => {
      await check([evidence(), candidate(2)], async h => {
        const wrong = await h.run(["--apply"], wrongKey.toString("base64"))
        expect(wrong.events.at(-1).code).toBe("KEY_INCOMPATIBLE")
        expect(wrong.stdout + wrong.stderr).not.toContain(wrongKey.toString("base64"))
        const previousReads = h.requests.length
        const invalid = await h.run(["--apply"], "too-short")
        expect(invalid.events).toEqual([{ phase: "failure", code: "INVALID_KEY" }])
        expect(h.requests).toHaveLength(previousReads)
        expect(await h.status()).toHaveLength(0)
      })
    })
    it("fails closed when a later preflight page cannot be read", async () => {
      await check([evidence(), candidate(2)], async h => {
        const result = await h.run(["--apply", "--batch=1"])
        expect(result.exitCode).toBe(1)
        expect(result.events).toEqual([{ phase: "failure", code: "READ_FAILED" }])
        expect(h.requests.every(request => request.method === "GET")).toBe(true)
      }, { failReadAt: 3 })
    })
    it("never counts a write without an affected-row receipt", async () => {
      await check([evidence(), candidate(2)], async h => {
        const result = await h.run(["--apply"])
        expect(result.exitCode).toBe(1)
        expect(result.summary).toMatchObject({ updated: 0, errors: { WRITE_RECEIPT_INVALID: 1 } })
        expect((await h.status())[0]).toMatchObject({ encrypted_records: 0, last_error: "WRITE_RECEIPT_INVALID", completed_at: null })
      }, { emptyReceipt: true })
    })
    it.each(["progress", "completion"] as const)("fails when the migration status row disappears before %s receipt", async phase => {
      await check([evidence(), candidate(2), candidate(3)], async h => {
        const result = await h.run(["--apply", "--batch=2"])
        expect(result.exitCode).toBe(1)
        expect(result.summary.errors.STATUS_WRITE_FAILED).toBeGreaterThan(0)
        expect(result.summary.updated).toBe(phase === "progress" ? 1 : 2)
        expect(await h.status()).toHaveLength(0)
        if (phase === "progress") expect((await h.store.read()).find(row => row.id === id(3))!.phone_encrypted).toBeNull()
        expect(result.stdout + result.stderr).not.toContain(id(999))
      }, { deleteStatusAt: phase })
    })
    it.each(["wrong", "multiple", "absent"] as const)("rejects a %s migration-status receipt without exposing it", async statusReceipt => {
      await check([evidence(), candidate(2), candidate(3)], async h => {
        const result = await h.run(["--apply", "--batch=2"])
        expect(result.exitCode).toBe(1)
        expect(result.summary.errors.STATUS_WRITE_FAILED).toBeGreaterThan(0)
        expect(result.summary.updated).toBe(1)
        expect(result.stdout + result.stderr).not.toContain("private-")
        expect((await h.store.read()).find(row => row.id === id(3))!.phone_encrypted).toBeNull()
      }, { statusReceipt })
    })
  })
}
