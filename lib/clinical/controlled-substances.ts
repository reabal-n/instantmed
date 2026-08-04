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
  // "oxynorm" (immediate-release oxycodone) was missing while every other
  // oxycodone brand was listed — it reached checkout and was declined+refunded
  // on 2026-08. Brand gaps, not generic gaps, are how this list actually fails.
  "oxycodone", "oxycontin", "endone", "oxynorm", "targin",
  "morphine", "ms contin", "kapanol", "sevredol",
  "fentanyl", "durogesic", "abstral", "actiq",
  "hydromorphone", "dilaudid", "jurnista",
  "methadone", "physeptone", "biodone",
  "buprenorphine", "suboxone", "subutex", "temgesic", "norspan",
  "tramadol",
  // Opioid antidiarrhoeal. Absent from both prior lists; reached checkout 2026-08.
  "lomotil", "diphenoxylate",
  // Added at unification: AU S8 opioids that were missing from BOTH prior lists.
  "tapentadol", "palexia",
  "pethidine",

  // S8 stimulants
  // "dexamfetamine" is the AU-approved spelling; "dexamphetamine" alone
  // misses every prescription written the standard local way.
  "dexamphetamine", "dexamfetamine", "dexedrine", "vyvanse", "lisdexamfetamine",
  "methylphenidate", "ritalin", "concerta",

  // Anaesthetic-class drug of dependence
  "ketamine",

  // Benzodiazepines
  "alprazolam", "xanax", "kalma",
  "diazepam", "valium", "antenex", "ducene",
  "clonazepam", "rivotril", "paxam",
  "lorazepam", "ativan",
  "oxazepam", "serepax", "murelax", "alepam",
  "temazepam", "temaze", "normison", "euhypnos",
  "nitrazepam", "mogadon", "alodorm",
  // S8 benzodiazepine, absent from both prior lists entirely.
  "flunitrazepam", "hypnodorm",

  // Z-drugs
  "zolpidem", "stilnox",
  "zopiclone", "imovane",

  // Cannabis
  // Bare "cbd" was unmatched because only "cbd oil" was listed — a patient
  // who writes just "CBD" reached checkout and was declined+refunded 2026-08.
  "cannabis", "thc", "cbd", "cbd oil", "cannabidiol",
  "dronabinol", "marinol", "nabilone", "sativex",

  // Testosterone / androgens
  "testosterone", "androderm", "testogel", "primoteston", "sustanon", "reandron",

  // High-misuse codeine compounds. Deliberately the compound names only —
  // bare "codeine" would block combination-product repeats that belong in
  // front of the reviewing doctor, not at a hard intake wall.
  "codeine phosphate", "codeine linctus",
]

/**
 * Codeine combination brands that are *allowed* to reach the doctor but are
 * usually declined online.
 *
 * These are deliberately NOT in `CONTROLLED_SUBSTANCE_TERMS`: the documented
 * carve-out routes combination-product repeats to the reviewing doctor rather
 * than a hard intake wall, and that stands. But in 2026-08 two of these
 * (Panadeine Forte, Mersyndol Forte) were paid for, declined, and refunded —
 * so the patient paid to reach a "no" we could have predicted.
 *
 * The answer is honesty before payment, not a block: warn, let them decide, and
 * keep the doctor as the decision-maker. Adding a brand here costs a patient
 * nothing and can only prevent a wasted payment.
 */
export const LIKELY_DECLINED_ONLINE_TERMS: readonly string[] = [
  // Paracetamol/aspirin/ibuprofen + codeine combination brands (AU)
  "panadeine", "mersyndol", "aspalgin", "codalgin", "codapane",
  "prodeine", "nurofen plus", "panamax co",
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

const LIKELY_DECLINED_ONLINE_PATTERNS: readonly RegExp[] =
  LIKELY_DECLINED_ONLINE_TERMS.map(
    (term) => new RegExp(escapeRegExp(term).replace(/ /g, "\\s*"), "i"),
  )

/**
 * Advisory only — never a block. True when the medicine is one a doctor is
 * likely to decline online, so the intake can say so before the patient pays.
 * A controlled substance is already hard-blocked upstream and is not repeated
 * here, so the two signals can never render at once.
 */
export function isLikelyDeclinedOnline(medicationName: string): boolean {
  const lowerName = medicationName.toLowerCase()
  if (CONTROLLED_SUBSTANCE_PATTERNS.some((pattern) => pattern.test(lowerName))) return false
  return LIKELY_DECLINED_ONLINE_PATTERNS.some((pattern) => pattern.test(lowerName))
}
