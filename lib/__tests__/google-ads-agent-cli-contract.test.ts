import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

describe("Google Ads Agent CLI contract", () => {
  const packageJson = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf8"),
  )
  const source = readFileSync(
    join(process.cwd(), "scripts/google-ads-agent.ts"),
    "utf8",
  )
  const telegramRouteSource = readFileSync(
    join(process.cwd(), "app/api/webhooks/telegram/route.ts"),
    "utf8",
  )

  it("exposes every governed command through the existing tsx runtime", () => {
    expect(packageJson.scripts["ads:agent"]).toBe(
      "NODE_OPTIONS='--conditions=react-server' tsx --env-file-if-exists=.env.local scripts/google-ads-agent.ts",
    )
    expect(packageJson.scripts["ads:agent"]).toContain(
      "--conditions=react-server",
    )
    for (const command of [
      "snapshot",
      "propose",
      "show",
      "validate",
      "approve",
      "reject",
      "apply",
      "verify",
      "experiment:create",
      "experiment:check",
      "experiment:stop",
      "experiment:evaluate",
    ]) {
      expect(source).toContain(`"${command}"`)
    }
  })

  it("keeps apply behind the mutation kill switch and exact proposal input", () => {
    expect(source).toContain("GOOGLE_ADS_AGENT_MUTATIONS_ENABLED")
    expect(source).toContain("applyProposal(proposalKey)")
    expect(source).toContain("validateProposal(proposalKey)")
    expect(source).toContain("verifyProposal(proposalKey)")
    expect(source).toContain("--proposal")
    expect(source).toContain("--reference")
    expect(source).not.toContain("mutateGoogleAds({ operations: JSON.parse")
    expect(source).not.toContain("gateway is not available yet")
  })

  it("keeps experiment launch and stop tied to exact proposal packets", () => {
    expect(source).toContain(
      "createExperimentFromProposal(requiredOption(\"proposal\"))",
    )
    expect(source).toContain(
      "stopExperiment(requiredOption(\"experiment\"))",
    )
    expect(source).toContain(
      "experiment:create --proposal=<proposal-key>",
    )
    expect(source).toContain(
      "experiment:stop --experiment=<experiment-key>",
    )
  })

  it("never prints or accepts secret values", () => {
    expect(source).not.toContain("TELEGRAM_ADS_APPROVAL_SIGNING_SECRET")
    expect(source).not.toContain("GOOGLE_ADS_REFRESH_TOKEN")
    expect(source).not.toContain("OPENAI_API_KEY")
  })

  it("acknowledges an exact Telegram button before guarded apply", () => {
    const adsBranch = telegramRouteSource.indexOf(
      'callbackQuery.data.startsWith("ads:")',
    )
    const answer = telegramRouteSource.indexOf(
      "await answerCallbackQuery",
      adsBranch,
    )
    const reject = telegramRouteSource.indexOf(
      'decision.decision === "reject"',
      adsBranch,
    )
    const apply = telegramRouteSource.indexOf(
      "await applyProposal",
      adsBranch,
    )

    expect(adsBranch).toBeGreaterThan(-1)
    expect(answer).toBeGreaterThan(adsBranch)
    expect(answer).toBeLessThan(reject)
    expect(reject).toBeLessThan(apply)
  })
})
