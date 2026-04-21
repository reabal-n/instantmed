/**
 * InstantMed brand voice constants — SINGLE SOURCE OF TRUTH
 *
 * Every hero, ad, email, LP, and press surface reads from here.
 * Do not duplicate these strings anywhere. If the tagline changes,
 * it changes here once.
 *
 * Enforced by:
 *  - lib/__tests__/voice-guard.test.ts (banned phrases + em-dash scan)
 *  - docs/VOICE.md (full voice doc)
 */

// ── Brand system (4 distinct layers, 4 distinct jobs) ─────────────────

/** Logo-adjacent promise. Every hero, every LP, every email header. */
export const TAGLINE = "A doctor without the wait."

/** Category mechanism. Triple-negation wedge vs every competitor form-factor. */
export const WEDGE = "No video. No call. No appointment."

/** Aspirational campaign sign-off. Ad end-frames, email footers, press leads. */
export const PROP_PHRASE = "A GP, the way it should've been."

/** Iconic hook. Optional use in specific ad creatives and social copy. */
export const ICONIC_HOOK = "The doctor is in."

/** Time-bound guarantee. Above checkout CTA, inline on heros, on /guarantee. */
export const GUARANTEE = "Doctor approves in 2 hours or your money back."

// ── Phrases you own (use freely) ──────────────────────────────────────

export const OWNED_PHRASES = [
  TAGLINE,
  WEDGE,
  PROP_PHRASE,
  ICONIC_HOOK,
  GUARANTEE,
  "Real doctors. No runaround.",
  "A doctor, not a queue.",
  "AHPRA doctors. Every single time.",
  "Reviewed, not robo-approved.",
  "Fill it out. Get on with it.",
] as const

// ── Phrases banned from every marketing surface ───────────────────────
// If any of these appear in components/marketing/** or lib/marketing/**
// the voice-guard Vitest test fails the build.

export const BANNED_PHRASES = [
  "cutting-edge",
  "world-class",
  "holistic",
  "wellness journey",
  "empower",
  "empowered",
  "seamless",
  "revolutionary",
  "game-changer",
  "game-changing",
  "at the end of the day",
  "synergy",
  "transformative",
] as const

// ── Em-dash detection ────────────────────────────────────────────────
// The em-dash character is banned across all marketing surfaces.
// Use commas, periods, colons, or parens instead.

export const EM_DASH = "\u2014"

// ── Helpers ──────────────────────────────────────────────────────────

/** Lowercase string containment check across all banned phrases. */
export function containsBannedPhrase(text: string): string | null {
  const lowered = text.toLowerCase()
  for (const phrase of BANNED_PHRASES) {
    if (lowered.includes(phrase.toLowerCase())) return phrase
  }
  return null
}

/** Em-dash detection. Returns true if the text contains a literal em-dash. */
export function containsEmDash(text: string): boolean {
  return text.includes(EM_DASH)
}
