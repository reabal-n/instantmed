import { afterEach, describe, expect, it, vi } from "vitest"

describe("client CSRF fetch wrapper", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it("fetches a server-issued token and sends it on protected mutations", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "csrf-token-123" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )

    vi.stubGlobal("fetch", fetchMock)

    const { fetchWithCsrf } = await import("../security/csrf-client")

    await fetchWithCsrf("/api/patient/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intakeId: "test", content: "hello" }),
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]).toEqual([
      "/api/csrf",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
        method: "GET",
      }),
    ])
    expect(fetchMock.mock.calls[1][0]).toBe("/api/patient/messages")
    expect(fetchMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-CSRF-Token": "csrf-token-123",
        }),
      }),
    )
  })

  it("refreshes the token once when a protected mutation is rejected", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "expired-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Invalid or missing CSRF token" }), { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "fresh-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))

    vi.stubGlobal("fetch", fetchMock)

    const { fetchWithCsrf } = await import("../security/csrf-client")

    const response = await fetchWithCsrf("/api/patient/retry-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId: "invoice" }),
    })

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-CSRF-Token": "expired-token",
        }),
      }),
    )
    expect(fetchMock.mock.calls[3][1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-CSRF-Token": "fresh-token",
        }),
      }),
    )
  })
})
