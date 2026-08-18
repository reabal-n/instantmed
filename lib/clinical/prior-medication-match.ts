export type PriorMedicationMatchKind = "exact" | "likely_typo"

export interface PriorMedicationMatch {
  medicationName: string
  kind: PriorMedicationMatchKind
}

const MEDICATION_CONTEXT_WORDS = new Set([
  "cap",
  "caps",
  "capsule",
  "capsules",
  "cream",
  "controlled",
  "daily",
  "dose",
  "drops",
  "extended",
  "gel",
  "immediate",
  "inhaler",
  "injection",
  "liquid",
  "g",
  "iu",
  "mcg",
  "meq",
  "mg",
  "ml",
  "mmol",
  "modified",
  "morning",
  "ng",
  "night",
  "nightly",
  "ointment",
  "once",
  "oral",
  "patch",
  "pessary",
  "prn",
  "release",
  "solution",
  "spray",
  "suppository",
  "suspension",
  "tab",
  "tablet",
  "tablets",
  "take",
  "times",
  "turbuhaler",
  "twice",
  "unit",
  "units",
  "weekly",
  "xr",
  "sr",
  "mr",
  "cr",
  "er",
])

const DOSE_TOKEN = /^\d+(?:\.\d+)?(?:mg|mcg|g|ng|ml|units?|iu|mmol|meq|%)?$/i

/**
 * Normalise only presentation noise used around a medicine name. This is for
 * an advisory comparison against the same patient's prescription history; it
 * must never drive eligibility, safety routing, or prescribing.
 */
function normalizeMedicationNameForComparison(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[®™©]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => (
      token
      && !MEDICATION_CONTEXT_WORDS.has(token)
      && !DOSE_TOKEN.test(token)
    ))
    .join(" ")
}

/** Optimal-string-alignment distance: ordinary edits plus adjacent swaps. */
function editDistance(left: string, right: string): number {
  if (left === right) return 0
  if (!left) return right.length
  if (!right) return left.length

  const rows = Array.from({ length: left.length + 1 }, () => (
    Array<number>(right.length + 1).fill(0)
  ))

  for (let row = 0; row <= left.length; row += 1) rows[row][0] = row
  for (let column = 0; column <= right.length; column += 1) rows[0][column] = column

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + substitutionCost,
      )

      if (
        row > 1
        && column > 1
        && left[row - 1] === right[column - 2]
        && left[row - 2] === right[column - 1]
      ) {
        rows[row][column] = Math.min(
          rows[row][column],
          rows[row - 2][column - 2] + 1,
        )
      }
    }
  }

  return rows[left.length][right.length]
}

function allowedEditDistance(length: number): number {
  if (length < 5) return 0
  if (length <= 7) return 1
  if (length <= 18) return 2
  return 3
}

interface ScoredCandidate {
  medicationName: string
  normalizedName: string
  distance: number
}

/**
 * Find a unique close match in the patient's own prescription history.
 *
 * Fuzzy matching is deliberately narrow: same leading character, small length
 * delta, high similarity, and a clear margin over the runner-up. The returned
 * name still has to pass the curated generic-name resolver before it becomes
 * copyable in the Parchment handoff.
 */
export function findPriorMedicationMatch(
  patientEntry: string,
  priorMedicationNames: readonly string[],
): PriorMedicationMatch | null {
  const normalizedEntry = normalizeMedicationNameForComparison(patientEntry)
  if (!normalizedEntry) return null

  const uniqueCandidates = new Map<string, string>()
  for (const medicationName of priorMedicationNames) {
    const trimmedName = medicationName.trim()
    const normalizedName = normalizeMedicationNameForComparison(trimmedName)
    if (!trimmedName || !normalizedName || uniqueCandidates.has(normalizedName)) continue
    // Input is newest-first, so retain the first row for duplicate prior names.
    uniqueCandidates.set(normalizedName, trimmedName)
  }

  const exactName = uniqueCandidates.get(normalizedEntry)
  if (exactName) return { medicationName: exactName, kind: "exact" }

  const scored: ScoredCandidate[] = []
  for (const [normalizedName, medicationName] of uniqueCandidates) {
    const comparisonLength = Math.max(normalizedEntry.length, normalizedName.length)
    const maxDistance = allowedEditDistance(comparisonLength)
    if (
      maxDistance === 0
      || normalizedEntry[0] !== normalizedName[0]
      || Math.abs(normalizedEntry.length - normalizedName.length) > maxDistance
    ) {
      continue
    }

    const distance = editDistance(normalizedEntry, normalizedName)
    const similarity = 1 - distance / comparisonLength
    if (distance > maxDistance || similarity < 0.82) continue

    scored.push({ medicationName, normalizedName, distance })
  }

  scored.sort((left, right) => left.distance - right.distance)
  const best = scored[0]
  if (!best) return null

  const runnerUp = scored.find((candidate) => candidate.normalizedName !== best.normalizedName)
  if (runnerUp && runnerUp.distance <= best.distance + 1) return null

  return { medicationName: best.medicationName, kind: "likely_typo" }
}
