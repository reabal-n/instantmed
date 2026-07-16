import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { ProgressBar } from "@/components/request/progress-bar"

const STEPS = [
  { id: "certificate", shortLabel: "Certificate" },
  { id: "symptoms", shortLabel: "Symptoms" },
  { id: "details", shortLabel: "Details" },
  { id: "checkout", shortLabel: "Pay" },
]

describe("request progress bar", () => {
  it("keeps previously visited later steps actionable while reviewing an earlier step", () => {
    const html = renderToStaticMarkup(
      <ProgressBar
        steps={STEPS}
        currentIndex={0}
        furthestVisitedIndex={3}
        maxReachableIndex={3}
        stepsNeedingRevalidation={[]}
        onStepClick={vi.fn()}
      />,
    )

    expect(html.match(/data-request-progress-actionable="true"/g)).toHaveLength(4)
  })

  it("exposes the first step needing review and disables the steps after it", () => {
    const html = renderToStaticMarkup(
      <ProgressBar
        steps={STEPS}
        currentIndex={0}
        furthestVisitedIndex={3}
        maxReachableIndex={1}
        stepsNeedingRevalidation={["symptoms"]}
        onStepClick={vi.fn()}
      />,
    )

    expect(html.match(/data-request-progress-actionable="true"/g)).toHaveLength(2)
    expect(html).toContain('aria-label="Symptoms needs review"')
  })
})
