import "server-only"

export interface MedicationCatalogRow {
  name: string | null
  brand_names: readonly string[] | null
}

export type GenericMedicationResolution =
  | {
      status: "resolved"
      genericName: string
    }
  | {
      status: "ambiguous" | "unsafe" | "unresolved"
      genericName: null
    }

interface IndexedGenericIdentity {
  genericName: string
  safe: boolean
}

type MedicationReferenceIndex = Map<string, Map<string, IndexedGenericIdentity>>

const MIN_GENERIC_NAME_LENGTH = 2
const MAX_GENERIC_NAME_LENGTH = 100
const MAX_GENERIC_NAME_WORDS = 6

const MEDICATION_NOISE_WORDS = new Set([
  "cap",
  "caps",
  "caplet",
  "caplets",
  "capsule",
  "capsules",
  "controlled",
  "cream",
  "dose",
  "drops",
  "extended",
  "gel",
  "immediate",
  "inhaler",
  "injection",
  "liquid",
  "modified",
  "mr",
  "ointment",
  "oral",
  "patch",
  "pessary",
  "rapihaler",
  "release",
  "solution",
  "spray",
  "sr",
  "suppository",
  "suspension",
  "tab",
  "tablet",
  "tablets",
  "turbuhaler",
  "xr",
])

// A single, known Australian/international spelling equivalence. Do not
// broaden this into fuzzy matching: a near-match is unsafe for clipboard use.
const SAFE_ALIAS_CORRECTIONS: Readonly<Record<string, string>> = {
  effexor: "efexor",
}

const GENERIC_NAME_CONTEXT_PATTERN = new RegExp(
  String.raw`\b(?:` +
    [
      "cap",
      "caplet",
      "caps",
      "capsule",
      "current",
      "day",
      "doctor",
      "frequency",
      "confirm",
      "context",
      "controlled",
      "cream",
      "daily",
      "directions?",
      "dose",
      "drops",
      "extended",
      "form",
      "gel",
      "immediate",
      "inhaler",
      "injection",
      "liquid",
      "medication",
      "medicine",
      "modified",
      "morning",
      "month",
      "needed",
      "night",
      "nightly",
      "ointment",
      "once",
      "oral",
      "parchment",
      "patch",
      "patient",
      "pessary",
      "prescrib(?:e|ed|ing)?",
      "prn",
      "quantity",
      "regimen",
      "release",
      "repeat(?:s)?",
      "reported",
      "request(?:ed)?",
      "requested",
      "solution",
      "spray",
      "strength",
      "suppository",
      "suspension",
      "tab",
      "tablet(?:s)?",
      "take",
      "taking",
      "times?",
      "thrice",
      "turbuhaler",
      "twice",
      "use(?:d)?",
      "weekly",
      "week",
      "with",
      "without",
      "xr",
      "sr",
      "mr",
      "cr",
      "er",
      "mg",
      "mcg",
      "micrograms?",
      "milligrams?",
      "grams?",
      "kilograms?",
      "nanograms?",
      "millilit(?:er|re)s?",
      "lit(?:er|re)s?",
      "puffs?",
      "units?",
      "iu",
      "mmol",
      "meq",
    ].join("|") +
    String.raw`)\b`,
  "i",
)

function normalizeCharacters(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[®™©]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function stripDoseAndForm(value: string): string {
  const withoutAmounts = value
    // Combination/concentration amounts first: 200/6 mcg, 5 mg/5 mL.
    .replace(
      /\b\d+(?:\.\d+)?\s*(?:mg|mcg|micrograms?|g|grams?|ng|nanograms?|ml|millilit(?:er|re)s?|units?|iu|mmol|meq|%)?\s*\/\s*\d+(?:\.\d+)?\s*(?:mg|mcg|micrograms?|g|grams?|ng|nanograms?|ml|millilit(?:er|re)s?|units?|iu|mmol|meq|%)?\b/gi,
      " ",
    )
    .replace(
      /\b\d+(?:\.\d+)?\s*(?:mg|mcg|micrograms?|g|grams?|ng|nanograms?|ml|millilit(?:er|re)s?|units?|iu|mmol|meq|%)\b/gi,
      " ",
    )

  return normalizeCharacters(withoutAmounts)
    .split(" ")
    .filter((token) => token && !MEDICATION_NOISE_WORDS.has(token))
    .join(" ")
}

/**
 * Return only exact and conservative dose/form-stripped lookup candidates.
 * There is intentionally no prefix, substring, edit-distance, or fuzzy match.
 */
export function normalizeGenericMedicationQuery(value: string): string[] {
  const exact = normalizeCharacters(value)
  const core = stripDoseAndForm(value)
  const candidates = [exact, core]

  for (const candidate of [exact, core]) {
    const corrected = SAFE_ALIAS_CORRECTIONS[candidate]
    if (corrected) candidates.push(corrected)
  }

  return [...new Set(candidates.filter((candidate) => candidate.length >= 2))]
}

/**
 * Clipboard output must remain a short active-ingredient label. Fail closed on
 * strengths, formulations, directions, prose, or sentence-like punctuation.
 */
export function isSafeGenericMedicationName(value: string): boolean {
  const genericName = value.trim()

  if (
    genericName.length < MIN_GENERIC_NAME_LENGTH ||
    genericName.length > MAX_GENERIC_NAME_LENGTH ||
    /[\r\n]/.test(genericName) ||
    /\d|%/.test(genericName) ||
    GENERIC_NAME_CONTEXT_PATTERN.test(genericName)
  ) {
    return false
  }

  if (genericName.split(/\s+/).length > MAX_GENERIC_NAME_WORDS) return false

  // Letters plus the punctuation needed by active-ingredient combinations.
  return /^[\p{L}\p{M}][\p{L}\p{M}'’()+/\- ]*[\p{L}\p{M})]$/u.test(genericName)
}

function cleanCatalogValue(value: unknown): string | null {
  if (typeof value !== "string") return null

  const cleaned = value.trim().replace(/[\t\f\v ]+/g, " ")
  return cleaned || null
}

function genericIdentityKey(genericName: string): string {
  return genericName.toLocaleLowerCase("en-AU")
}

function addIndexValue(
  index: MedicationReferenceIndex,
  alias: string,
  genericName: string,
): void {
  const identityKey = genericIdentityKey(genericName)

  for (const candidate of normalizeGenericMedicationQuery(alias)) {
    const matches = index.get(candidate) ?? new Map<string, IndexedGenericIdentity>()
    const existing = matches.get(identityKey)
    const safe = isSafeGenericMedicationName(genericName)

    matches.set(identityKey, {
      genericName: existing?.genericName ?? genericName,
      // Duplicate rows for the same case-insensitive generic identity are one
      // match, but any unsafe duplicate keeps that identity non-copyable.
      safe: existing ? existing.safe && safe : safe,
    })
    index.set(candidate, matches)
  }
}

function buildReferenceIndex(rows: readonly MedicationCatalogRow[]): MedicationReferenceIndex {
  const index: MedicationReferenceIndex = new Map()

  for (const row of rows) {
    const genericName = cleanCatalogValue(row?.name)
    if (!genericName) continue

    addIndexValue(index, genericName, genericName)

    if (!Array.isArray(row.brand_names)) continue
    for (const brandName of row.brand_names) {
      const alias = cleanCatalogValue(brandName)
      if (alias) addIndexValue(index, alias, genericName)
    }
  }

  return index
}

/**
 * Resolve against active rows fetched by the authenticated server action from
 * InstantMed's curated medications table. This reference-only result must not
 * affect eligibility, safety routing, request status, or prescribing.
 */
export function resolveGenericMedicationNameFromRows(
  patientEntry: string,
  rows: readonly MedicationCatalogRow[],
): GenericMedicationResolution {
  const index = buildReferenceIndex(rows)
  const matches = new Map<string, IndexedGenericIdentity>()

  for (const candidate of normalizeGenericMedicationQuery(patientEntry)) {
    const candidateMatches = index.get(candidate)
    if (!candidateMatches) continue

    for (const [identityKey, identity] of candidateMatches) {
      const existing = matches.get(identityKey)
      matches.set(identityKey, {
        genericName: existing?.genericName ?? identity.genericName,
        safe: existing ? existing.safe && identity.safe : identity.safe,
      })
    }
  }

  if (matches.size === 0) {
    return { status: "unresolved", genericName: null }
  }

  if (matches.size !== 1) {
    return { status: "ambiguous", genericName: null }
  }

  const match = [...matches.values()][0]
  if (!match.safe) {
    return { status: "unsafe", genericName: null }
  }

  return { status: "resolved", genericName: match.genericName }
}
