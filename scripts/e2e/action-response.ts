/** Extract JSON action receipts from pinned React Flight framing.
 * Successful mutations also render a page; its text/binary rows are byte-counted
 * and need not end with a newline. They must be skipped before parsing JSON rows.
 */
export function readActionResult(body: string): unknown {
  const bytes = Buffer.from(body)
  const chunks = new Map<string, unknown>()
  let offset = 0
  while (offset < bytes.length) {
    const colon = bytes.indexOf(58, offset)
    if (colon < 0) break
    const id = bytes.subarray(offset, colon).toString()
    if (!/^[0-9a-f]+$/.test(id)) throw new Error("Invalid action response framing")
    const tag = String.fromCharCode(bytes[colon + 1])
    if ("TAOoUSsLlGgMmV".includes(tag)) {
      const comma = bytes.indexOf(44, colon + 2)
      const lengthText = bytes.subarray(colon + 2, comma).toString()
      if (comma < 0 || !/^[0-9a-f]+$/.test(lengthText)) throw new Error("Invalid action response length")
      offset = comma + 1 + parseInt(lengthText, 16)
      if (offset > bytes.length) throw new Error("Truncated action response")
      continue
    }
    const newline = bytes.indexOf(10, colon + 1)
    if (newline < 0) throw new Error("Truncated action response")
    try { chunks.set(id, JSON.parse(bytes.subarray(colon + 1, newline).toString())) } catch { /* Module/error metadata is not an action result. */ }
    offset = newline + 1
  }
  const root = chunks.get("0") as { a?: unknown } | undefined
  if (typeof root?.a !== "string" || !root.a.startsWith("$@")) throw new Error("Direct action did not return an action result")
  const result = chunks.get(root.a.slice(2))
  if (result === undefined) throw new Error("Direct action result was missing or rejected")
  return result
}
