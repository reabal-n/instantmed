import crypto from "crypto"

import { normalizePostAuthRedirect } from "@/lib/auth/redirects"

export type AuthEmailActionType =
  | "magiclink"
  | "signup"
  | "recovery"
  | "invite"
  | "email_change"
  | "reauthentication"

export type EmailChangeAudience = "current" | "new"

export interface SupabaseAuthHookPayload {
  user: {
    id: string
    email: string
    new_email?: string
    user_metadata?: {
      full_name?: string
      first_name?: string
    }
  }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type: AuthEmailActionType
    site_url: string
    token_new?: string
    token_hash_new?: string
  }
}

export interface PlannedAuthEmailMessage {
  to: string
  subject: string
  actionType: AuthEmailActionType
  idempotencyKey: string
  confirmationUrl?: string
  verificationCode?: string
  emailChangeAudience?: EmailChangeAudience
}

export type AuthEmailMessagePlan =
  | { ok: true; messages: PlannedAuthEmailMessage[] }
  | { ok: false; error: string }

const LINK_ACTION_TYPES = new Set<AuthEmailActionType>([
  "magiclink",
  "signup",
  "recovery",
  "invite",
  "email_change",
])

function buildMessageIdempotencyKey(input: {
  userId: string
  actionType: AuthEmailActionType
  to: string
  oneTimeCredential: string
  audience?: EmailChangeAudience
}): string {
  const digest = crypto
    .createHash("sha256")
    .update([
      input.userId,
      input.actionType,
      input.audience ?? "primary",
      input.to.trim().toLowerCase(),
      input.oneTimeCredential,
    ].join(":"))
    .digest("hex")

  // Resend retains idempotency keys for 24 hours. Hash the recipient and
  // one-time credential so neither is exposed in provider request metadata.
  return `supabase-auth/${input.actionType}/${digest}`
}

function getFirstName(payload: SupabaseAuthHookPayload): string | undefined {
  return payload.user.user_metadata?.first_name
    ?? payload.user.user_metadata?.full_name?.trim().split(/\s+/)[0]
}

function getSubject(
  actionType: AuthEmailActionType,
  firstName?: string,
  emailChangeAudience?: EmailChangeAudience,
): string {
  switch (actionType) {
    case "magiclink":
      return "Your InstantMed sign-in link is ready"
    case "signup":
      return firstName
        ? `Welcome, ${firstName}! Confirm your email`
        : "Confirm your InstantMed email"
    case "recovery":
      return "Reset your InstantMed access"
    case "invite":
      return "You've been invited to InstantMed"
    case "email_change":
      return emailChangeAudience === "current"
        ? "Approve your InstantMed email change"
        : "Confirm your new InstantMed email"
    case "reauthentication":
      return "Your InstantMed verification code"
  }
}

function getSafeNext(redirectTo: string, appUrl: string): string {
  if (!redirectTo) return ""

  try {
    const appOrigin = new URL(appUrl).origin
    const redirectUrl = new URL(redirectTo, appOrigin)
    if (redirectUrl.origin !== appOrigin) return ""

    if (redirectUrl.pathname === "/auth/callback") {
      return normalizePostAuthRedirect(
        redirectUrl.searchParams.get("next") ?? redirectUrl.searchParams.get("redirect"),
        "",
      )
    }

    return normalizePostAuthRedirect(
      `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`,
      "",
    )
  } catch {
    return ""
  }
}

function buildConfirmationUrl(
  appUrl: string,
  tokenHash: string,
  actionType: Exclude<AuthEmailActionType, "reauthentication">,
  redirectTo: string,
): string {
  const confirmationUrl = new URL("/auth/confirm", appUrl)
  const fragmentParams = new URLSearchParams({
    token_hash: tokenHash,
    type: actionType,
  })

  if (actionType !== "recovery") {
    const next = getSafeNext(redirectTo, appUrl)
    if (next && !next.startsWith("/auth/callback") && !next.startsWith("/auth/confirm")) {
      fragmentParams.set("next", next)
    }
  }

  // URL fragments stay in the browser and are not sent to Vercel/request logs
  // or in the HTTP Referer header. The client consumes this only after a click.
  confirmationUrl.hash = fragmentParams.toString()
  return confirmationUrl.toString()
}

function planLinkMessage(
  payload: SupabaseAuthHookPayload,
  appUrl: string,
  to: string,
  tokenHash: string,
  emailChangeAudience?: EmailChangeAudience,
): PlannedAuthEmailMessage | null {
  const actionType = payload.email_data.email_action_type
  if (!LINK_ACTION_TYPES.has(actionType) || actionType === "reauthentication" || !tokenHash) {
    return null
  }

  return {
    to,
    subject: getSubject(actionType, getFirstName(payload), emailChangeAudience),
    actionType,
    idempotencyKey: buildMessageIdempotencyKey({
      userId: payload.user.id,
      actionType,
      to,
      oneTimeCredential: tokenHash,
      audience: emailChangeAudience,
    }),
    confirmationUrl: buildConfirmationUrl(
      appUrl,
      tokenHash,
      actionType,
      payload.email_data.redirect_to,
    ),
    emailChangeAudience,
  }
}

export function planAuthEmailMessages(
  payload: SupabaseAuthHookPayload,
  options: { appUrl: string },
): AuthEmailMessagePlan {
  const actionType = payload.email_data?.email_action_type
  const currentEmail = payload.user?.email?.trim()

  if (!currentEmail || !actionType) {
    return { ok: false, error: "Missing auth email recipient or action type" }
  }

  try {
    new URL(options.appUrl)
  } catch {
    return { ok: false, error: "Invalid application URL" }
  }

  if (actionType === "reauthentication") {
    const verificationCode = payload.email_data.token?.trim()
    if (!verificationCode) {
      return { ok: false, error: "Missing reauthentication code" }
    }

    return {
      ok: true,
      messages: [{
        to: currentEmail,
        subject: getSubject(actionType),
        actionType,
        idempotencyKey: buildMessageIdempotencyKey({
          userId: payload.user.id,
          actionType,
          to: currentEmail,
          oneTimeCredential: verificationCode,
        }),
        verificationCode,
      }],
    }
  }

  if (actionType === "email_change") {
    const newEmail = payload.user.new_email?.trim()
    if (!newEmail) {
      return { ok: false, error: "Missing new email address" }
    }

    const newAddressMessage = planLinkMessage(
      payload,
      options.appUrl,
      newEmail,
      payload.email_data.token_hash,
      "new",
    )
    if (!newAddressMessage) {
      return { ok: false, error: "Missing new-address confirmation hash" }
    }

    const currentAddressHash = payload.email_data.token_hash_new?.trim()
    if (!currentAddressHash) {
      return { ok: true, messages: [newAddressMessage] }
    }

    const currentAddressMessage = planLinkMessage(
      payload,
      options.appUrl,
      currentEmail,
      currentAddressHash,
      "current",
    )
    if (!currentAddressMessage) {
      return { ok: false, error: "Missing current-address confirmation hash" }
    }

    return { ok: true, messages: [currentAddressMessage, newAddressMessage] }
  }

  const message = planLinkMessage(
    payload,
    options.appUrl,
    currentEmail,
    payload.email_data.token_hash,
  )

  return message
    ? { ok: true, messages: [message] }
    : { ok: false, error: "Missing confirmation hash" }
}
