export const AUTH_POST_SIGNIN_HREF = "/auth/post-signin" as const
export const AUTH_HANDOFF_EVENT = "instantmed:auth-handoff" as const

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
  windowLike.location.assign(href)
  return href
}
