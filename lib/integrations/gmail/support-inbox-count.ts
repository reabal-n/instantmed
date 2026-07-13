import "server-only"

export const SUPPORT_INBOX_GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token"
export const SUPPORT_INBOX_GMAIL_LABEL_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX"

const SUPPORT_INBOX_GMAIL_TIMEOUT_MS = 12_000
const MAX_SUPPORT_INBOX_UNREAD_THREADS = 10_000

type SupportInboxFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>

interface ReadSupportInboxUnreadThreadCountInput {
  clientId?: string
  clientSecret?: string
  fetch?: SupportInboxFetch
  quotaProjectId?: string
  refreshToken?: string
}

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed || null
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  const value = await response.json().catch(() => null)
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

/**
 * Reads only Gmail's aggregate INBOX label counters.
 *
 * This deliberately never calls message or thread endpoints. Gmail remains the
 * source of truth and no sender, subject, snippet, body, attachment, message ID,
 * or thread ID enters InstantMed.
 */
export async function readSupportInboxUnreadThreadCount(
  input: ReadSupportInboxUnreadThreadCountInput = {},
): Promise<number> {
  const clientId = clean(input.clientId ?? process.env.GMAIL_SUPPORT_CLIENT_ID)
  const clientSecret = clean(input.clientSecret ?? process.env.GMAIL_SUPPORT_CLIENT_SECRET)
  const refreshToken = clean(input.refreshToken ?? process.env.GMAIL_SUPPORT_REFRESH_TOKEN)
  const quotaProjectId = clean(
    input.quotaProjectId ?? process.env.GMAIL_SUPPORT_QUOTA_PROJECT_ID,
  )
  const fetchImpl = input.fetch ?? (globalThis.fetch as SupportInboxFetch)

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Support inbox Gmail credentials are not configured")
  }

  const tokenResponse = await fetchImpl(SUPPORT_INBOX_GMAIL_TOKEN_URL, {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
    signal: AbortSignal.timeout(SUPPORT_INBOX_GMAIL_TIMEOUT_MS),
  })

  if (!tokenResponse.ok) {
    throw new Error(`Support inbox Gmail token request failed (${tokenResponse.status})`)
  }

  const tokenPayload = await readJson(tokenResponse)
  const accessToken = typeof tokenPayload?.access_token === "string"
    ? clean(tokenPayload.access_token)
    : null
  if (!accessToken) {
    throw new Error("Support inbox Gmail token response was invalid")
  }

  const labelHeaders: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
  if (quotaProjectId) labelHeaders["X-Goog-User-Project"] = quotaProjectId

  const labelResponse = await fetchImpl(SUPPORT_INBOX_GMAIL_LABEL_URL, {
    headers: labelHeaders,
    method: "GET",
    signal: AbortSignal.timeout(SUPPORT_INBOX_GMAIL_TIMEOUT_MS),
  })

  if (!labelResponse.ok) {
    throw new Error(`Support inbox Gmail label request failed (${labelResponse.status})`)
  }

  const labelPayload = await readJson(labelResponse)
  const unreadCount = labelPayload?.threadsUnread
  if (
    !Number.isInteger(unreadCount) ||
    typeof unreadCount !== "number" ||
    unreadCount < 0 ||
    unreadCount > MAX_SUPPORT_INBOX_UNREAD_THREADS
  ) {
    throw new Error("Support inbox Gmail label response was invalid")
  }

  return unreadCount
}
