import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

interface StatusCheck {
  context: string
  integration_id: number
}

interface RulesetRule {
  type: string
  parameters?: {
    required_approving_review_count?: number
    required_status_checks?: StatusCheck[]
    strict_required_status_checks_policy?: boolean
  }
}

interface MainBranchRuleset {
  name: string
  target: string
  enforcement: string
  bypass_actors: Array<{
    actor_id: number
    actor_type: string
    bypass_mode: string
  }>
  conditions: {
    ref_name: {
      include: string[]
      exclude: string[]
    }
  }
  rules: RulesetRule[]
}

const rulesetPath = join(process.cwd(), ".github/rulesets/main-pr-first.json")

function readRuleset(): MainBranchRuleset {
  return JSON.parse(readFileSync(rulesetPath, "utf8")) as MainBranchRuleset
}

function findRule(ruleset: MainBranchRuleset, type: string): RulesetRule | undefined {
  return ruleset.rules.find((rule) => rule.type === type)
}

describe("main branch ruleset contract", () => {
  it("actively targets only the repository default branch", () => {
    const ruleset = readRuleset()

    expect(ruleset.name).toBe("main-pr-first")
    expect(ruleset.target).toBe("branch")
    expect(ruleset.enforcement).toBe("active")
    expect(ruleset.conditions.ref_name).toEqual({
      include: ["~DEFAULT_BRANCH"],
      exclude: [],
    })
  })

  it("gives only the repository owner a pull-request-only bypass", () => {
    const ruleset = readRuleset()

    expect(ruleset.bypass_actors).toEqual([
      {
        actor_id: 245520603,
        actor_type: "User",
        bypass_mode: "pull_request",
      },
    ])
  })

  it("requires a pull request without imposing an approval bottleneck", () => {
    const pullRequestRule = findRule(readRuleset(), "pull_request")

    expect(pullRequestRule).toBeDefined()
    expect(pullRequestRule?.parameters?.required_approving_review_count).toBe(0)
  })

  it("requires strict GitHub Actions build and e2e checks", () => {
    const statusRule = findRule(readRuleset(), "required_status_checks")
    const checks = [...(statusRule?.parameters?.required_status_checks ?? [])].sort((a, b) =>
      a.context.localeCompare(b.context),
    )

    expect(statusRule).toBeDefined()
    expect(statusRule?.parameters?.strict_required_status_checks_policy).toBe(true)
    expect(checks).toEqual([
      { context: "build", integration_id: 15368 },
      { context: "e2e", integration_id: 15368 },
    ])
  })

  it("blocks branch deletion and non-fast-forward history rewrites", () => {
    const ruleTypes = readRuleset().rules.map((rule) => rule.type)

    expect(ruleTypes).toEqual(expect.arrayContaining(["deletion", "non_fast_forward"]))
  })
})
