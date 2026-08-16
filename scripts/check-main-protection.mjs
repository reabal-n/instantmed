#!/usr/bin/env node

import { spawnSync } from "node:child_process"

const EXPECTED_REPOSITORY = "reabal-n/instantmed"
const EXPECTED_RULESET = "main-pr-first"
const EXPECTED_RULE_TYPES = [
  "deletion",
  "non_fast_forward",
  "pull_request",
  "required_status_checks",
]
const EXPECTED_STATUS_CHECKS = [
  { context: "build", integration_id: 15368 },
  { context: "e2e", integration_id: 15368 },
]

function runGh(args, { allowFailure = false, includeHeaders = false } = {}) {
  const result = spawnSync(
    "gh",
    ["api", ...(includeHeaders ? ["--include"] : []), ...args],
    { encoding: "utf8" },
  )
  if (!allowFailure && result.status !== 0) {
    const detail = (result.stderr || result.stdout || "unknown GitHub error").trim()
    throw new Error(`GitHub API request failed: ${detail}`)
  }
  return result
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function sortedStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right))
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function readRule(ruleset, type) {
  const matches = ruleset.rules.filter((rule) => rule.type === type)
  assert(matches.length === 1, `Expected exactly one ${type} rule`)
  return matches[0]
}

function verifyRuleset(ruleset) {
  assert(ruleset.name === EXPECTED_RULESET, "Ruleset name drifted")
  assert(ruleset.target === "branch", "Ruleset target must be branch")
  assert(ruleset.enforcement === "active", "Ruleset enforcement must be active")
  assert(
    sameJson(ruleset.conditions?.ref_name?.include, ["~DEFAULT_BRANCH"]) &&
      sameJson(ruleset.conditions?.ref_name?.exclude, []),
    "Ruleset must target only the default branch",
  )

  assert(
    ruleset.bypass_actors?.length === 1 &&
      ruleset.bypass_actors[0]?.actor_id === 245520603 &&
      ruleset.bypass_actors[0]?.actor_type === "User" &&
      ruleset.bypass_actors[0]?.bypass_mode === "pull_request",
    "Owner bypass must be PR-only; direct-push bypass is forbidden",
  )

  const ruleTypes = sortedStrings(ruleset.rules.map((rule) => rule.type))
  assert(
    sameJson(ruleTypes, sortedStrings(EXPECTED_RULE_TYPES)),
    "Ruleset must contain exactly deletion, non-fast-forward, PR, and status rules",
  )

  readRule(ruleset, "deletion")
  readRule(ruleset, "non_fast_forward")

  const pullRequest = readRule(ruleset, "pull_request").parameters
  assert(
    sameJson(
      sortedStrings(pullRequest.allowed_merge_methods ?? []),
      sortedStrings(["merge", "squash", "rebase"]),
    ),
    "Allowed merge methods drifted",
  )
  for (const field of [
    "dismiss_stale_reviews_on_push",
    "require_code_owner_review",
    "require_last_push_approval",
    "required_review_thread_resolution",
  ]) {
    assert(pullRequest[field] === false, `${field} must remain false for solo operation`)
  }
  assert(
    pullRequest.required_approving_review_count === 0,
    "Solo operation requires a PR but zero approving reviews",
  )

  const status = readRule(ruleset, "required_status_checks").parameters
  assert(
    status.strict_required_status_checks_policy === true,
    "Required checks must use strict up-to-date mode",
  )
  assert(
    status.do_not_enforce_on_create === false,
    "Required checks must apply when the branch is created",
  )
  const checks = [...(status.required_status_checks ?? [])]
    .map(({ context, integration_id }) => ({ context, integration_id }))
    .sort((left, right) => left.context.localeCompare(right.context))
  assert(
    sameJson(checks, EXPECTED_STATUS_CHECKS),
    "Required checks must be exactly GitHub Actions build and e2e",
  )
}

function main() {
  const repository = spawnSync(
    "gh",
    ["repo", "view", "--json", "nameWithOwner,defaultBranchRef"],
    { encoding: "utf8" },
  )
  if (repository.status !== 0) {
    throw new Error(`Could not resolve GitHub repository: ${repository.stderr.trim()}`)
  }
  const repositoryDetails = JSON.parse(repository.stdout)
  assert(
    repositoryDetails.nameWithOwner === EXPECTED_REPOSITORY,
    `Run this checker from ${EXPECTED_REPOSITORY}`,
  )
  assert(
    repositoryDetails.defaultBranchRef?.name === "main",
    "Repository default branch must remain main",
  )

  const list = JSON.parse(
    runGh([`repos/${EXPECTED_REPOSITORY}/rulesets`]).stdout,
  )
  const matches = list.filter((ruleset) => ruleset.name === EXPECTED_RULESET)
  assert(matches.length === 1, `Expected exactly one live ${EXPECTED_RULESET} ruleset`)

  const ruleset = JSON.parse(
    runGh([`repos/${EXPECTED_REPOSITORY}/rulesets/${matches[0].id}`]).stdout,
  )
  verifyRuleset(ruleset)

  const classic = runGh(
    [`repos/${EXPECTED_REPOSITORY}/branches/main/protection`],
    { allowFailure: true, includeHeaders: true },
  )
  const classicAbsent = classic.status !== 0 &&
    /HTTP\/\S+ 404 Not Found/.test(`${classic.stdout}\n${classic.stderr}`)
  if (process.env.ALLOW_CLASSIC_PROTECTION === "1") {
    assert(
      classic.status === 0 || classicAbsent,
      "Could not verify classic branch-protection state",
    )
  } else {
    assert(
      classicAbsent,
      "Classic branch protection still exists; retire it after the active ruleset is verified",
    )
  }

  process.stdout.write(
    `Main protection matches ${EXPECTED_RULESET}: PR-only, strict build + e2e, no direct push.\n`,
  )
}

try {
  main()
} catch (error) {
  process.stderr.write(
    `Main protection check failed: ${error instanceof Error ? error.message : String(error)}\n`,
  )
  process.exit(1)
}
