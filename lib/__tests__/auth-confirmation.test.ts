import { describe, expect, it, vi } from "vitest"

import {
  consumeAuthEmailConfirmation,
  readAuthConfirmationParams,
  resolveAuthConfirmationDestination,
  selectAuthConfirmationParams,
} from "@/lib/auth/auth-confirmation"

describe("auth email confirmation", () => {
  it("lands recovery directly on the reset form after browser verification", async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: null })

    const result = await consumeAuthEmailConfirmation({
      tokenHash: "recovery-hash",
      actionType: "recovery",
      next: "/auth/post-signin?redirect=%2Fpatient",
    }, verifyOtp)

    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: "recovery-hash",
      type: "recovery",
    })
    expect(result).toEqual({ success: true, destination: "/auth/reset-password" })
  })

  it("routes sign-in links through the profile-linking handoff", () => {
    expect(resolveAuthConfirmationDestination("magiclink", "/patient/settings"))
      .toBe("/auth/post-signin?redirect=%2Fpatient%2Fsettings")
  })

  it("routes confirmed email changes through post-signin so profile email sync runs", () => {
    expect(resolveAuthConfirmationDestination("email_change", "/doctor/settings/identity#account-security"))
      .toBe("/auth/post-signin?redirect=%2Fdoctor%2Fsettings%2Fidentity%23account-security")
  })

  it("drops unsafe destinations", () => {
    expect(resolveAuthConfirmationDestination("magiclink", "https://evil.example/phish"))
      .toBe("/auth/post-signin")
    expect(resolveAuthConfirmationDestination("email_change", "//evil.example/phish"))
      .toBe("/auth/post-signin?redirect=%2Fpatient%2Fsettings")
  })

  it("reads fragment credentials first and retains query credentials only as a legacy fallback", () => {
    const legacyQuery = new URLSearchParams({
      token_hash: "legacy-hash",
      type: "signup",
      next: "/patient",
    })

    expect(readAuthConfirmationParams(
      legacyQuery,
      "#token_hash=fragment-hash&type=recovery&next=%2Fauth%2Freset-password",
    )).toEqual({
      tokenHash: "fragment-hash",
      actionType: "recovery",
      next: "/auth/reset-password",
    })

    expect(readAuthConfirmationParams(legacyQuery, "")).toEqual({
      tokenHash: "legacy-hash",
      actionType: "signup",
      next: "/patient",
    })
  })

  it("prefers a fresh hash over an expired retained attempt in the same tab", () => {
    const retained = {
      tokenHash: "expired-hash",
      actionType: "recovery",
      next: null,
    }
    const fresh = readAuthConfirmationParams(
      new URLSearchParams(),
      "#token_hash=fresh-hash&type=recovery",
    )

    expect(selectAuthConfirmationParams(fresh, retained)).toEqual({
      tokenHash: "fresh-hash",
      actionType: "recovery",
      next: null,
    })
    expect(selectAuthConfirmationParams(
      { tokenHash: null, actionType: null, next: null },
      retained,
    )).toEqual(retained)
  })

  it("does not call Supabase for a missing token or unsupported action type", async () => {
    const verifyOtp = vi.fn()

    await expect(consumeAuthEmailConfirmation({
      tokenHash: "",
      actionType: "magiclink",
      next: null,
    }, verifyOtp)).resolves.toEqual({ success: false, error: "invalid_link" })

    await expect(consumeAuthEmailConfirmation({
      tokenHash: "hash",
      actionType: "reauthentication",
      next: null,
    }, verifyOtp)).resolves.toEqual({ success: false, error: "invalid_link" })

    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it("returns a calm recoverable state when verification fails", async () => {
    const verifyOtp = vi.fn().mockResolvedValue({
      error: { code: "otp_expired", message: "Token has expired or is invalid" },
    })

    await expect(consumeAuthEmailConfirmation({
      tokenHash: "expired-hash",
      actionType: "signup",
      next: null,
    }, verifyOtp)).resolves.toEqual({ success: false, error: "expired_or_invalid" })
  })
})
