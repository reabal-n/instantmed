#!/usr/bin/env npx tsx

import {
  applyProposal,
  validateProposal,
  verifyProposal,
} from "@/lib/ads-agent/mutations"
import { buildAdsAgentSnapshot } from "@/lib/ads-agent/snapshot"
import {
  getAdsProposalByKey,
  recordCodexProposalDecision,
} from "@/lib/ads-agent/proposals"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

type Command =
  | "snapshot"
  | "propose"
  | "show"
  | "validate"
  | "approve"
  | "reject"
  | "apply"
  | "verify"

const USAGE = [
  "pnpm ads:agent -- snapshot",
  "pnpm ads:agent -- propose --run=<run-id>",
  "pnpm ads:agent -- show --proposal=<proposal-key>",
  "pnpm ads:agent -- validate --proposal=<proposal-key>",
  "pnpm ads:agent -- approve --proposal=<proposal-key> --reference=codex-task:<task-id>",
  "pnpm ads:agent -- reject --proposal=<proposal-key> --reference=codex-task:<task-id>",
  "pnpm ads:agent -- apply --proposal=<proposal-key>",
  "pnpm ads:agent -- verify --proposal=<proposal-key>",
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

  if (command === "propose") {
    await showRun(requiredOption("run"))
    process.stdout.write(
      "Run evidence loaded. Create only one exact restricted operation packet.\n",
    )
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
    "propose",
    "show",
    "validate",
    "approve",
    "reject",
    "apply",
    "verify",
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
