const DEFAULT_MAILPIT_ORIGIN = "http://127.0.0.1:55324"
const DEFAULT_TIMEOUT_MS = 20_000
const DEFAULT_RETRY_DELAY_MS = 250
const MAX_ATTEMPTS = 80

export interface MailpitReadOptions {
  fetchFn?: typeof fetch
  mailpitOrigin?: string
  retryDelayMs?: number
  timeoutMs?: number
}

function assertRunUniqueRecipient(recipient: string): void {
  if (!/^stripe-run-[a-z0-9-]+@example\.test$/i.test(recipient)) {
    throw new Error("Mailpit lookup requires a run-unique fabricated recipient")
  }
}

function localMailpitOrigin(raw: string): URL {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error("Mailpit must use the runner-owned local endpoint")
  }
  if (
    parsed.protocol !== "http:" ||
    !["127.0.0.1", "localhost"].includes(parsed.hostname.toLowerCase()) ||
    parsed.port !== "55324" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("Mailpit must use the runner-owned local endpoint")
  }
  return parsed
}

export function buildMailpitLatestMessageUrl(
  recipient: string,
  mailpitOrigin = process.env.HOSTED_STRIPE_E2E_MAILPIT_URL || DEFAULT_MAILPIT_ORIGIN,
): URL {
  assertRunUniqueRecipient(recipient)
  const url = new URL("/view/latest.html", localMailpitOrigin(mailpitOrigin))
  url.searchParams.set("query", `to:"${recipient}"`)
  return url
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#x3D;", "=")
    .replaceAll("&#61;", "=")
    .replaceAll("&quot;", '"')
}

function extractSafeLocalSupabaseLink(html: string): string | null {
  const hrefs = [...html.matchAll(/href=(?:"([^"]+)"|'([^']+)')/gi)]
    .map((match) => decodeHtmlAttribute(match[1] ?? match[2] ?? ""))

  for (const href of hrefs) {
    let url: URL
    try {
      url = new URL(href)
    } catch {
      continue
    }
    if (
      url.protocol !== "http:" ||
      !["127.0.0.1", "localhost"].includes(url.hostname.toLowerCase()) ||
      url.port !== "55321" ||
      url.pathname !== "/auth/v1/verify" ||
      !url.searchParams.get("token") ||
      url.searchParams.get("type") !== "magiclink"
    ) {
      continue
    }

    const redirect = url.searchParams.get("redirect_to")
    if (redirect) {
      try {
        const redirectUrl = new URL(redirect)
        if (
          redirectUrl.protocol !== "http:" ||
          !["127.0.0.1", "localhost"].includes(redirectUrl.hostname.toLowerCase()) ||
          redirectUrl.port !== "3060" ||
          redirectUrl.pathname !== "/auth/callback"
        ) {
          continue
        }
      } catch {
        continue
      }
    }
    return url.toString()
  }
  return null
}

function pause(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Reads only the mailbox address allocated to this run. Neither the recipient,
 * email body, nor the returned one-time URL is logged or included in errors.
 */
export async function readLatestMailpitLink(
  recipient: string,
  options: MailpitReadOptions = {},
): Promise<string> {
  assertRunUniqueRecipient(recipient)
  const fetchFn = options.fetchFn ?? fetch
  const timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS)
  const deadline = Date.now() + timeoutMs
  let attempts = 0

  while (Date.now() <= deadline && attempts < MAX_ATTEMPTS) {
    attempts += 1
    let response: Response
    try {
      response = await fetchFn(buildMailpitLatestMessageUrl(
        recipient,
        options.mailpitOrigin,
      ), {
        headers: { Accept: "text/html" },
        method: "GET",
      })
    } catch {
      if (Date.now() > deadline || attempts >= MAX_ATTEMPTS) break
      await pause(retryDelayMs)
      continue
    }

    if (response.status === 404) {
      if (Date.now() > deadline || attempts >= MAX_ATTEMPTS) break
      await pause(retryDelayMs)
      continue
    }
    if (!response.ok) {
      throw new Error("Mailpit lookup failed; response body suppressed")
    }

    const link = extractSafeLocalSupabaseLink(await response.text())
    if (link) return link
    throw new Error("Mailpit message did not contain a safe local Supabase magic link")
  }

  throw new Error("Mailpit did not receive the run-scoped sign-in email before timeout")
}
