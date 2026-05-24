/**
 * Single source of truth for the Critique JSON shape.
 *
 * The same Zod schema:
 *   1. Generates the JSON Schema fed to Gemini's `responseSchema` config
 *      (forces structured output without hand-rolling a parallel JSON
 *      Schema that can drift).
 *   2. Validates Gemini's response at runtime.
 *   3. Exports the inferred TypeScript type so downstream stages get
 *      type-safe access to fields.
 *
 * If you want to change the rubric output shape, change it HERE and
 * nowhere else. The Zod-to-JSON-Schema conversion + the validator stay
 * in lockstep automatically.
 */

import { z } from "zod"

import { RUBRIC_CATEGORIES } from "./rubric-categories"

/**
 * Per-category schema. Same shape across every rubric category, so we
 * build one base and apply it to each category key.
 */
const CategorySchema = z.object({
  score: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe("1-10. 10 matches reference bar. 5 generic healthtech. 3 actively hurts trust."),
  observation: z
    .string()
    .min(20)
    .describe("Concrete observation of what you saw. No platitudes."),
  findings: z
    .array(
      z.object({
        severity: z
          .number()
          .int()
          .min(1)
          .max(5)
          .describe("1 = nit. 5 = revenue blocker on paid path."),
        timestamp_seconds: z.number().min(0),
        issue: z.string().min(10).describe("One sentence, specific."),
        recommendation: z
          .string()
          .min(10)
          .describe("Concrete fix. Include file path or component name if inferrable."),
      }),
    )
    .describe("Empty array OK. Do not invent issues."),
})

/**
 * Build the categories object schema dynamically so adding a new category
 * to RUBRIC_CATEGORIES propagates here without manual sync.
 */
const CategoriesShape = Object.fromEntries(
  RUBRIC_CATEGORIES.map((c) => [c.key, CategorySchema]),
)

export const CritiqueSchema = z
  .object({
    summary: z
      .string()
      .min(50)
      .describe(
        "2-3 sentence overall impression. Lead with the strongest signal, positive or negative.",
      ),
    overall_score: z
      .number()
      .int()
      .min(1)
      .max(10)
      .describe("1-10. 10 matches reference bar (Linear/Stripe-grade). 5 generic healthtech."),
    categories: z.object(CategoriesShape),
    top_three_actions: z
      .array(
        z.object({
          action: z.string().min(10),
          why: z.string().min(10).describe("Tied to a specific observation above."),
          estimated_impact: z.enum(["high", "medium", "low"]),
        }),
      )
      .length(3, "Must return exactly three top actions, ordered most to least valuable."),
  })
  .strict()

export type StructuredCritique = z.infer<typeof CritiqueSchema>

/**
 * Gemini accepts a subset of JSON Schema in `responseSchema`. Zod 4's
 * built-in JSON Schema export covers the dialect we need. We strip the
 * `$schema` and `additionalProperties` keys that Gemini does not
 * recognise, but leave the rest verbatim.
 */
export function buildGeminiResponseSchema(): Record<string, unknown> {
  const raw = z.toJSONSchema(CritiqueSchema)
  return stripUnsupportedKeys(raw) as Record<string, unknown>
}

function stripUnsupportedKeys(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripUnsupportedKeys)
  if (!node || typeof node !== "object") return node
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === "$schema" || k === "additionalProperties") continue
    out[k] = stripUnsupportedKeys(v)
  }
  return out
}
