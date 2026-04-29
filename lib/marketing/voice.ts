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
 *  - docs/BRAND.md (brand thesis, devices, photography, do/don't)
 */

// ── Brand thesis ──────────────────────────────────────────────────────

/**
 * The brand thesis. Used on the about page, OG image, brand-film outro,
 * and as a hero supplement under the H1/H2 stack on key pages.
 * One sentence captures what InstantMed is and how it feels.
 */
export const BRAND_THESIS =
  "Telehealth without the small talk. A real doctor, ready in the time it takes to make a coffee."

// ── Brand system (4 distinct layers, 4 distinct jobs) ─────────────────

/**
 * Logo-adjacent promise. Every hero, every LP, every email header.
 * Refreshed 2026-04-29 from "A doctor without the wait." to lock the
 * confident speed hook the brand was built for.
 */
export const TAGLINE = "Faster than your GP."

/**
 * Google-Ads-safe variant of TAGLINE. Healthcare ad review can flag
 * comparative practitioner claims; comparing the *wait time* to the GP
 * (rather than the practitioner directly) is substantiable and lower-risk.
 * Use on paid search and display creative; brand surfaces use TAGLINE.
 */
export const TAGLINE_PAID_SAFE = "Faster than the wait at your GP."

/**
 * Category mechanism. Default platform wedge for broad surfaces.
 *
 * Use this on homepage, request hub, pricing, and generic paid landing pages.
 * It preserves the moat: patients avoid booking friction and start with a
 * secure clinical form. It does not promise that prescription pathways never
 * need doctor contact.
 */
export const WEDGE = "No appointment. No waiting room. Start with a secure clinical form."

/**
 * Med-cert-specific wedge. Safe to use only on medical certificate surfaces
 * where the clinical protocol supports no-call completion for suitable
 * administrative documentation requests.
 */
export const MED_CERT_WEDGE = "No video. No call. No appointment."

/**
 * Prescribing and specialty-service wedge. Use for repeat prescriptions, ED,
 * hair loss, women's health, and weight management.
 */
export const FORM_FIRST_WEDGE =
  "Complete a secure clinical form. A doctor contacts you only if more information is clinically needed."

/**
 * Voice signature line. Doubles as the homepage H2 under the TAGLINE H1
 * and as the campaign sign-off on ad end-frames, email footers, and the
 * about-page lede. Saying it twice across surfaces is a feature, not a
 * duplicate — repetition is what locks the line into patient memory.
 *
 * Refreshed 2026-04-29 from "A GP, the way it should've been." to align
 * with the new brand: the line patients actually remember.
 */
export const PROP_PHRASE = "Telehealth without the small talk."

/**
 * Iconic hook. The conversion-proximate kicker. Use next to primary CTAs,
 * on Google Ads headlines, on paid social creative, and as the ending beat
 * on long-scroll marketing pages.
 *
 * Refreshed 2026-04-29 from "The doctor is in." to "Three minutes. Done."
 * because the speed hook is the strongest paid-creative performer and the
 * one patients say back to us. The original line is preserved in
 * OWNED_PHRASES for legacy/alternative use.
 */
export const ICONIC_HOOK = "Three minutes. Done."

/**
 * Outcome guarantee. Above checkout CTA, inline on heros, on /guarantee.
 *
 * Recalibrated 2026-04-28 from the prior time-bound version
 * ("Doctor reviews in 2 hours or we waive the fee.") because:
 *   1. Time guarantees create operational risk on slow days when clinical
 *      follow-up legitimately exceeds 2 hours. The promise then breaks.
 *   2. Outcome guarantees are clinically defensible without time pressure.
 *   3. Multiple competing refund copies (this constant + inline microcopy +
 *      pre-CTA pill) used to render different promises on the same page.
 *      A single canonical outcome promise eliminates the contradiction.
 *
 * Service-agnostic phrasing — applies to certificates, scripts, consults
 * and specialty pathways alike.
 */
export const GUARANTEE = "Full refund if our doctor can't help."

// ── Phrases you own (use freely) ──────────────────────────────────────

export const OWNED_PHRASES = [
  TAGLINE,
  TAGLINE_PAID_SAFE,
  WEDGE,
  MED_CERT_WEDGE,
  FORM_FIRST_WEDGE,
  PROP_PHRASE,
  ICONIC_HOOK,
  GUARANTEE,
  BRAND_THESIS,
  "A real doctor, ready in the time it takes to make a coffee.",
  "A real doctor, online, the moment you need one.",
  "The doctor is in.",
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
  "your journey",
  "healthcare journey",
  "empower",
  "empowered",
  "seamless",
  "revolutionary",
  "game-changer",
  "game-changing",
  "at the end of the day",
  "synergy",
  "transformative",
  "solutions",
  "leverage",
  "unlock",
  "ai-powered",
  "ai powered",
  "powered by ai",
] as const

// ── Em-dash detection ────────────────────────────────────────────────
// The em-dash character is banned across all marketing surfaces.
// Use commas, periods, colons, or parens instead.

export const EM_DASH = "—"

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
