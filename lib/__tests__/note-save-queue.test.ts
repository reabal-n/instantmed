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
