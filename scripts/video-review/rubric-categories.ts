/**
 * Rubric category definitions. Pulled into its own file so both
 * rubric.ts (prompt builder) and schema.ts (Zod schema) can import
 * them without circular dependency.
 *
 * To add a category:
 *   1. Add an entry below.
 *   2. schema.ts auto-extends the categories object.
 *   3. rubric.ts auto-includes the category prompt.
 *   4. Re-run any sample critique to confirm Gemini honors the new key.
 */

import { GUARANTEE, PROP_PHRASE, TAGLINE } from "@/lib/marketing/voice"

export const RUBRIC_CATEGORIES = [
  {
    key: "brand_spine",
    label: "Brand spine",
    prompt:
      `On public marketing, are '${TAGLINE}' and '${PROP_PHRASE}' clear and credible? Assess distinctive, calm communication. Intake and staff screens should prioritise their task; do not require marketing slogans there.`,
  },
  {
    key: "typography",
    label: "Typography",
    prompt:
      "Hero uses Plus Jakarta Sans: 36px mobile, 48px tablet, 60px desktop. Body uses Source Sans 3, with 16px minimum on patient flows. Is hierarchy clear? Are line-height and line length comfortable? Identify awkward wrapping, unreadable labels or dense paragraphs. Do not require desktop headline sizes on mobile.",
  },
  {
    key: "color_and_surface",
    label: "Color & surface",
    prompt:
      "Light-mode pages use warm ivory #F8F7F4 with solid white cards and restrained sky-toned shadows. Dark mode uses the corresponding dark surfaces. Primary CTA is #2563EB blue; coral is a brand accent. Assess contrast, readable states and calm hierarchy. Do not flag white cards as a background violation.",
  },
  {
    key: "motion",
    label: "Motion",
    prompt:
      "Assess observed transitions, layout stability and interruptions. Motion must serve orientation; no extra animation is required. Staff screens should remain quiet. Reduced-motion behaviour requires a capture of that setting. Static frames cannot establish timing, easing, jank or reduced-motion support: return score null for motion when only frames are supplied.",
  },
  {
    key: "copy_voice",
    label: "Copy & voice",
    prompt:
      "Voice = calm unhurried GP. Short sentences with full stops. Names the wait then removes it. No hype words, no 'our platform', no medical jargon, no em-dashes, no stacked adjectives, no banned phrases (cutting-edge, world-class, holistic, seamless, revolutionary, transformative, leverage, unlock, ai-powered etc). Australian English. Prices in the first breath. Flag any sentence that fails 'would a real GP say this out loud?'",
  },
  {
    key: "hierarchy_and_layout",
    label: "Hierarchy & layout",
    prompt:
      "Does the eye land on the primary CTA within 2 seconds? Is there a clear visual rhythm (Stripe-grade spacing)? Are sections distinguishable without heavy dividers? Mobile-first: does the 375px viewport feel composed, not crammed?",
  },
  {
    key: "conversion_friction",
    label: "Conversion friction",
    prompt:
      `Assess the observed path: unclear next steps, redundant entry, missing prices, obscured controls, validation and recovery. The approved refund wording is '${GUARANTEE}'. Clinical identity and safety requirements are not optional friction. On staff screens, assess safe review, prescribing and return to the same request instead of patient conversion.`,
  },
  {
    key: "signature_devices",
    label: "Signature brand devices",
    prompt:
      "Assess existing brand devices only on captured surfaces where they are appropriate. A wait counter needs real evidence; never suggest a made-up time or delivery guarantee. Emails and confirmation screens cannot be assessed when absent from the capture. Do not ask for every device on every screen or add decoration to clinical work. Return score null when this category is not applicable.",
  },
] as const

export type RubricCategoryKey = (typeof RUBRIC_CATEGORIES)[number]["key"]
