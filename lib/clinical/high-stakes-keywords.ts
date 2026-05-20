/**
 * Single source of truth for "high-stakes use case" detection in medical
 * certificate flows.
 *
 * Two consumers, two shapes:
 *
 * 1. `HIGH_STAKES_USE_CASE_KEYWORDS` — flat string list used by
 *    `lib/clinical/auto-approval.ts` to scan answer text via substring
 *    matching. Powers the auto-approval gate that bumps a request out
 *    of the AI batch and into doctor review.
 *
 * 2. `HIGH_STAKES_PATTERNS` — regex list with user-facing reason copy,
 *    used by `lib/clinical/intake-validation.ts` to block submission at
 *    intake time and explain why. Word-boundary anchored so "exam"
 *    doesn't match "examined".
 *
 * Defense in depth: a request rejected at the auto-approval stage may
 * still be approvable by a human doctor. A request rejected at the
 * intake-validation stage never makes it into the queue. The intake
 * gate is the first line; the auto-approval gate is a safety net.
 *
 * Contract: every category in HIGH_STAKES_PATTERNS must be represented
 * in HIGH_STAKES_USE_CASE_KEYWORDS. `lib/__tests__/high-stakes-keywords-contract.test.ts`
 * enforces this.
 */

/**
 * High-stakes use cases that warrant a hard block during auto-approval.
 * These are requests where the doctor needs to read the intake, decide
 * whether the cert is appropriate, and reject if not. They also
 * produce verification phone calls and AHPRA complaints when a third
 * party (uni, court, employer's insurer, RTA, firearms registry, family
 * lawyer) follows up. We do not make fitness-for-X determinations from
 * a structured form.
 */
export const HIGH_STAKES_USE_CASE_KEYWORDS: ReadonlyArray<string> = [
  // Academic high-stakes
  "exam", "examination", "exams", "deferral", "defer", "deferred",
  "special consideration", "extension", "supplementary",
  "fail", "failed", "failing",
  // Legal / court
  // "jury" alone matches "injury" via substring; use "jury duty" instead.
  "court", "hearing", "tribunal", "summons", "subpoena", "jury duty",
  "custody", "family law", "avo", "intervention order",
  // Driving / transport / firearms — fitness-to-X determinations
  "driving", "drive", "license", "licence", "rta", "service nsw",
  "firearm", "gun licence", "gun license", "shooting",
  "fitness to fly", "fitness to drive", "flight", "airline",
  "commercial driver", "forklift", "heavy machinery",
  "fitness for duty", "fit for duty", "fitness to work", "fit to work",
  "return to work clearance", "pre-employment", "pre employment",
  "site medical", "mine site medical", "safety-critical", "safety critical",
  // Workers comp / insurance / claim
  "workers compensation", "worker compensation", "certificate of capacity",
  "capacity certificate", "work capacity", "insurance claim",
  "income protection", "ndis", "tac",
  // Government program evidence
  "centrelink", "services australia", "mutual obligation", "jobseeker",
  "disability support pension", "dsp",
]

/**
 * Categories of high-stakes use case. Used by the contract test to
 * assert the regex patterns and the keyword list cover the same
 * domains.
 */
export type HighStakesCategory =
  | "academic"
  | "legal"
  | "driving_fitness"
  | "workers_comp"
  | "government_program"

/**
 * Regex patterns with user-facing reason copy. Word-boundary anchored.
 * Used by `intake-validation.ts:checkHighStakesUseCase()` to block
 * submission at intake time.
 */
export const HIGH_STAKES_PATTERNS: ReadonlyArray<{
  category: HighStakesCategory
  pattern: RegExp
  reason: string
}> = [
  {
    category: "academic",
    pattern: /\b(exam|examination|deferral|defer|deferred|special\s+consideration|supplementary)\b/i,
    reason: "Exam deferrals and special consideration require a face-to-face assessment your university or institution can arrange.",
  },
  {
    category: "legal",
    pattern: /\b(court|hearing|tribunal|summons|subpoena|jury)\b/i,
    reason: "Certificates for court matters require an in-person assessment.",
  },
  {
    category: "legal",
    pattern: /\b(custody|family\s+law|intervention\s+order|avo)\b/i,
    reason: "Family law matters require an in-person assessment.",
  },
  {
    category: "driving_fitness",
    pattern: /\b(driving|drive|licence|license|rta|firearm|gun\s+licence|gun\s+license|shooting|fitness\s+to\s+fly|fitness\s+to\s+drive|commercial\s+driver|forklift|heavy\s+machinery)\b/i,
    reason: "Fitness-for-driving, firearm, machinery, or aviation determinations require an in-person assessment by an accredited assessor.",
  },
  {
    category: "workers_comp",
    pattern: /\b(workers?\s*comp|workers?\s*compensation|workcover|certificate\s+of\s+capacity|capacity\s+certificate|work\s+capacity|insurance\s+claim|income\s+protection|ndis|tac)\b/i,
    reason: "Certificates for workers' compensation, NDIS, or insurance claims require a different assessment pathway.",
  },
  {
    category: "government_program",
    pattern: /\b(centrelink|services\s+australia|mutual\s+obligation|jobseeker|dsp|disability\s+support\s+pension)\b/i,
    reason: "Centrelink and government-program medical evidence usually needs specific forms or a treating-practitioner report.",
  },
  {
    category: "driving_fitness",
    pattern: /\b(fit\s+for\s+duty|fitness\s+for\s+duty|fitness\s+to\s+work|fit\s+to\s+work|return\s+to\s+work\s+clearance|pre[-\s]?employment|site\s+medical|mine\s+site\s+medical|safety[-\s]?critical)\b/i,
    reason: "Fitness-for-duty, return-to-work, and safety-critical clearances require in-person assessment.",
  },
]
