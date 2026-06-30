import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8")
}

const requestFlowSource = readProjectFile("components/request/request-flow.tsx")
const requestButtonSource = readProjectFile("components/request/request-button.tsx")
const rootLayoutSource = readProjectFile("app/layout.tsx")
const intakePrimitivesSource = readProjectFile("components/request/shared/intake-step-primitives.tsx")

const intakeStepFiles = [
  "components/request/steps/certificate-step.tsx",
  "components/request/steps/symptoms-step.tsx",
  "components/request/steps/medication-step.tsx",
  "components/request/steps/medication-history-step.tsx",
  "components/request/steps/medical-history-step.tsx",
  "components/request/steps/patient-details-step.tsx",
  "components/request/steps/review-step.tsx",
  "components/request/steps/ed-goals-step.tsx",
  "components/request/steps/ed-assessment-step.tsx",
  "components/request/steps/ed-health-step.tsx",
  "components/request/steps/ed-preferences-step.tsx",
  "components/request/steps/hair-loss-goals-step.tsx",
  "components/request/steps/hair-loss-assessment-step.tsx",
  "components/request/steps/hair-loss-health-step.tsx",
  "components/request/steps/hair-loss-preferences-step.tsx",
  "components/request/steps/weight-loss-assessment-step.tsx",
  "components/request/steps/weight-loss-call-step.tsx",
  "components/request/steps/womens-health-type-step.tsx",
  "components/request/steps/womens-health-assessment-step.tsx",
]

describe("intake mobile viewport contract", () => {
  it("uses a real mobile primary-action bar instead of making users scroll to continue", () => {
    expect(requestFlowSource).toContain('data-intake-mobile-action-bar="true"')
    expect(requestFlowSource).toContain("[data-intake-primary-action='true']")
    expect(requestButtonSource).toContain("data-intake-primary-ready")
    expect(requestFlowSource).toContain("INTAKE_PRIMARY_ACTION_CHANGE_EVENT")
    expect(requestFlowSource).not.toContain("MutationObserver")
    expect(requestButtonSource).toContain("window.dispatchEvent(new Event(INTAKE_PRIMARY_ACTION_CHANGE_EVENT))")
    expect(requestFlowSource).toContain("handleMobilePrimaryAction")
    expect(requestFlowSource).toContain('variant={mobileActionReady ? "default" : "secondary"}')
    // The mobile action bar is no longer excluded on the pay step — the unified
    // review-step drives it like every other step (2026-06-28 unification).
    expect(requestFlowSource).not.toContain("currentStepId !== 'checkout'")
    expect(requestFlowSource).not.toContain("hidden on checkout/review which have their own CTAs")
  })

  it("keeps the mobile intake chrome compact enough for one-screen question steps", () => {
    expect(requestFlowSource).toContain("h-12 sm:h-14")
    expect(requestFlowSource).toContain("hidden sm:flex")
    expect(requestFlowSource).toContain("py-4 sm:py-6")
    expect(requestFlowSource).toContain("pb-[calc(4.25rem+env(safe-area-inset-bottom))]")
  })

  it.each(intakeStepFiles)("%s exposes one mobile shell primary action", (path) => {
    const source = readProjectFile(path)
    expect(source).toContain('data-intake-primary-action="true"')
    expect(source).toContain("data-intake-primary-ready")
    expect(source).toContain("max-sm:hidden")
  })

  it("declares intentional smooth scrolling on the root html element", () => {
    expect(rootLayoutSource).toContain('data-scroll-behavior="smooth"')
  })

  it("uses explicit question primitives for sensitive intake answers", () => {
    expect(intakePrimitivesSource).toContain('data-intake-question-card="true"')
    expect(intakePrimitivesSource).toContain('data-intake-binary-choice="true"')

    const edHealthSource = readProjectFile("components/request/steps/ed-health-step.tsx")
    const hairHealthSource = readProjectFile("components/request/steps/hair-loss-health-step.tsx")
    expect(edHealthSource).toContain("BinaryChoice")
    expect(hairHealthSource).toContain("BinaryChoice")
    expect(edHealthSource).not.toContain("SwitchField")
    expect(hairHealthSource).not.toContain("SwitchField")
  })

  it("keeps the ED assessment to one visible IIEF question at a time", () => {
    const source = readProjectFile("components/request/steps/ed-assessment-step.tsx")
    expect(source).toContain("activeQuestionIndex")
    expect(source).toContain("Question {activeQuestionIndex + 1} of")
    expect(source).toContain("handleScaleChange")
  })

  it("keeps ED assessment progress visually slim inside touch-sized buttons", () => {
    const source = readProjectFile("components/request/steps/ed-assessment-step.tsx")
    expect(source).toContain('data-ed-assessment-progress-button="true"')
    expect(source).toContain('data-ed-assessment-progress-bar="true"')
    expect(source).not.toContain('"h-1.5 flex-1 rounded-full transition-colors"')
  })

  it("uses compact chips for UTI symptom multi-select instead of full toggle rows", () => {
    const source = readProjectFile("components/request/steps/womens-health-assessment-step.tsx")
    expect(source).toContain("ChipToggleGroup")
    expect(source).toContain('ariaLabel="UTI symptoms"')
    expect(source).not.toContain("<ToggleList")
  })

  it("keeps UTI assessment copy and safety checks compact on mobile", () => {
    const source = readProjectFile("components/request/steps/womens-health-assessment-step.tsx")
    expect(source).toContain("UTI safety checks")
    expect(source).toContain("Burning or stinging")
    expect(source).toContain("Urgent need to go")
    expect(source).not.toContain("Feeling like bladder isn't empty")
    expect(source).not.toContain("Needing to urinate more often")
  })

  it("uses compact repeat-prescription history labels on mobile", () => {
    const source = readProjectFile("components/request/steps/medication-history-step.tsx")
    expect(source).toContain('{ value: "less_than_3_months", label: "Under 3 months" }')
    expect(source).not.toContain('{ value: "never", label: "Never" }')
    expect(source).toContain("I have not been prescribed this before")
    expect(source).toContain('columns="two"')
    expect(source).not.toContain("Less than 3 months ago")
    expect(source).not.toContain("Never prescribed this medication")
  })

  it("keeps the repeat-prescription new-medication handoff aligned to live specialty services", () => {
    const source = readProjectFile("components/request/steps/medication-history-step.tsx")
    expect(source).toContain("ED, hair loss, and women&apos;s health")
    expect(source).toContain("Not a repeat prescription")
    expect(source).toContain("Repeat prescriptions are only for medicines another doctor has prescribed before.")
    expect(source).not.toContain("friendly upsell to consult flow")
    expect(source).not.toContain("ED and hair loss treatment.")
  })

  it("keeps ED assessment score copy doctor-review framed instead of outcome-led", () => {
    const source = readProjectFile("components/request/steps/ed-assessment-step.tsx")
    expect(source).toContain("A doctor will review your answers")
    expect(source).not.toContain("respond well to treatment")
    expect(source).not.toContain("Treatment is very effective")
    expect(source).not.toContain("Our doctors regularly help patients")
    expect(source).not.toContain("effective treatment options exist")
  })

  it("keeps women's-health type selection short and limited to actionable paths", () => {
    const source = readProjectFile("components/request/steps/womens-health-type-step.tsx")
    expect(source).toContain("Start or switch pill")
    expect(source).toContain("Choose one. Current-pill repeats go through repeat prescriptions.")
    expect(source).not.toContain("Emergency contraception")
    expect(source).not.toContain("Period pain or menstrual issues")
    expect(source).not.toContain("The doctor reviews the details after checkout")
    expect(source).not.toContain("disabled={!womensHealthOption}")
  })

  it("shows women's-health safety answers in the patient review summary with readable labels", () => {
    const source = readProjectFile("components/request/steps/review-step.tsx")
    expect(source).toContain("UTI_REVIEW_SYMPTOM_LABELS")
    expect(source).toContain("PILL_SAFETY_REVIEW_LABELS")
    expect(source).toContain("UTI red flags")
    expect(source).toContain("Pregnancy check")
    expect(source).toContain("Migraine with aura")
    expect(source).toContain("Blood clot history")
    expect(source).toContain("Smoking status")
    expect(source).not.toContain("String(answers.utiPregnant)")
    expect(source).not.toContain("String(answers.pregnancyStatus)")
  })

  it("uses secondary styling, not faded primary styling, for clickable incomplete CTAs", () => {
    const sources = [
      "components/request/steps/certificate-step.tsx",
      "components/request/steps/medication-step.tsx",
      "components/request/steps/medication-history-step.tsx",
      "components/request/steps/medical-history-step.tsx",
      "components/request/steps/review-step.tsx",
    ].map((path) => readProjectFile(path))

    for (const source of sources) {
      expect(source).toContain('data-intake-primary-ready=')
      expect(source).toContain('variant={')
      expect(source).not.toContain("opacity-60")
    }
  })

  it("keeps ED goal selection as a balanced four-option grid", () => {
    const source = readProjectFile("components/request/steps/ed-goals-step.tsx")
    const goalOptionsMatch = source.match(/const GOAL_OPTIONS = \[([\s\S]*?)\] as const/)
    expect(goalOptionsMatch).toBeTruthy()
    const optionRows = goalOptionsMatch?.[1].match(/value:/g) ?? []
    expect(optionRows).toHaveLength(4)
    expect(source).not.toContain("Maintain what I have")
  })

  it("keeps hair-loss onset selection as a balanced four-option grid", () => {
    const source = readProjectFile("components/request/steps/hair-loss-goals-step.tsx")
    const onsetOptionsMatch = source.match(/const ONSET_OPTIONS = \[([\s\S]*?)\] as const/)
    expect(onsetOptionsMatch).toBeTruthy()
    const optionRows = onsetOptionsMatch?.[1].match(/value:/g) ?? []
    expect(optionRows).toHaveLength(4)
    expect(source).toContain('{ value: "under_6_months", label: "Under 6 months" }')
    expect(source).toContain('{ value: "over_12_months", label: "Over 12 months" }')
    expect(source).toContain('columns="two"')
    expect(source).not.toContain('className="sm:grid-cols-5"')
    expect(source).not.toContain('{ value: "few_months", label: "Few months" }')
    expect(source).not.toContain('{ value: "1_2_years", label: "1-2 years" }')
    expect(source).not.toContain('{ value: "2_plus_years", label: "2+ years" }')
  })

  it("keeps hair-loss family history as a balanced four-option grid", () => {
    const source = readProjectFile("components/request/steps/hair-loss-assessment-step.tsx")
    const familyOptionsMatch = source.match(/const FAMILY_HISTORY_OPTIONS = \[([\s\S]*?)\]/)
    expect(familyOptionsMatch).toBeTruthy()
    const optionRows = familyOptionsMatch?.[1].match(/value:/g) ?? []
    expect(optionRows).toHaveLength(4)
    expect(source).toContain('{ value: "no_or_unsure", label: "No or not sure" }')
    expect(source).toContain('ariaLabel="Do you have a family history of hair loss"')
    expect(source).toContain('columns="two"')
    expect(source).not.toContain('columns="one"')
    expect(source).not.toContain("Yes, on my father's side")
    expect(source).not.toContain("Yes, on my mother's side")
    expect(source).not.toContain('{ value: "no", label: "No family history" }')
    expect(source).not.toContain('{ value: "unknown", label: "Not sure" }')
  })

  it("uses compact chips for optional hair-loss previous treatments", () => {
    const source = readProjectFile("components/request/steps/hair-loss-assessment-step.tsx")
    expect(source).toContain("ChipToggleGroup")
    expect(source).toContain('ariaLabel="Previous hair loss treatments"')
    expect(source).toContain("Select any you have used.")
    expect(source).not.toContain("<MedicalHistoryToggles")
    expect(source).not.toContain("Toggle on any treatments")
  })

  it("does not render the med-cert two-day upsell nudge", () => {
    const source = [
      readProjectFile("components/request/steps/certificate-step.tsx"),
      readProjectFile("components/request/steps/review-step.tsx"),
    ].join("\n")
    expect(source).not.toContain("Make it 2 days")
    expect(source).not.toContain("Need to cover a second day")
    expect(source).not.toContain("medcert-extra-day")
    expect(source).not.toContain("medcert_duration_nudge_taken")
    expect(source).not.toContain("medcert_extra_day_added")
    expect(source).not.toContain("twoDayUpsellDelta")
  })

  it("keeps hair-loss pattern labels short enough for compact mobile cards", () => {
    const source = readProjectFile("components/request/steps/hair-loss-assessment-step.tsx")
    expect(source).toContain('label: "Temple recession"')
    expect(source).toContain('label: "Crown + hairline"')
    expect(source).not.toContain("Crown thinning + hairline recession")
    expect(source).not.toContain("Slight recession at temples")
  })

  it("keeps active ED and hair preference copy away from named prescription medicines", () => {
    const preferenceCopy = [
      readProjectFile("components/request/steps/ed-preferences-step.tsx"),
      readProjectFile("components/request/steps/hair-loss-preferences-step.tsx"),
      readProjectFile("components/request/steps/hair-loss-health-step.tsx"),
    ].join("\n").toLowerCase()

    expect(preferenceCopy).not.toContain("finasteride")
    expect(preferenceCopy).not.toContain("sildenafil")
    expect(preferenceCopy).not.toContain("tadalafil")
  })
})
