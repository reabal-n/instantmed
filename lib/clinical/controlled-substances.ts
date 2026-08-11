/**
 * Single source of truth for the platform's controlled-substance /
 * drugs-of-dependence blocklist (AU Schedule 8 plus high-misuse S4 drugs the
 * platform never prescribes asynchronously).
 *
 * History (2026-07-03 unification): three copies of this list had diverged —
 * the intake regex detector (`isControlledSubstance`) knew tramadol,
 * cannabis, testosterone, and several AU benzo brand names that the
 * repeat-script server blocklist (`BLOCKED_S8_TERMS`) did not, while the
 * blocklist knew ketamine and the codeine compounds that the regex did not.
 * A patient could therefore type a name one enforcement layer blocked and
 * another waved through. Every consumer now derives from this list:
 *
 * - `isControlledSubstance` (lib/clinical/intake-validation.ts) — intake UI
 *   hard block + checkout server validation, via CONTROLLED_SUBSTANCE_PATTERNS.
 * - `BLOCKED_S8_TERMS` / `containsBlockedSubstance`
 *   (lib/validation/repeat-script-schema.ts) — repeat-script server-side
 *   validation with fuzzy typo matching.
 *
 * Adding a term here widens EVERY layer at once (the safe direction).
 * Removing one is a clinical-policy decision — check docs/CLINICAL.md first.
 * Parity is pinned by lib/__tests__/controlled-substances-parity.test.ts.
 */
export const CONTROLLED_SUBSTANCE_TERMS: readonly string[] = [
  // S8 opioids
  "oxycodone", "oxycontin", "endone", "oxynorm", "targin",
  "morphine", "ms contin", "kapanol", "sevredol",
  "fentanyl", "durogesic", "abstral", "actiq",
  "hydromorphone", "dilaudid", "jurnista",
  "methadone", "physeptone", "biodone",
  "buprenorphine", "suboxone", "subutex", "temgesic", "norspan",
  "tramadol",
  // Added at unification: AU S8 opioids that were missing from BOTH prior lists.
  "tapentadol", "palexia",
  "pethidine",

  // S8 stimulants
  "dexamphetamine", "dexamfetamine", "dexedrine", "vyvanse", "lisdexamfetamine",
  "methylphenidate", "ritalin", "concerta",

  // Anaesthetic-class drug of dependence
  "ketamine",

  // Benzodiazepines
  "alprazolam", "xanax", "kalma",
  "diazepam", "valium", "antenex",
  "clonazepam", "rivotril", "paxam",
  "lorazepam", "ativan",
  "oxazepam", "serepax", "murelax", "alepam",
  "temazepam", "temaze", "normison",
  "nitrazepam", "mogadon", "alodorm",
  "flunitrazepam", "hypnodorm",

  // Z-drugs
  "zolpidem", "stilnox",
  "zopiclone", "imovane",

  // Cannabis
  "cannabis", "thc", "cbd oil", "cannabidiol",
  "dronabinol", "marinol", "nabilone", "sativex",

  // Testosterone / androgens
  "testosterone", "androderm", "testogel", "primoteston", "sustanon", "reandron",

  // High-misuse codeine compounds. Deliberately the compound names only —
  // bare "codeine" would block combination-product repeats that belong in
  // front of the reviewing doctor, not at a hard intake wall.
  "codeine phosphate", "codeine linctus",
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * One case-insensitive pattern per term. Spaces match flexibly ("ms contin"
 * also matches "mscontin") so brand-name spacing quirks cannot slip past.
 */
export const CONTROLLED_SUBSTANCE_PATTERNS: readonly RegExp[] =
  CONTROLLED_SUBSTANCE_TERMS.map(
    (term) => new RegExp(escapeRegExp(term).replace(/ /g, "\\s*"), "i"),
  )

// Bare "CBD" is meaningful inside a medication-name field but ambiguous in
// general prose in Australia (for example, "Sydney CBD"). Keep it out of the
// global term list and add it only at medication-specific seams.
const BARE_CBD_MEDICATION_PATTERN = /\bcbd(?:\b|(?=\d))/i

export function containsControlledSubstanceTerm(value: string): boolean {
  return CONTROLLED_SUBSTANCE_PATTERNS.some((pattern) => pattern.test(value))
}

export function containsControlledMedicationTerm(value: string): boolean {
  return (
    containsControlledSubstanceTerm(value) ||
    BARE_CBD_MEDICATION_PATTERN.test(value)
  )
}

const LIKELY_DECLINED_ONLINE_MEDICATIONS = [
  { token: "panadeine", label: "Panadeine", pattern: /\bpanadeine\b/i },
  { token: "mersyndol", label: "Mersyndol", pattern: /\bmersyndol\b/i },
  { token: "aspalgin", label: "Aspalgin", pattern: /\baspalgin\b/i },
  { token: "codalgin", label: "Codalgin", pattern: /\bcodalgin\b/i },
  { token: "codapane", label: "Codapane", pattern: /\bcodapane\b/i },
  { token: "prodeine", label: "Prodeine", pattern: /\bprodeine\b/i },
  { token: "nurofen_plus", label: "Nurofen Plus", pattern: /\bnurofen\s+plus\b/i },
  // The final boundary is essential: "Panamax coated" and "Panamax cold"
  // are ordinary descriptions, not the Panamax Co combination brand.
  { token: "panamax_co", label: "Panamax Co", pattern: /\bpanamax\s+co\b/i },
] as const

export type LikelyDeclinedOnlineMedication = {
  token: (typeof LIKELY_DECLINED_ONLINE_MEDICATIONS)[number]["token"]
  label: (typeof LIKELY_DECLINED_ONLINE_MEDICATIONS)[number]["label"]
}

/**
 * Advisory only. These combination-product brands may continue to a doctor,
 * but the patient must see and acknowledge the likely-decline/refund context
 * before payment. The returned fixed token is safe to persist in a draft and
 * invalidates an acknowledgement when the matched brand changes.
 */
export function getLikelyDeclinedOnlineMedication(
  medicationName: string,
): LikelyDeclinedOnlineMedication | null {
  if (containsControlledMedicationTerm(medicationName)) return null
  const match = LIKELY_DECLINED_ONLINE_MEDICATIONS.find(({ pattern }) =>
    pattern.test(medicationName),
  )
  return match ? { token: match.token, label: match.label } : null
}
