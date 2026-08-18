#!/usr/bin/env npx tsx

import {
  getAdsAccountState,
  hashGoogleAdsAccountState,
} from "@/lib/ads-agent/account-state"
import {
  checkExperiment,
  createExperimentFromProposal,
  evaluateExperiment,
  stopExperiment,
} from "@/lib/ads-agent/experiments"
import {
  applyProposal,
  reconcileProposal,
  validateProposal,
  verifyProposal,
} from "@/lib/ads-agent/mutations"
import { getGoogleAdsDeepAudit } from "@/lib/ads-agent/deep-audit"
import { buildAdsAgentSnapshot } from "@/lib/ads-agent/snapshot"
import {
  getAdsProposalByKey,
  createAdsProposalDraft,
  recordCodexProposalDecision,
} from "@/lib/ads-agent/proposals"
import { readAdsProposalDraftPacket } from "@/lib/ads-agent/proposal-operator"
import { sendAdsProposalForTelegramApproval } from "@/lib/ads-agent/telegram-approval"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

type Command =
  | "snapshot"
  | "deep-audit"
  | "propose"
  | "proposal:draft"
  | "proposal:send"
  | "show"
  | "validate"
  | "approve"
  | "reject"
  | "apply"
  | "reconcile"
  | "verify"
  | "experiment:create"
  | "experiment:check"
  | "experiment:stop"
  | "experiment:evaluate"

const USAGE = [
  "pnpm ads:agent snapshot",
  "pnpm ads:agent deep-audit --days=30",
  "pnpm ads:agent propose --run=<run-id>",
  "pnpm ads:agent proposal:draft --run=<run-id> --packet=<json-file>",
  "pnpm ads:agent proposal:send --proposal=<proposal-key>",
  "pnpm ads:agent show --proposal=<proposal-key>",
  "pnpm ads:agent validate --proposal=<proposal-key>",
  "pnpm ads:agent approve --proposal=<proposal-key> --reference=codex-task:<task-id>",
  "pnpm ads:agent reject --proposal=<proposal-key> --reference=codex-task:<task-id>",
  "pnpm ads:agent apply --proposal=<proposal-key>",
  "pnpm ads:agent reconcile --proposal=<proposal-key>",
  "pnpm ads:agent verify --proposal=<proposal-key>",
  "pnpm ads:agent experiment:create --proposal=<proposal-key>",
  "pnpm ads:agent experiment:check --experiment=<experiment-key>",
  "pnpm ads:agent experiment:stop --experiment=<experiment-key>",
  "pnpm ads:agent experiment:evaluate --experiment=<experiment-key>",
].join("\n")

function option(name: string): string | null {
  const prefix = `--${name}=`
  return process.argv
    .slice(3)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length) ?? null
}

function requiredOption(name: string): string {
  const value = option(name)
  if (!value) throw new Error(`Missing --${name}`)
  return value
}

function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

async function showRun(runId: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const result = await supabase
    .from("google_ads_agent_runs")
    .select(
      "id, report_date, status, tracking_state, snapshot, recommendation, started_at, completed_at, delivered_at, error_code",
    )
    .eq("id", runId)
    .maybeSingle()
  if (result.error) {
    throw new Error(
      `Ads Agent run read failed: ${result.error.code || "unknown"}`,
    )
  }
  if (!result.data) throw new Error("Ads Agent run not found")
  writeJson(result.data)
}

async function run(command: Command): Promise<void> {
  if (command === "snapshot") {
    const supabase = createServiceRoleClient()
    writeJson(await buildAdsAgentSnapshot({ supabase }))
    return
  }

  if (command === "deep-audit") {
    const rawDays = option("days")
    const days = rawDays == null ? 30 : Number(rawDays)
    if (!Number.isFinite(days)) throw new Error("Invalid --days")
    writeJson(await getGoogleAdsDeepAudit({ days }))
    return
  }

  if (command === "propose") {
    await showRun(requiredOption("run"))
    process.stdout.write(
      "Run evidence loaded. Write one exact restricted JSON packet, then use proposal:draft.\n",
    )
    return
  }

  if (command === "proposal:draft") {
    const runId = requiredOption("run")
    const packet = readAdsProposalDraftPacket(requiredOption("packet"))
    const supabase = createServiceRoleClient()
    const accountState = await getAdsAccountState()
    writeJson(await createAdsProposalDraft({
      ...packet,
      baselineHash: hashGoogleAdsAccountState(accountState),
      runId,
      supabase,
    }))
    return
  }

  if (command === "proposal:send") {
    const proposalKey = requiredOption("proposal")
    const supabase = createServiceRoleClient()
    const proposal = await getAdsProposalByKey(supabase, proposalKey)
    if (!proposal) throw new Error("Ads proposal not found")
    writeJson(await sendAdsProposalForTelegramApproval({
      proposal,
      supabase,
    }))
    return
  }

  if (command === "experiment:create") {
    writeJson(await createExperimentFromProposal(requiredOption("proposal")))
    return
  }
  if (command === "experiment:check") {
    writeJson(await checkExperiment(requiredOption("experiment")))
    return
  }
  if (command === "experiment:stop") {
    writeJson(await stopExperiment(requiredOption("experiment")))
    return
  }
  if (command === "experiment:evaluate") {
    writeJson(await evaluateExperiment(requiredOption("experiment")))
    return
  }

  const proposalKey = requiredOption("proposal")
  const supabase = createServiceRoleClient()

  if (command === "show") {
    const proposal = await getAdsProposalByKey(supabase, proposalKey)
    if (!proposal) throw new Error("Ads proposal not found")
    writeJson(proposal)
    return
  }

  if (command === "approve" || command === "reject") {
    const result = await recordCodexProposalDecision({
      decision: command,
      proposalKey,
      reference: requiredOption("reference"),
      supabase,
    })
    writeJson({
      consumed: result.consumed,
      decision: command,
      proposalKey,
    })
    return
  }

  if (command === "apply") {
    if (process.env.GOOGLE_ADS_AGENT_MUTATIONS_ENABLED !== "true") {
      throw new Error("Ads Agent mutations are disabled")
    }
    writeJson(await applyProposal(proposalKey))
    return
  }

  if (command === "validate") {
    const receipt = await validateProposal(proposalKey)
    writeJson(receipt)
    if (!receipt.ok) process.exitCode = 1
    return
  }
  if (command === "reconcile") {
    const receipt = await reconcileProposal(proposalKey)
    writeJson(receipt)
    if (receipt.outcome !== "verified") process.exitCode = 1
    return
  }
  if (command === "verify") {
    const receipt = await verifyProposal(proposalKey)
    writeJson(receipt)
    if (receipt.outcome !== "verified") process.exitCode = 1
  }
}

async function main(): Promise<void> {
  const command = process.argv[2] as Command | undefined
  const commands: Command[] = [
    "snapshot",
    "deep-audit",
    "propose",
    "proposal:draft",
    "proposal:send",
    "show",
    "validate",
    "approve",
    "reject",
    "apply",
    "reconcile",
    "verify",
    "experiment:create",
    "experiment:check",
    "experiment:stop",
    "experiment:evaluate",
  ]
  if (!command || !commands.includes(command)) {
    throw new Error(USAGE)
  }
  await run(command)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown Ads Agent error"
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
