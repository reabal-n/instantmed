import { beforeEach, describe, expect, it, vi } from "vitest"

import { cleanupCorrectionStorageOrphans } from "@/lib/medical-certificates/correction-orphan-cleanup"

const STORAGE_PATH = "certificates/corrections/certificate-1/version-1.pdf"

function createClient(options: {
  createdAt?: string
  certificateRef?: boolean
  documentRef?: boolean
  auditRef?: boolean
  errorTable?: "issued_certificates" | "intake_documents" | "certificate_audit_log"
} = {}) {
  const remove = vi.fn(async () => ({ error: null }))
  const list = vi.fn(async (path: string) => {
    if (path === "certificates/corrections") {
      return {
        data: [{ name: "certificate-1", id: null }],
        error: null,
      }
    }
    if (path === "certificates/corrections/certificate-1") {
      return {
        data: [{
          name: "version-1.pdf",
          id: "storage-object-1",
          created_at: options.createdAt ?? "2026-06-01T00:00:00.000Z",
        }],
        error: null,
      }
    }
    throw new Error(`Unexpected storage list path ${path}`)
  })

  const refs: Record<string, boolean | undefined> = {
    issued_certificates: options.certificateRef,
    intake_documents: options.documentRef,
    certificate_audit_log: options.auditRef,
  }

  const client = {
    storage: {
      from: vi.fn(() => ({ list, remove })),
    },
    from: vi.fn((table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        limit: () => query,
        maybeSingle: async () => ({
          data: refs[table] ? { id: `${table}-reference` } : null,
          error: options.errorTable === table ? { message: "lookup unavailable" } : null,
        }),
      }
      return query
    }),
  }

  return { client, list, remove }
}

describe("certificate correction process-death orphan cleanup", () => {
  const cutoffDate = new Date("2026-07-03T00:00:00.000Z")

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("descends through id=null folders and deletes an old uncommitted correction", async () => {
    const { client, remove } = createClient()

    const stats = await cleanupCorrectionStorageOrphans(client as never, {
      cutoffDate,
      maxDeletes: 50,
    })

    expect(remove).toHaveBeenCalledWith([STORAGE_PATH])
    expect(stats).toEqual({ checked: 1, orphaned: 1, deleted: 1, errors: 0 })
  })

  it("retains a deliberately preserved prior version referenced by correction audit", async () => {
    const { client, remove } = createClient({ auditRef: true })

    const stats = await cleanupCorrectionStorageOrphans(client as never, {
      cutoffDate,
      maxDeletes: 50,
    })

    expect(remove).not.toHaveBeenCalled()
    expect(stats).toEqual({ checked: 1, orphaned: 0, deleted: 0, errors: 0 })
  })

  it.each(["issued_certificates", "intake_documents"] as const)(
    "retains the current version referenced by %s",
    async (referenceTable) => {
      const { client, remove } = createClient({
        certificateRef: referenceTable === "issued_certificates",
        documentRef: referenceTable === "intake_documents",
      })

      const stats = await cleanupCorrectionStorageOrphans(client as never, {
        cutoffDate,
        maxDeletes: 50,
      })

      expect(remove).not.toHaveBeenCalled()
      expect(stats.deleted).toBe(0)
    },
  )

  it("fails closed and retains the object when any reference lookup fails", async () => {
    const { client, remove } = createClient({ errorTable: "certificate_audit_log" })

    const stats = await cleanupCorrectionStorageOrphans(client as never, {
      cutoffDate,
      maxDeletes: 50,
    })

    expect(remove).not.toHaveBeenCalled()
    expect(stats).toEqual({ checked: 1, orphaned: 0, deleted: 0, errors: 1 })
  })

  it("does not inspect or delete a correction inside the grace period", async () => {
    const { client, remove } = createClient({ createdAt: "2026-07-09T00:00:00.000Z" })

    const stats = await cleanupCorrectionStorageOrphans(client as never, {
      cutoffDate,
      maxDeletes: 50,
    })

    expect(remove).not.toHaveBeenCalled()
    expect(stats).toEqual({ checked: 0, orphaned: 0, deleted: 0, errors: 0 })
  })
})
