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
    expect(signInPage).toContain("Email me a sign-in link")
  })

  it("keeps the forgot-password and reset-password routes reachable", () => {
    const forgotPage = readRepoFile("app/auth/forgot-password/page.tsx")
    const resetPage = readRepoFile("app/auth/reset-password/page.tsx")

    expect(forgotPage).toContain("ForgotPasswordClient")
    expect(forgotPage).not.toContain("redirect('/sign-in')")
    expect(resetPage).toContain("ResetPasswordClient")
    expect(resetPage).not.toContain("redirect('/sign-in')")
  })

  it("uses Supabase recovery emails instead of generating an unsent magic link", () => {
    const accountActions = readRepoFile("app/actions/account.ts")

    expect(accountActions).toContain("resetPasswordForEmail")
    expect(accountActions).toContain("/auth/callback?next=")
    expect(accountActions).toContain("/auth/reset-password")
    expect(accountActions).not.toContain('type: "magiclink"')
    expect(accountActions).not.toContain("generateLink")
  })

  it("updates the password from an established recovery session, not a raw code parameter", () => {
    const resetClient = readRepoFile("app/auth/reset-password/reset-password-client.tsx")

    expect(resetClient).toContain("getUser()")
    expect(resetClient).toContain("updateUser")
    expect(resetClient).not.toContain('searchParams?.get("code")')
  })

  it("smoke-tests public auth recovery routes after production deploys", () => {
    const smokeWorkflow = readRepoFile(".github/workflows/post-deploy-smoke.yml")

    expect(smokeWorkflow).toContain("/auth/forgot-password")
    expect(smokeWorkflow).toContain("/auth/reset-password")
  })
})
