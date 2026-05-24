/**
 * Rubric prompt builder + reference bar.
 *
 * The structured-output JSON Schema is generated from the Zod schema in
 * `schema.ts` so the prompt and the validator can never drift.
 *
 * To change the reference bar, edit REFERENCE_BAR here. To change the
 * rubric categories themselves, edit `rubric-categories.ts`. To change
 * the JSON shape Gemini returns, edit the Zod schema in `schema.ts`.
 */

import { RUBRIC_CATEGORIES } from "./rubric-categories"
import { buildGeminiResponseSchema } from "./schema"

export { RUBRIC_CATEGORIES } from "./rubric-categories"
export type { RubricCategoryKey } from "./rubric-categories"

export const REFERENCE_BAR = [
  {
    name: "Mosh",
    url: "https://mosh.com.au",
    why: "Direct AU comp. Warmth dial. How to feel human on a regulated-health surface.",
  },
  {
    name: "Pilot",
    url: "https://pilot.com.au",
    why: "Direct AU comp. CTA confidence. Calm conversion bar.",
  },
  {
    name: "Linear",
    url: "https://linear.app",
    why: "Motion + typographic restraint. Every transition has a reason. No decoration tax.",
  },
  {
    name: "Stripe",
    url: "https://stripe.com",
    why: "Form-flow polish on a regulated product. The gold standard for trust + speed in payments-adjacent UI.",
  },
] as const

/**
 * JSON Schema fed to Gemini's `responseSchema`. Derived from the Zod
 * schema so adding/changing fields requires a single edit in schema.ts.
 */
export const RESPONSE_SCHEMA = buildGeminiResponseSchema()

/**
 * Compose the rubric prompt fed to Gemini alongside the video.
 */
export function buildRubricPrompt(): string {
  const refBar = REFERENCE_BAR.map(
    (r) => `- ${r.name} (${r.url}) — ${r.why}`,
  ).join("\n")

  const categories = RUBRIC_CATEGORIES.map(
    (c) => `### ${c.label} (key: ${c.key})\n${c.prompt}`,
  ).join("\n\n")

  return `You are reviewing a screencast of a healthtech web product (InstantMed, an Australian telehealth platform). Your job is a candid, calibrated design + UX critique.

# Reference bar
The bar is set by these four sites. The product should feel like it belongs in their company:

${refBar}

A 10 means the product holds its own against these references. A 5 means it looks like generic healthtech. A 3 means it actively hurts trust on a regulated-health surface.

# Rubric
Score and observe each of the following categories. Be specific. Cite timestamps from the video.

${categories}

# Output rules
- Return JSON only. No prose outside the JSON.
- Every finding must carry a timestamp in seconds.
- Severity 1-5 (5 = revenue blocker on the paid path).
- Top three actions must be shippable in less than a day each.
- If a category has no findings, return an empty findings array. Do not invent issues.
- Do not be polite. The team wants real signal.`
}
