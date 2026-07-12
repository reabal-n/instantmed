import { existsSync,readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function readProjectFile(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

function findRouteFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) return findRouteFiles(fullPath)
    return entry.name === "route.ts" || entry.name === "route.tsx" ? [fullPath] : []
  })
}

function findFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) return findFiles(fullPath)
    return [fullPath]
  })
}

function findRouteInventoryFiles(dir: string): string[] {
  const routeLikeNames = new Set([
    "page.tsx",
    "route.ts",
    "route.tsx",
    "opengraph-image.tsx",
    "sitemap.ts",
    "robots.ts",
    "manifest.ts",
    "icon.tsx",
    "apple-icon.tsx",
  ])

  return findFiles(dir).filter((file) => routeLikeNames.has(file.split("/").pop() ?? ""))
}

const agents = readProjectFile("AGENTS.md")
const claude = readProjectFile("CLAUDE.md")
const architecture = readProjectFile("docs/ARCHITECTURE.md")
const aiProvider = readProjectFile("lib/ai/provider.ts")
const aiOnboarding = readProjectFile("docs/AI_ONBOARDING.md")
const design = readProjectFile("DESIGN.md")
const product = readProjectFile("PRODUCT.md")
const testing = readProjectFile("docs/TESTING.md")
const requestReadme = readProjectFile("components/request/README.md")
const ciWorkflow = readProjectFile(".github/workflows/ci.yml")
const e2eSeed = readProjectFile("scripts/e2e/seed.ts")
const e2eTeardown = readProjectFile("scripts/e2e/teardown.ts")
const syncAgentSkills = readProjectFile("scripts/sync-agent-skills.sh")

const expectedInstantMedSkills = [
  "instantmed-checkout-payment-review",
  "instantmed-clinical-safety-review",
  "instantmed-doc-drift-repair",
  "instantmed-marketing-compliance-review",
  "instantmed-production-incident-review",
  "instantmed-ui-browser-verification",
]

describe("project docs drift contract", () => {
  it("keeps root assistant docs aligned on hours, gated services, and staff dashboard rules", () => {
    for (const source of [agents, claude]) {
      // 24/7 doctrine (operator, 2026-07-03): the platform operates around the
      // clock and public copy never states a review-hours window.
      expect(source).toContain("The service operates 24/7 (operator decision 2026-07-03)")
      expect(source).toContain("Never hard-block checkout by time of day")
      expect(source).toContain("strictly 18+ for every paid service")
      expect(source).not.toContain("18+ (parental consent for minors)")
      // Women's health launched 2026-06-15 (UTI + new/switch pill); weight loss stays gated.
      expect(source).toContain("Women's health (UTI + new/switch pill, live 2026-06-15)")
      expect(source).toContain("Weight loss (gated future subtype)")
      // Phase 1 of dashboard remaster (2026-05-11) renamed the "Staff cockpit"
      // workflow heading to "Staff dashboard" and introduced `/dashboard` as the
      // canonical staff URL. The unified-shell rule still holds.
      expect(source).toContain("**Staff dashboard:**")
      // Phase 2 of dashboard remaster (2026-05-12): /dashboard is the real
      // surface (not just a canonical URL stub). Doc copy reflects that.
      expect(source).toContain("/dashboard")
      expect(source).toContain("OperatorShell")
      expect(source).toContain("`components/operator/*`")
      expect(source).toContain("`AGENTS.md` + `CLAUDE.md`")
    }
  })

  it("keeps InstantMed workflow skills repo-owned and installable for Codex and Claude", () => {
    const skillRoot = join(root, ".agent-skills")
    const actualSkills = readdirSync(skillRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()

    expect(actualSkills).toEqual(expectedInstantMedSkills)

    for (const source of [agents, claude]) {
      expect(source).toContain("The canonical source lives in `.agent-skills/`")
      expect(source).toContain("/Users/rey/.claude/skills")
      expect(source).toContain("/Users/rey/.agents/skills")
      expect(source).toContain("scripts/sync-agent-skills.sh --check")
      for (const skill of expectedInstantMedSkills) {
        expect(source).toContain(`\`${skill}\``)
      }
    }

    expect(syncAgentSkills).toContain('SOURCE_DIR=".agent-skills"')
    expect(syncAgentSkills).toContain('"$HOME/.agents/skills"')
    expect(syncAgentSkills).toContain('"$HOME/.claude/skills"')

    for (const skill of expectedInstantMedSkills) {
      const skillMarkdown = readProjectFile(`.agent-skills/${skill}/SKILL.md`)
      const openAiConfig = readProjectFile(`.agent-skills/${skill}/agents/openai.yaml`)

      expect(skillMarkdown).toContain(`name: ${skill}`)
      expect(skillMarkdown).toContain("description: InstantMed")
      expect(openAiConfig).toContain("allow_implicit_invocation: true")
    }
  })

  it("keeps product and design docs pointed at one compact operator experience", () => {
    expect(product).toContain("not separate admin and doctor products")
    expect(product).toContain("staff do not scroll through a wall of low-value data")
    expect(design).toContain("unified `OperatorShell` pattern")
    expect(design).toContain("Do not create separate \"admin mode\" and \"doctor mode\" experiences")
    expect(design).toContain("bounded desktop height with internal scroll panes")
    expect(aiOnboarding).toContain("**`components/operator/`**")
    expect(aiOnboarding).toContain("## Top 11 rules of thumb")
  })

  it("keeps the architecture and operator README documenting the active staff component pattern", () => {
    const operatorReadme = readProjectFile("components/operator/README.md")

    expect(architecture).toContain("**Staff cockpit architecture:**")
    expect(architecture).toContain("`OperatorShell`")
    expect(architecture).toContain("`StaffCommandPalette`")
    expect(architecture).toContain("`components/operator/`")
    expect(operatorReadme).toContain("Unified staff cockpit primitives")
    expect(operatorReadme).toContain("Do not reintroduce separate \"switch to doctor mode\" flows")
  })

  it("keeps docs current with the focused operator visual guardrails", () => {
    expect(testing).toContain("e2e/operator.viewport.spec.ts")
    expect(testing).toContain("e2e/operator.visual.spec.ts")
    expect(testing).toContain("Staff cockpit")
  })

  it("lists every doctor API route in the architecture inventory", () => {
    const doctorApiRoot = join(root, "app/api/doctor")
    const endpoints = findRouteFiles(doctorApiRoot)
      .map((file) => relative(doctorApiRoot, file).replace(/\/route\.ts$/, ""))
      .sort()

    expect(endpoints.length).toBeGreaterThan(0)
    for (const endpoint of endpoints) {
      expect(architecture, endpoint).toContain(endpoint)
    }
  })

  it("keeps the architecture directory-index counts tied to the app tree", () => {
    const appRoot = join(root, "app")
    const appFiles = findFiles(appRoot)
    const routeFiles = findRouteInventoryFiles(appRoot)
    const apiRoutes = findRouteFiles(join(root, "app/api"))

    expect(architecture).toContain(`### \`app/\` — ${appFiles.length} files, ${routeFiles.length} route files`)
    expect(architecture).toContain(`| \`app/api/\` | API routes (${apiRoutes.length} route files) |`)
    expect(architecture).toContain("Filesystem route-count drift is guarded by")
  })

  it("documents the medication step as free-text, not a live PBS search (retired #211)", () => {
    // The PBS reference-search stack was removed in #211. While the route is
    // gone, the canonical docs must NOT describe a live patient-facing PBS
    // medication search — that drift is exactly how a future agent reintroduces
    // a retired feature (operator review of #211-#213, 2026-06-28).
    expect(existsSync(join(root, "app/api/medications/search/route.ts"))).toBe(false)

    const clinical = readProjectFile("docs/CLINICAL.md")
    const operations = readProjectFile("docs/OPERATIONS.md")

    // Retired-feature framings must be gone from the brain + clinical/ops docs.
    expect(claude).not.toContain("Patient medication search is PBS reference lookup only")
    expect(agents).not.toContain("Patient medication search is PBS reference lookup only")
    expect(clinical).not.toContain("## Medication Search Rules")
    expect(operations).not.toContain("That search is PBS/AMT-backed")

    // ...and the current free-text truth must be present.
    expect(clinical).toContain("Medication Entry Rules")
    expect(architecture).toContain("medication-step.tsx")
  })

  it("documents one medication per repeat request so dose/history answers stay unambiguous", () => {
    const clinical = readProjectFile("docs/CLINICAL.md")

    expect(clinical).toContain("One repeat-prescription request covers one medication")
    expect(architecture).toContain("active repeat requests accept exactly one medication row")
    expect(claude).toContain("one medication per repeat request")
    expect(agents).toContain("one medication per repeat request")
  })

  it("keeps the retired checkout-step out of active flow docs", () => {
    expect(existsSync(join(root, "components/request/steps/checkout-step.tsx"))).toBe(false)

    for (const source of [architecture, requestReadme, claude, agents]) {
      expect(source).not.toContain("checkout-step.tsx")
    }

    expect(architecture).toContain("review-step.tsx -> unified-checkout.ts")
    expect(requestReadme).toContain("Register its lazy loader in `step-loaders.ts`")
    expect(requestReadme).not.toContain("Import and register it in `step-router.tsx`")
  })

  it("documents individual post-auto-approval medical-certificate review as an InstantMed governance control", () => {
    const clinical = readProjectFile("docs/CLINICAL.md")
    const operations = readProjectFile("docs/OPERATIONS.md")

    expect(clinical).toContain("InstantMed governance control, not a statutory AHPRA requirement")
    expect(clinical).toContain("reviewed with no change needed")
    expect(clinical).toContain("revoked and returned to manual review")
    expect(clinical).toContain("Bulk acknowledgement is prohibited")
    expect(architecture).toContain("getPendingBatchReviews")
    expect(architecture).toContain("med_cert_batch_review_overdue")
    expect(operations).toContain("Post-auto-approval doctor review")
    expect(operations).toContain("aggregate-only alert payload")
  })

  it("keeps shared E2E fixture docs aligned with preserved canonical fixtures", () => {
    expect(testing).toContain("canonical auth/profile/intake fixtures use deterministic shared IDs")
    expect(testing).toContain("E2E_TEARDOWN_RESET_FIXTURES=1")
    expect(ciWorkflow).toContain("instantmed-shared-e2e-fixtures")
    expect(e2eTeardown).not.toContain("Deletes all seeded test data by e2e_run_id")
    expect(e2eSeed).not.toContain("All rows tagged with e2e_run_id for teardown")
  })

  it("keeps architecture AI model docs aligned with the provider default", () => {
    const defaultClinicalModel = aiProvider.match(/model:\s*process\.env\.ANTHROPIC_CLINICAL_MODEL\s*\|\|\s*process\.env\.CLAUDE_MODEL\s*\|\|\s*['"]([^'"]+)['"]/)?.[1]

    expect(defaultClinicalModel).toBeTruthy()
    expect(architecture).toContain(`| \`clinical\` | \`${defaultClinicalModel}\``)
    expect(architecture).toContain(`| clinical | ${defaultClinicalModel} |`)
  })

  it("keeps business canon split across one durable strategy, one revenue model, and one active queue", () => {
    const businessPlan = readProjectFile("docs/BUSINESS_PLAN.md")
    const clinical = readProjectFile("docs/CLINICAL.md")
    const fileMap = readProjectFile("docs/bookkeeping/file-map.md")
    const revenueModel = readProjectFile("docs/REVENUE_MODEL.md")
    const roadmap = readProjectFile("docs/ROADMAP.md")

    expect(businessPlan).toContain("**Authority:** durable business strategy")
    expect(businessPlan).toContain("does not own the current operating phase")
    expect(revenueModel).toContain("**Authority:** revenue milestones")
    expect(revenueModel).toContain("$2,000/month")
    expect(revenueModel).toContain("$5,000/month")
    expect(revenueModel).toContain("$10,000/month")
    expect(roadmap).toContain("**Authority:** the sole source of truth")
    expect(roadmap).toContain("Controlled demand validation")
    expect(roadmap).toContain("Last refreshed:")
    expect(roadmap).not.toContain("Last 90 days shipped")
    expect(roadmap).toContain("Partially complete")
    expect(roadmap).toContain("Receiver implemented; Gmail count source and schedule pending")

    expect(clinical).not.toContain("No automated clinical decisions are made")
    expect(clinical).toContain("Prescribing decisions are always clinician-made")
    expect(clinical).toContain("doctor-owned medical-certificate protocol")

    expect(fileMap).toContain("implementation records (non-authoritative)")
    expect(fileMap).not.toContain("docs/plans/ — active")

    const rootPlanFiles = readdirSync(join(root, "docs/plans"), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
    for (const plan of rootPlanFiles) {
      const planHeader = readProjectFile(`docs/plans/${plan}`).split("\n").slice(0, 10).join("\n")
      expect(planHeader, plan).toContain("**Authority:** Reference only.")
      expect(planHeader, plan).toContain("docs/ROADMAP.md")
    }

    for (const plan of [
      "docs/plans/2026-05-23-archived-plan-followups.md",
      "docs/plans/2026-06-10-organic-geo-beat-nextclinic-plan.md",
      "docs/superpowers/plans/2026-06-06-customer-growth-phased-plan.md",
    ]) {
      const source = readProjectFile(plan)
      expect(source).toContain("Reference only")
      expect(source).toContain("docs/ROADMAP.md")
    }

    for (const source of [agents, claude]) {
      expect(source).toContain("`lib/constants/index.ts`")
      expect(source).not.toContain("`lib/constants.ts`")
    }

    expect(existsSync(join(root, "docs/plans/2026-07-12-cleanup-and-scale-roadmap.md"))).toBe(false)
    expect(existsSync(join(root, "docs/plans/archive/2026-07-12-cleanup-and-scale-roadmap.md"))).toBe(true)
  })

  it("keeps DOCTOR_ONBOARDING.md pinned to the 7 capability flags + AHPRA format + Parchment env floor", () => {
    const onboarding = readProjectFile("docs/DOCTOR_ONBOARDING.md")
    expect(onboarding).toContain("review_med_certs")
    expect(onboarding).toContain("review_repeat_rx")
    expect(onboarding).toContain("review_consults")
    expect(onboarding).toContain("review_ed")
    expect(onboarding).toContain("review_hair_loss")
    expect(onboarding).toContain("prescribe_s4")
    expect(onboarding).toContain("prescribe_s8")
    expect(onboarding).toContain("/^[A-Z]{3}\\d{10}$/")
    expect(onboarding).toContain("PARCHMENT_API_URL")
    expect(onboarding).toContain("PARCHMENT_ORGANIZATION_ID")
    expect(onboarding).toContain("PARCHMENT_WEBHOOK_SECRET")
  })
})
