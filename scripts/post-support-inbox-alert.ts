import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

import { z } from "zod"

import { hydrateLocalEnv } from "./video-review/local-env"

export const SUPPORT_INBOX_ALERT_ENDPOINT =
  "https://instantmed.com.au/api/internal/support-inbox-alert"
export const SUPPORT_INBOX_ALERT_POST_TIMEOUT_MS = 12_000

const supportInboxAlertResponseSchema = z.union([
  z.object({
    skipped: z.enum(["disabled", "locked"]),
    success: z.literal(true),
  }).strict(),
  z.object({
    outcome: z.literal("zero"),
    success: z.literal(true),
    unreadCount: z.literal(0),
  }).strict(),
  z.object({
    outcome: z.enum(["delivered", "suppressed"]),
    success: z.literal(true),
    unreadCount: z.number().int().min(1).max(10_000),
  }).strict(),
])

export type SupportInboxAlertPostOutcome =
  | "delivered"
  | "disabled"
  | "locked"
  | "suppressed"
  | "zero"

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export function parseSupportInboxUnreadCount(args: string[]): number {
  if (args.length !== 2 || args[0] !== "--count" || !/^\d+$/.test(args[1] ?? "")) {
    throw new Error("Usage: pnpm support:inbox-alert --count <integer 0..10000>")
  }

  const unreadCount = Number(args[1])
  if (!Number.isSafeInteger(unreadCount) || unreadCount < 0 || unreadCount > 10_000) {
    throw new Error("Unread count must be an integer from 0 through 10000")
  }
  return unreadCount
}

export async function postSupportInboxUnreadCount(input: {
  cronSecret: string
  fetchImpl?: FetchLike
  unreadCount: number
}): Promise<{ outcome: SupportInboxAlertPostOutcome; unreadCount: number }> {
  const { cronSecret, fetchImpl = fetch, unreadCount } = input
  if (!cronSecret.trim()) throw new Error("CRON_SECRET is not configured in the local environment")
  if (!Number.isSafeInteger(unreadCount) || unreadCount < 0 || unreadCount > 10_000) {
    throw new Error("Unread count must be an integer from 0 through 10000")
  }

  const response = await fetchImpl(SUPPORT_INBOX_ALERT_ENDPOINT, {
    body: JSON.stringify({ unreadCount }),
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(SUPPORT_INBOX_ALERT_POST_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`Support inbox alert endpoint returned HTTP ${response.status}`)
  }

  const payload = supportInboxAlertResponseSchema.safeParse(
    await response.json().catch(() => null),
  )
  if (!payload.success) {
    throw new Error("Support inbox alert endpoint returned an invalid response")
  }

  if ("skipped" in payload.data) {
    if (payload.data.skipped === "locked" && unreadCount === 0) {
      throw new Error("Support inbox alert endpoint returned an invalid response")
    }
    return { outcome: payload.data.skipped, unreadCount }
  }
  if (payload.data.unreadCount !== unreadCount) {
    throw new Error("Support inbox alert endpoint returned an invalid response")
  }

  return { outcome: payload.data.outcome, unreadCount }
}

async function main(): Promise<void> {
  hydrateLocalEnv(["CRON_SECRET"])
  const unreadCount = parseSupportInboxUnreadCount(process.argv.slice(2))
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) throw new Error("CRON_SECRET is not configured in the local environment")

  const result = await postSupportInboxUnreadCount({ cronSecret, unreadCount })
  process.stdout.write(`Support inbox count posted: ${result.unreadCount} unread (${result.outcome})\n`)
}

const entryPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null
if (entryPath === import.meta.url) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "Support inbox alert failed"
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
