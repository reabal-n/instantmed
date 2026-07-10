import { resolvePostAuthDestination } from "@/lib/auth/post-auth-destination"
import { normalizePostAuthRedirect } from "@/lib/auth/redirects"

export const AUTH_CONFIRMATION_ACTION_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
] as const

export type AuthConfirmationActionType = typeof AUTH_CONFIRMATION_ACTION_TYPES[number]

type VerifyOtpResult = {
  error: { code?: string; message?: string } | null
}

type VerifyOtp = (input: {
  token_hash: string
  type: AuthConfirmationActionType
}) => Promise<VerifyOtpResult>

export type ConsumeAuthConfirmationResult =
  | { success: true; destination: string }
  | { success: false; error: "invalid_link" | "expired_or_invalid" | "temporarily_unavailable" }

export function isAuthConfirmationActionType(
  value: string | null | undefined,
): value is AuthConfirmationActionType {
  return AUTH_CONFIRMATION_ACTION_TYPES.includes(value as AuthConfirmationActionType)
}

export function readAuthConfirmationParams(
  query: Pick<URLSearchParams, "get">,
  hash: string,
): {
  tokenHash: string | null
  actionType: string | null
  next: string | null
} {
  const fragment = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash)
  const hasFragmentCredentials = fragment.has("token_hash") || fragment.has("type")
  const source = hasFragmentCredentials ? fragment : query

  return {
    tokenHash: source.get("token_hash"),
    actionType: source.get("type"),
    next: source.get("next"),
  }
}

export function selectAuthConfirmationParams(
  live: ReturnType<typeof readAuthConfirmationParams>,
  retained: ReturnType<typeof readAuthConfirmationParams> | null,
): ReturnType<typeof readAuthConfirmationParams> {
  const liveHasCredentials = Boolean(live.tokenHash || live.actionType)
  return liveHasCredentials ? live : retained ?? live
}

function isAuthLoop(path: string): boolean {
  return path.startsWith("/auth/callback") || path.startsWith("/auth/confirm")
}

export function resolveAuthConfirmationDestination(
  actionType: AuthConfirmationActionType,
  next: string | null | undefined,
): string {
  if (actionType === "recovery") return "/auth/reset-password"

  const safeNext = normalizePostAuthRedirect(next, "")
  const usableNext = safeNext && !isAuthLoop(safeNext) ? safeNext : ""

  if (actionType === "email_change") {
    const settingsDestination = usableNext && !usableNext.startsWith("/auth/")
      ? usableNext
      : "/patient/settings"
    return resolvePostAuthDestination(settingsDestination)
  }

  return resolvePostAuthDestination(usableNext || null)
}

export async function consumeAuthEmailConfirmation(
  input: {
    tokenHash: string | null | undefined
    actionType: string | null | undefined
    next: string | null | undefined
  },
  verifyOtp: VerifyOtp,
): Promise<ConsumeAuthConfirmationResult> {
  const tokenHash = input.tokenHash?.trim()
  if (!tokenHash || !isAuthConfirmationActionType(input.actionType)) {
    return { success: false, error: "invalid_link" }
  }

  try {
    const { error } = await verifyOtp({
      token_hash: tokenHash,
      type: input.actionType,
    })

    if (error) {
      return { success: false, error: "expired_or_invalid" }
    }
  } catch {
    return { success: false, error: "temporarily_unavailable" }
  }

  return {
    success: true,
    destination: resolveAuthConfirmationDestination(input.actionType, input.next),
  }
}
