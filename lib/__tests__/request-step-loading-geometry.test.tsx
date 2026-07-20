import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { StepLoading } from "@/components/request/step-components"

const FIRST_STEP_CARD_COUNTS = {
  "certificate-step": 3,
  "medication-step": 6,
  "ed-goals-step": 2,
  "hair-loss-goals-step": 2,
  "womens-health-type-step": 1,
} as const

describe("request step loading geometry", () => {
  for (const [componentPath, expectedCardCount] of Object.entries(FIRST_STEP_CARD_COUNTS)) {
    it(`reserves the ${componentPath} card geometry on the first render`, () => {
      const html = renderToStaticMarkup(
        <StepLoading componentPath={componentPath} showIntro={componentPath !== "certificate-step"} />,
      )

      expect(html.match(/data-intake-loading-card=/g) ?? []).toHaveLength(expectedCardCount)
      expect(html).toContain(`data-intake-loading-geometry="${componentPath}"`)
    })
  }
})
