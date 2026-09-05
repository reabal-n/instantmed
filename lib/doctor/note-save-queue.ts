type SaveResult = { success: boolean; error?: string }

/** Serialize draft and decision writes so an older save cannot land last. */
export function createNoteSaveQueue(save: (id: string, notes: string) => Promise<SaveResult>) {
  let tail: Promise<unknown> = Promise.resolve()
  return (id: string, notes: string): Promise<SaveResult> => {
    const next = tail.then(() => save(id, notes)).catch(() => ({
      success: false, error: "Failed to save notes",
    }))
    tail = next
    return next
  }
}
