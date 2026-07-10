import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function readRepoFile(filePath: string) {
  return readFileSync(path.join(root, filePath), "utf8")
}

describe("password reset flow contract", () => {
  it("lets passwordless Supabase users request a sign-in link from the sign-in page", () => {
    const signInPage = readRepoFile("app/sign-in/[[...sign-in]]/page.tsx")

    expect(signInPage).toContain("signInWithPassword")
    expect(signInPage).toContain("signInWithOtp")
    // The magic-link affordance was demoted from a primary button to a text
    // link below the Google CTA on 2026-05-25 (sign-in page cleanup —
    // 3 equal-weight buttons was choice paralysis). The functionality stays;
    // these strings pin the new text-link copy.
    expect(signInPage).toContain("Email me a sign-in link")
    expect(signInPage).toContain("Sign-in link sent. Didn")
    expect(signInPage).toContain("Use the newest link if a few arrive.")
    expect(signInPage).toContain("We couldn't send that link. Try again.")
    expect(signInPage).toContain("emailLinkErrorMessage")
    expect(signInPage).toContain("LAST_MAGIC_LINK_EMAIL_KEY")
    expect(signInPage).toContain("MAGIC_LINK_RESEND_COOLDOWN_MS")
    expect(signInPage).toContain("lastMagicLinkSentAt")
    expect(signInPage).toContain("Give it 30 seconds before sending another link.")
    expect(signInPage).toContain("sessionStorage.setItem(LAST_MAGIC_LINK_EMAIL_KEY")
    expect(signInPage).toContain("sessionStorage.getItem(LAST_MAGIC_LINK_EMAIL_KEY)")
    expect(signInPage).toContain("Wrong email?")
    expect(signInPage).toContain("emailInputRef.current?.focus()")
    expect(signInPage).toContain("googleErrorMessage")
  })

  it("keeps the forgot-password and reset-password routes reachable", () => {
    const forgotPage = readRepoFile("app/auth/forgot-password/page.tsx")
    const forgotClient = readRepoFile("app/auth/forgot-password/forgot-password-client.tsx")
    const resetPage = readRepoFile("app/auth/reset-password/page.tsx")

    expect(forgotPage).toContain("ForgotPasswordClient")
    expect(forgotPage).not.toContain("redirect('/sign-in')")
    expect(resetPage).toContain("ResetPasswordClient")
    expect(resetPage).not.toContain("redirect('/sign-in')")
    expect(forgotClient).toContain("PASSWORD_RESET_RESEND_COOLDOWN_MS")
    expect(forgotClient).toContain("lastResetLinkSentAt")
    expect(forgotClient).toContain("Give it 30 seconds before sending another reset email.")
    expect(forgotClient).toContain("Send another reset email")
    expect(forgotClient).not.toContain("glass-card")
  })

  it("uses Supabase recovery emails instead of generating an unsent magic link", () => {
    const accountActions = readRepoFile("app/actions/account.ts")

    expect(accountActions).toContain("resetPasswordForEmail")
    expect(accountActions).toContain("/auth/reset-password")
    expect(accountActions).not.toContain("/auth/callback?next=")
    expect(accountActions).not.toContain('type: "magiclink"')
    expect(accountActions).not.toContain("generateLink")
  })

  it("keeps the branded Supabase auth email hook documented for production", () => {
    const webhookRoute = readRepoFile("app/api/webhooks/supabase-auth/route.ts")
    const envExample = readRepoFile(".env.example")
    const operations = readRepoFile("docs/OPERATIONS.md")

    expect(webhookRoute).toContain("MagicLinkEmail")
    expect(webhookRoute).toContain("SUPABASE_AUTH_WEBHOOK_HOOK_SECRET")
    expect(envExample).toContain("SUPABASE_AUTH_WEBHOOK_HOOK_SECRET")
    expect(operations).toContain("/api/webhooks/supabase-auth")
    expect(operations).toContain("Send Email hook")
  })

  it("routes the hook token hash through an app-owned explicit confirmation page", () => {
    const webhookRoute = readRepoFile("app/api/webhooks/supabase-auth/route.ts")
    const planner = readRepoFile("lib/auth/auth-email-message-planner.ts")

    expect(webhookRoute).toContain("planAuthEmailMessages")
    expect(webhookRoute).not.toContain("/auth/v1/verify")
    expect(planner).toContain("/auth/confirm")
    expect(planner).toContain("token_hash")
    expect(planner).toContain("confirmationUrl.hash")
  })

  it("updates the password from an established recovery session, not a raw code parameter", () => {
    const resetClient = readRepoFile("app/auth/reset-password/reset-password-client.tsx")

    expect(resetClient).toContain("getUser()")
    expect(resetClient).toContain("updateUser")
    expect(resetClient).toContain("Request a new reset link")
    expect(resetClient).not.toContain('searchParams?.get("code")')
  })

  it("smoke-tests public auth recovery routes after production deploys", () => {
    const smokeWorkflow = readRepoFile(".github/workflows/post-deploy-smoke.yml")

    expect(smokeWorkflow).toContain("/auth/forgot-password")
    expect(smokeWorkflow).toContain("/auth/reset-password")
  })
})
