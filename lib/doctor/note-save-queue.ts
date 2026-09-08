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

/** Navigation must wait for edits made while its first snapshot was in flight, too. */
export async function flushLatestNotes(
  getLatest: () => string,
  save: (notes: string) => Promise<SaveResult>,
): Promise<boolean> {
  let snapshot: string
  do {
    snapshot = getLatest()
    if (!(await save(snapshot)).success) return false
  } while (getLatest() !== snapshot)
  return true
}
