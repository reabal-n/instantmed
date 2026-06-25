import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { DensityToggle } from "@/components/operator/cases/density-toggle"
import { FilterBar } from "@/components/operator/cases/filter-bar"
import { QuickFilterChip } from "@/components/operator/cases/quick-filter-chip"

function render(el: React.ReactElement): string {
  return renderToStaticMarkup(el)
}

describe("DensityToggle", () => {
  it("renders three options as radio buttons", () => {
    const html = render(
      <DensityToggle value="comfortable" onValueChange={() => {}} />,
    )
    expect(html).toContain("Compact")
    expect(html).toContain("Comfortable")
    expect(html).toContain("Spacious")
    const radios = html.match(/role="radio"/g) ?? []
    expect(radios.length).toBe(3)
  })

  it("marks the active option with aria-checked=true", () => {
    const html = render(
      <DensityToggle value="compact" onValueChange={() => {}} />,
    )
    // Find each button and assert the Compact one is checked
    const buttons = html.match(/<button [^>]*>/g) ?? []
    const compact = buttons.find((b) => b.includes('aria-label="Compact"'))
    const comfortable = buttons.find((b) =>
      b.includes('aria-label="Comfortable"'),
    )
    expect(compact).toBeDefined()
    expect(compact).toContain('aria-checked="true"')
    expect(comfortable).toContain('aria-checked="false"')
  })

  it("exposes a radiogroup aria role", () => {
    const html = render(
      <DensityToggle value="comfortable" onValueChange={() => {}} />,
    )
    expect(html).toContain('role="radiogroup"')
  })
})

describe("QuickFilterChip", () => {
  it("renders the label", () => {
    const html = render(
      <QuickFilterChip label="Priority" active={false} onClick={() => {}} />,
    )
    expect(html).toContain("Priority")
  })

  it("uses primary tint when active", () => {
    const html = render(
      <QuickFilterChip label="Priority" active onClick={() => {}} />,
    )
    expect(html).toContain("bg-primary/10")
    expect(html).toContain('aria-pressed="true"')
  })

  it("never uses brand coral", () => {
    const active = render(
      <QuickFilterChip label="Priority" active onClick={() => {}} />,
    )
    const inactive = render(
      <QuickFilterChip label="Priority" active={false} onClick={() => {}} />,
    )
    expect(active).not.toMatch(/brand-coral|coral/)
    expect(inactive).not.toMatch(/brand-coral|coral/)
  })

  it("renders an optional count", () => {
    const html = render(
      <QuickFilterChip
        label="Failed pay"
        count={3}
        active={false}
        onClick={() => {}}
      />,
    )
    expect(html).toContain("Failed pay")
    expect(html).toContain(">3<")
  })
})

describe("FilterBar", () => {
  it("renders a labelled search input", () => {
    const html = render(
      <FilterBar
        searchValue=""
        onSearchChange={() => {}}
        density="comfortable"
        onDensityChange={() => {}}
      />,
    )
    expect(html).toMatch(/aria-label="Search cases"/)
  })

  it("renders quick filter chips when provided", () => {
    const html = render(
      <FilterBar
        searchValue=""
        onSearchChange={() => {}}
        density="comfortable"
        onDensityChange={() => {}}
        quickFilters={[
          { id: "priority", label: "Priority" },
          { id: "stale", label: "Stale > 4h" },
        ]}
      />,
    )
    expect(html).toContain("Priority")
    expect(html).toContain("Stale &gt; 4h")
  })

  it("threads totalLabel through to the bar", () => {
    const html = render(
      <FilterBar
        searchValue=""
        onSearchChange={() => {}}
        density="comfortable"
        onDensityChange={() => {}}
        totalLabel="33 results"
      />,
    )
    expect(html).toContain("33 results")
  })

  it("renders the density toggle", () => {
    const html = render(
      <FilterBar
        searchValue=""
        onSearchChange={() => {}}
        density="comfortable"
        onDensityChange={() => {}}
      />,
    )
    expect(html).toContain("Compact")
    expect(html).toContain("Spacious")
  })
})
