/**
 * Word-gated fuzzy term matching for medicine names.
 *
 * Mirrors the S8 blocklist's typo tolerance (`containsBlockedSubstance` in
 * lib/validation/repeat-script-schema.ts) without importing it: lib/validation
 * already imports from lib/clinical, so sharing that function would create an
 * import cycle — and the S8 gate's behaviour is pinned by its own parity tests
 * and deliberately left untouched.
 *
 * Semantics: a term matches when it appears as an exact substring, or when some
 * whole word of the text is within the edit-distance budget of the term
 * (2 edits for terms of 6+ characters, else 1), with the word gated to a
 * similar length so short fragments can't drift into long terms. This is what
 * catches "sildenafl" / "finasterde" — real patients typo long generic names
 * constantly (2 of 2 production repeat requests on 2026-08-06 misspelled their
 * medicine) — while the length gate keeps "silvasta" (8) from ever being
 * compared against "simvastatin" (11).
 */

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

/** True when `text` contains `term` exactly or as a close typo of a whole word. */
export function textMatchesTermFuzzily(text: string, term: string): boolean {
  const lower = text.toLowerCase()
  const termLower = term.toLowerCase()
  if (lower.includes(termLower)) return true

  const maxDistance = termLower.length >= 6 ? 2 : 1
  const words = lower.split(/[\s,\-/()+.]+/).filter((word) => word.length >= 4)
  for (const word of words) {
    if (Math.abs(word.length - termLower.length) > maxDistance) continue
    const distance = levenshteinDistance(word, termLower)
    if (distance > 0 && distance <= maxDistance) return true
  }
  return false
}
