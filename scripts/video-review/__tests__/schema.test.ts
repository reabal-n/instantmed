import { describe, expect, it } from "vitest"

import { RUBRIC_CATEGORIES } from "../rubric-categories"
import { buildGeminiResponseSchema, CritiqueSchema } from "../schema"

const VALID_CRITIQUE = {
  summary:
    "Strong brand spine on the hero but conversion friction creeps in at the cert step. Mobile feels Linear-grade until the form opens, then it stops feeling considered.",
  overall_score: 7,
  categories: Object.fromEntries(
    RUBRIC_CATEGORIES.map((c) => [
      c.key,
      {
        score: 7,
        observation: `Observation for ${c.label}: the surface holds the bar in places but slips in others.`,
        findings: [],
      },
    ]),
  ),
  top_three_actions: [
    {
      action: "Tighten the cert-step CTA",
      why: "The conversion-proximate CTA was unclear at 0:24.",
      estimated_impact: "high" as const,
    },
    {
      action: "Remove the sticky-bar text echo",
      why: "Mobile bar duplicates the inline button label.",
      estimated_impact: "medium" as const,
    },
    {
      action: "Anchor the price in the first viewport",
      why: "Price only appears at 0:38 after scroll.",
      estimated_impact: "low" as const,
    },
  ],
}

describe("CritiqueSchema", () => {
  it("accepts a well-formed Gemini critique", () => {
    const result = CritiqueSchema.safeParse(VALID_CRITIQUE)
    expect(result.success).toBe(true)
  })

  it("rejects a critique missing a rubric category", () => {
    const broken = JSON.parse(JSON.stringify(VALID_CRITIQUE)) as typeof VALID_CRITIQUE
    delete (broken.categories as Record<string, unknown>)[RUBRIC_CATEGORIES[0]!.key]
    const result = CritiqueSchema.safeParse(broken)
    expect(result.success).toBe(false)
  })

  it("rejects scores outside 1-10", () => {
    const tooLow = { ...VALID_CRITIQUE, overall_score: 0 }
    expect(CritiqueSchema.safeParse(tooLow).success).toBe(false)
    const tooHigh = { ...VALID_CRITIQUE, overall_score: 11 }
    expect(CritiqueSchema.safeParse(tooHigh).success).toBe(false)
  })

  it("requires exactly three top actions", () => {
    const twoActions = {
      ...VALID_CRITIQUE,
      top_three_actions: VALID_CRITIQUE.top_three_actions.slice(0, 2),
    }
    expect(CritiqueSchema.safeParse(twoActions).success).toBe(false)
    const fourActions = {
      ...VALID_CRITIQUE,
      top_three_actions: [...VALID_CRITIQUE.top_three_actions, VALID_CRITIQUE.top_three_actions[0]],
    }
    expect(CritiqueSchema.safeParse(fourActions).success).toBe(false)
  })

  it("rejects estimated_impact values outside the enum", () => {
    const bad = {
      ...VALID_CRITIQUE,
      top_three_actions: [
        {
          ...VALID_CRITIQUE.top_three_actions[0]!,
          estimated_impact: "MEGA-HIGH" as unknown as "high",
        },
        ...VALID_CRITIQUE.top_three_actions.slice(1),
      ],
    }
    expect(CritiqueSchema.safeParse(bad).success).toBe(false)
  })

  it("rejects unknown top-level keys (strict mode)", () => {
    const bad = { ...VALID_CRITIQUE, extra_field: "should not be here" }
    expect(CritiqueSchema.safeParse(bad).success).toBe(false)
  })
})

describe("buildGeminiResponseSchema", () => {
  it("returns a JSON Schema object", () => {
    const schema = buildGeminiResponseSchema()
    expect(schema).toBeTypeOf("object")
    expect(schema).toHaveProperty("type", "object")
    expect(schema).toHaveProperty("properties")
  })

  it("does NOT contain keys Gemini rejects ($schema, additionalProperties)", () => {
    const schema = buildGeminiResponseSchema()
    const json = JSON.stringify(schema)
    expect(json).not.toContain('"$schema"')
    expect(json).not.toContain('"additionalProperties"')
  })

  it("includes every rubric category in properties.categories.properties", () => {
    const schema = buildGeminiResponseSchema() as {
      properties: {
        categories: { properties: Record<string, unknown> }
      }
    }
    for (const cat of RUBRIC_CATEGORIES) {
      expect(schema.properties.categories.properties).toHaveProperty(cat.key)
    }
  })
})
