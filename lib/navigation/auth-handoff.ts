export const AUTH_POST_SIGNIN_HREF = "/auth/post-signin" as const
export const AUTH_HANDOFF_EVENT = "instantmed:auth-handoff" as const
export const AUTH_HANDOFF_REFRESH_SUPPRESSION_MS = 5000
// sessionStorage key that persists the suppression across a full-page
// navigation. The in-memory AUTH_HANDOFF_EVENT guard is destroyed when the
// browser navigates away; this flag survives so the new page's
// SupabaseAuthProvider can suppress the router.refresh() that fires on
// TOKEN_REFRESHED/SIGNED_IN and would otherwise race with React hydration,
// producing "Application error: a client-side exception has occurred".
export const AUTH_HANDOFF_STORAGE_KEY = "instantmed:auth-handoff-ts" as const
const SIGN_IN_EMAIL_HANDOFF_STORAGE_KEY = "instantmed:sign-in-email-handoff" as const
const MAGIC_LINK_EMAIL_RECOVERY_STORAGE_KEY = "instantmed:last-magic-link-email" as const
const SIGN_IN_EMAIL_HANDOFF_TTL_MS = 10 * 60 * 1000
const MAGIC_LINK_EMAIL_RECOVERY_TTL_MS = 30 * 60 * 1000

type EmailHandoffStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">

type StoredEmailHandoff = {
  email: string
  expiresAt: number
  redirect: string
  version: 1
}

function normalizeHandoffEmail(value: string): string | null {
  const email = value.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null
}

function rememberEmailHandoff({
  email,
  expiresAt,
  key,
  redirect,
  storage,
}: {
  email: string
  expiresAt: number
  key: string
  redirect: string
  storage: EmailHandoffStorage
}): boolean {
  const normalizedEmail = normalizeHandoffEmail(email)
  if (!normalizedEmail) return false

  try {
    const payload: StoredEmailHandoff = {
      email: normalizedEmail,
      expiresAt,
      redirect,
      version: 1,
    }
    storage.setItem(key, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

function consumeEmailHandoff({
  key,
  now,
  redirect,
  storage,
}: {
  key: string
  now: number
  redirect: string
  storage: EmailHandoffStorage
}): string | null {
  try {
    const raw = storage.getItem(key)
    storage.removeItem(key)
    if (!raw) return null

    const payload = JSON.parse(raw) as Partial<StoredEmailHandoff>
    if (
      payload.version !== 1 ||
      payload.redirect !== redirect ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= now ||
      typeof payload.email !== "string"
    ) {
      return null
    }

    return normalizeHandoffEmail(payload.email)
  } catch {
    return null
  }
}

export function rememberSignInEmailHandoff(
  storage: EmailHandoffStorage,
  email: string,
  redirect: string,
  now = Date.now(),
): boolean {
  return rememberEmailHandoff({
    email,
    expiresAt: now + SIGN_IN_EMAIL_HANDOFF_TTL_MS,
    key: SIGN_IN_EMAIL_HANDOFF_STORAGE_KEY,
    redirect,
    storage,
  })
}

export function consumeSignInEmailHandoff(
  storage: EmailHandoffStorage,
  redirect: string,
  now = Date.now(),
): string | null {
  return consumeEmailHandoff({
    key: SIGN_IN_EMAIL_HANDOFF_STORAGE_KEY,
    now,
    redirect,
    storage,
  })
}

export function rememberMagicLinkRecoveryEmail(
  storage: EmailHandoffStorage,
  email: string,
  redirect: string,
  now = Date.now(),
): boolean {
  return rememberEmailHandoff({
    email,
    expiresAt: now + MAGIC_LINK_EMAIL_RECOVERY_TTL_MS,
    key: MAGIC_LINK_EMAIL_RECOVERY_STORAGE_KEY,
    redirect,
    storage,
  })
}

export function consumeMagicLinkRecoveryEmail(
  storage: EmailHandoffStorage,
  redirect: string,
  now = Date.now(),
): string | null {
  return consumeEmailHandoff({
    key: MAGIC_LINK_EMAIL_RECOVERY_STORAGE_KEY,
    now,
    redirect,
    storage,
  })
}

type SearchParamsInput =
  | URLSearchParams
  | string
  | Record<string, string | number | boolean | null | undefined>

type AuthHandoffWindow = {
  location: Pick<Location, "assign">
  dispatchEvent?: (event: Event) => boolean
  CustomEvent?: typeof CustomEvent
}

export type AuthHandoffEventDetail = {
  destination: typeof AUTH_POST_SIGNIN_HREF
  href: string
}

export function createAuthHandoffRefreshGuard(now: () => number = () => Date.now()) {
  let suppressedUntil = 0

  return {
    suppress() {
      suppressedUntil = now() + AUTH_HANDOFF_REFRESH_SUPPRESSION_MS
    },
    shouldSuppress() {
      return now() < suppressedUntil
    },
  }
}

export function buildPostSignInHref(searchParams?: SearchParamsInput): string {
  if (!searchParams) return AUTH_POST_SIGNIN_HREF

  const params = searchParams instanceof URLSearchParams
    ? searchParams
    : new URLSearchParams(
      typeof searchParams === "string"
        ? searchParams.startsWith("?")
          ? searchParams.slice(1)
          : searchParams
        : Object.entries(searchParams).flatMap(([key, value]) =>
          value === null || value === undefined ? [] : [[key, String(value)]],
        ),
    )

  const paramsString = params.toString()
  return paramsString ? `${AUTH_POST_SIGNIN_HREF}?${paramsString}` : AUTH_POST_SIGNIN_HREF
}

export function buildPostSignInRedirectHref(next?: string | null): string {
  if (!next) return AUTH_POST_SIGNIN_HREF

  if (next.startsWith(AUTH_POST_SIGNIN_HREF) && !next.startsWith("//")) {
    return next
  }

  if (next.startsWith("/") && !next.startsWith("//")) {
    return buildPostSignInHref({ redirect: next })
  }

  return AUTH_POST_SIGNIN_HREF
}

export function emitAuthHandoffEvent(
  windowLike: AuthHandoffWindow,
  href: string,
): void {
  if (!windowLike.dispatchEvent) return

  const CustomEventCtor = windowLike.CustomEvent ?? globalThis.CustomEvent
  if (!CustomEventCtor) return

  windowLike.dispatchEvent(new CustomEventCtor<AuthHandoffEventDetail>(AUTH_HANDOFF_EVENT, {
    detail: {
      destination: AUTH_POST_SIGNIN_HREF,
      href,
    },
  }))
}

export function navigateToPostSignIn(
  windowLike: AuthHandoffWindow,
  searchParams?: SearchParamsInput,
): string {
  const href = buildPostSignInHref(searchParams)
  emitAuthHandoffEvent(windowLike, href)
  // Stamp sessionStorage so the destination page's SupabaseAuthProvider can
  // suppress the router.refresh() that fires on TOKEN_REFRESHED/SIGNED_IN.
  // The AUTH_HANDOFF_EVENT in-memory guard does not survive a full-page
  // navigation — sessionStorage does.
  try {
    sessionStorage.setItem(AUTH_HANDOFF_STORAGE_KEY, String(Date.now()))
  } catch {
    // sessionStorage unavailable (private browsing, storage blocked) — fall
    // through; the race condition is rare and the page still loads, just with
    // the "Application error" flash the user reported.
  }
  windowLike.location.assign(href)
  return href
}
