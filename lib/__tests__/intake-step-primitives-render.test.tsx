import { Stethoscope } from "lucide-react"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import {
  ChipToggleGroup,
  ChoiceCardGroup,
  ScaleChoiceGroup,
  SegmentedChoiceGroup,
  ToggleList,
  YesNoDetailQuestion,
} from "@/components/request/shared/intake-step-primitives"
import { MedicalHistoryToggles } from "@/components/request/shared/medical-history-toggles"

const render = (element: React.ReactElement) => renderToStaticMarkup(element)

describe("intake step primitives", () => {
  it("renders canonical choice cards with descriptions, chips, and disabled labels", () => {
    const html = render(
      <ChoiceCardGroup
        options={[
          {
            value: "daily",
            label: "Daily routine",
            description: "A daily option with less timing around activity.",
            chips: ["Routine", "Less planning"],
          },
          {
            value: "future",
            label: "Future service",
            description: "This option is not live yet.",
            disabled: true,
            disabledLabel: "Coming soon",
          },
        ]}
        value="daily"
        onChange={vi.fn()}
        ariaLabel="Treatment preference"
      />,
    )

    expect(html).toContain('data-intake-choice-card-group="true"')
    expect(html).toContain('data-intake-choice-card="true"')
    expect(html).toContain("Daily routine")
    expect(html).toContain("A daily option with less timing around activity.")
    expect(html).toContain("Routine")
    expect(html).toContain("Coming soon")
    expect(html).toContain('aria-disabled="true"')
  })

  it("keeps compact icon-only choice cards dense and vertically aligned", () => {
    const html = render(
      <ChoiceCardGroup
        options={[
          { value: "doctor", label: "Doctor decides", icon: Stethoscope },
          { value: "routine", label: "Daily routine", icon: Stethoscope },
        ]}
        value="doctor"
        onChange={vi.fn()}
        ariaLabel="Treatment preference"
        columns="two"
        mobileColumns="two"
        compact
      />,
    )

    expect(html).toContain("grid-cols-2 sm:grid-cols-2")
    expect(html).toContain("items-center")
    expect(html).toContain("h-7 w-7")
    expect(html).toContain("h-3.5 w-3.5")
  })

  it("supports explicit three-column mobile choice groups for very short options", () => {
    const html = render(
      <ChoiceCardGroup
        options={[
          { value: "one", label: "1 day" },
          { value: "two", label: "2 days" },
          { value: "three", label: "3 days" },
        ]}
        value="one"
        onChange={vi.fn()}
        ariaLabel="Certificate duration"
        columns="three"
        mobileColumns="three"
        compact
      />,
    )

    expect(html).toContain("grid-cols-3")
  })

  it("can hide supporting chips on mobile for compact specialty cards", () => {
    const html = render(
      <ChoiceCardGroup
        options={[
          {
            value: "prn",
            label: "As-needed",
            description: "A planned-use option.",
            chips: ["Flexible", "Occasional use"],
          },
        ]}
        value="prn"
        onChange={vi.fn()}
        ariaLabel="Treatment preference"
        compact
        hideChipsOnMobile
      />,
    )

    expect(html).toContain("flex flex-wrap")
    expect(html).toContain("hidden sm:flex")
  })

  it("centres compact chip-only cards on mobile when their chips are hidden", () => {
    const html = render(
      <ChoiceCardGroup
        options={[
          {
            value: "mild",
            label: "Temple recession",
            icon: Stethoscope,
            chips: ["Mild"],
          },
        ]}
        value="mild"
        onChange={vi.fn()}
        ariaLabel="Hair pattern"
        compact
        hideChipsOnMobile
      />,
    )

    expect(html).toContain("items-center sm:items-start")
    expect(html).toContain("h-7 w-7 sm:h-9 sm:w-9")
  })

  it("renders compact numeric scale choices without oversized circle controls", () => {
    const html = render(
      <ScaleChoiceGroup
        values={[1, 2, 3, 4, 5]}
        value={3}
        onChange={vi.fn()}
        ariaLabel="Confidence scale"
        lowLabel="Low"
        highLabel="High"
      />,
    )

    expect(html).toContain('data-intake-scale-choice-group="true"')
    expect(html).toContain("grid-cols-5")
    expect(html).toContain("min-h-11")
    expect(html).not.toContain("rounded-full")
    expect(html).toContain("Low")
    expect(html).toContain("High")
  })

  it("supports three-column segmented choices for short answer sets", () => {
    const html = render(
      <SegmentedChoiceGroup
        options={[
          { value: "no", label: "No" },
          { value: "not_sure", label: "Not sure" },
          { value: "yes", label: "Yes" },
        ]}
        value="no"
        onChange={vi.fn()}
        ariaLabel="Pregnancy status"
        columns="three"
      />,
    )

    expect(html).toContain("grid-cols-3")
    expect(html).toContain("No")
    expect(html).toContain("Not sure")
    expect(html).toContain("Yes")
  })

  it("renders canonical toggle rows for independent yes/no selections", () => {
    const html = render(
      <ToggleList
        items={[
          { key: "burning", label: "Burning when passing urine" },
          { key: "frequency", label: "Passing urine more often" },
        ]}
        values={{ burning: true }}
        onChange={vi.fn()}
      />,
    )

    expect(html).toContain('data-intake-toggle-list="true"')
    expect(html).toContain('data-intake-toggle-row="true"')
    expect(html).toContain("Burning when passing urine")
    expect(html).toContain("Passing urine more often")
  })

  it("renders compact chip toggles for lightweight multi-select starters", () => {
    const html = render(
      <ChipToggleGroup
        options={[
          { key: "fever", label: "Fever" },
          { key: "cough", label: "Cough or sore throat" },
        ]}
        values={{ fever: true }}
        onChange={vi.fn()}
        ariaLabel="Common symptoms"
      />,
    )

    expect(html).toContain('data-intake-chip-toggle-group="true"')
    expect(html).toContain('data-intake-chip-toggle="true"')
    expect(html).toContain("Fever")
    expect(html).toContain("Cough or sore throat")
    expect(html).toContain('aria-pressed="true"')
  })

  it("keeps medical-history toggle lists on the canonical toggle primitive", () => {
    const html = render(
      <MedicalHistoryToggles
        items={[{ key: "thyroid", label: "Thyroid condition" }]}
        values={{ thyroid: false }}
        onChange={vi.fn()}
      />,
    )

    expect(html).toContain('data-intake-toggle-list="true"')
    expect(html).toContain('data-intake-toggle-row="true"')
    expect(html).toContain("Thyroid condition")
  })

  it("renders a reusable yes/no question with detail reveal copy", () => {
    const html = render(
      <YesNoDetailQuestion
        label="Any allergies?"
        helpText="Drug, food, or environmental allergies"
        noLabel="No allergies"
        yesLabel="Yes"
        value={true}
        onSelect={vi.fn()}
        detail="Penicillin"
        onDetailChange={vi.fn()}
        detailPlaceholder="e.g., Penicillin - rash"
        error="Please list your allergies"
      />,
    )

    expect(html).toContain('data-intake-yes-no-detail-question="true"')
    expect(html).toContain("Any allergies?")
    expect(html).toContain("Drug, food, or environmental allergies")
    expect(html).toContain("No allergies")
    expect(html).toContain("Penicillin")
    expect(html).toContain("Please list your allergies")
    expect(html).toContain('id="any-allergies-hint"')
    expect(html).toContain('aria-describedby="any-allergies-hint any-allergies-error"')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('aria-required="true"')
  })
})
