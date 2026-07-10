import { describe, expect, it, vi } from "vitest"

import { changeAuthenticatedPassword } from "@/lib/auth/password-change"

function createAuthClient(options?: {
  signInError?: { message: string; code?: string } | null
  updateError?: { message: string; code?: string } | null
}) {
  const signInWithPassword = vi.fn(async () => ({
    data: { user: options?.signInError ? null : { id: "auth-user-id" } },
    error: options?.signInError ?? null,
  }))
  const updateUser = vi.fn(async () => ({
    data: { user: options?.updateError ? null : { id: "auth-user-id" } },
    error: options?.updateError ?? null,
  }))

  return {
    client: { auth: { signInWithPassword, updateUser } },
    signInWithPassword,
    updateUser,
  }
}

describe("changeAuthenticatedPassword", () => {
  it("reauthenticates the current user before changing the password", async () => {
    const { client, signInWithPassword, updateUser } = createAuthClient()

    await expect(changeAuthenticatedPassword(client, {
      email: " Patient@Example.test ",
      currentPassword: "current-password",
      newPassword: "new-password",
    })).resolves.toEqual({ success: true, error: null })

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "patient@example.test",
      password: "current-password",
    })
    expect(updateUser).toHaveBeenCalledWith({ password: "new-password" })
    expect(signInWithPassword.mock.invocationCallOrder[0]).toBeLessThan(
      updateUser.mock.invocationCallOrder[0]!,
    )
  })

  it("does not change the password when the current password is wrong", async () => {
    const { client, updateUser } = createAuthClient({
      signInError: { message: "Invalid login credentials", code: "invalid_credentials" },
    })

    await expect(changeAuthenticatedPassword(client, {
      email: "patient@example.test",
      currentPassword: "wrong-password",
      newPassword: "new-password",
    })).resolves.toEqual({
      success: false,
      error: "Current password is incorrect.",
    })

    expect(updateUser).not.toHaveBeenCalled()
  })

  it("returns a calm retry message when Supabase rejects the update", async () => {
    const { client } = createAuthClient({
      updateError: { message: "Password should be different", code: "same_password" },
    })

    await expect(changeAuthenticatedPassword(client, {
      email: "patient@example.test",
      currentPassword: "current-password",
      newPassword: "current-password",
    })).resolves.toEqual({
      success: false,
      error: "Choose a password you haven't used for this account.",
    })
  })
})
