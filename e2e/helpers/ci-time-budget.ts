/** Leave CI time to write and upload diagnostics before the runner is killed. */
export function getCiPlaywrightGlobalTimeout(
  deadline: string | undefined = process.env.PLAYWRIGHT_CI_DEADLINE_MS,
  now = Date.now(),
): number | undefined {
  if (deadline === undefined) return undefined

  const deadlineMs = Number(deadline)
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs <= 0) {
    throw new Error("Invalid browser evidence deadline; refusing an unbounded CI suite.")
  }

  const remaining = deadlineMs - now
  if (remaining <= 0) {
    throw new Error("CI browser test budget exhausted; preserving earlier suite evidence.")
  }
  return remaining
}
