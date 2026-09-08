import { describe, expect, it, vi } from "vitest"

import { createNoteSaveQueue } from "@/lib/doctor/note-save-queue"

describe("clinical note write ordering", () => {
  it("waits for an older autosave before saving the final decision", async () => {
    let finishDraft!: (value: { success: boolean }) => void
    const save = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { finishDraft = resolve }))
      .mockResolvedValue({ success: true })
    const enqueue = createNoteSaveQueue(save)
    const draft = enqueue("case-1", "Draft")
    await Promise.resolve()
    const final = enqueue("case-1", "Reviewed decision")
    expect(save).toHaveBeenCalledTimes(1)
    finishDraft({ success: true })
    await Promise.all([draft, final])
    expect(save.mock.calls).toEqual([["case-1", "Draft"], ["case-1", "Reviewed decision"]])
  })

  it("allows a new save after an earlier request throws", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValue({ success: true })
    const enqueue = createNoteSaveQueue(save)
    expect(await enqueue("case-1", "Draft")).toMatchObject({ success: false })
    expect(await enqueue("case-1", "Retry")).toEqual({ success: true })
  })
})

describe("leaving with a note save in flight", () => {
  it("waits until the latest edits are durable, including typing during the first save", async () => {
    const { flushLatestNotes } = await import("@/lib/doctor/note-save-queue")
    let current = "First snapshot"
    let persisted = ""
    let finish!: (value: { success: boolean }) => void
    const enqueue = createNoteSaveQueue(async (_id, notes) => {
      if (notes === "First snapshot") await new Promise<{ success: boolean }>((resolve) => { finish = resolve })
      persisted = notes
      return { success: true }
    })
    const leaving = flushLatestNotes(() => current, (notes) => enqueue("case-1", notes))
    await Promise.resolve()
    current = "First snapshot plus later typing "
    finish({ success: true })
    expect(await leaving).toBe(true)
    expect(persisted).toBe(current)
  })
  it("blocks leaving after failure and allows retry with retained current text", async () => {
    const { flushLatestNotes } = await import("@/lib/doctor/note-save-queue")
    let fail = true
    let persisted = ""
    const current = "Retained clinician text\n\n"
    const save = async (notes: string) => { if (fail) return { success: false }; persisted = notes; return { success: true } }
    expect(await flushLatestNotes(() => current, save)).toBe(false)
    expect(persisted).toBe("")
    fail = false
    expect(await flushLatestNotes(() => current, save)).toBe(true)
    expect(persisted).toBe(current)
  })
})
