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
  "oxycodone", "oxycontin", "endone", "targin",
  "morphine", "ms contin", "kapanol", "sevredol",
  "fentanyl", "durogesic", "abstral", "actiq",
  "hydromorphone", "dilaudid", "jurnista",
  "methadone", "physeptone", "biodone",
  "buprenorphine", "suboxone", "subutex", "temgesic",
  "tramadol",
  // Added at unification: AU S8 opioids that were missing from BOTH prior lists.
  "tapentadol", "palexia",
  "pethidine",

  // S8 stimulants
  "dexamphetamine", "dexedrine", "vyvanse", "lisdexamfetamine",
  "methylphenidate", "ritalin", "concerta",

  // Anaesthetic-class drug of dependence
  "ketamine",

  // Benzodiazepines
  "alprazolam", "xanax", "kalma",
  "diazepam", "valium", "antenex",
  "clonazepam", "rivotril", "paxam",
  "lorazepam", "ativan",
  "oxazepam", "serepax", "murelax",
  "temazepam", "temaze", "normison",
  "nitrazepam", "mogadon", "alodorm",

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
