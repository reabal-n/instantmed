import { afterEach, describe, expect, it, vi } from "vitest"

import {
  readSupportInboxUnreadThreadCount,
  SUPPORT_INBOX_GMAIL_LABEL_URL,
  SUPPORT_INBOX_GMAIL_TOKEN_URL,
} from "@/lib/integrations/gmail/support-inbox-count"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("support inbox Gmail aggregate reader", () => {
  it("exchanges the dedicated refresh token and reads only the INBOX label aggregate", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ access_token: "access-token" }))
      .mockResolvedValueOnce(Response.json({
        id: "INBOX",
        messagesTotal: 147,
        messagesUnread: 4,
        name: "INBOX",
        threadsTotal: 110,
        threadsUnread: 3,
        type: "system",
      }))

    await expect(readSupportInboxUnreadThreadCount({
      clientId: "gmail-client-id",
      clientSecret: "gmail-client-secret",
      fetch: fetchMock,
      quotaProjectId: "instantmed",
      refreshToken: "gmail-refresh-token",
    })).resolves.toBe(3)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(SUPPORT_INBOX_GMAIL_TOKEN_URL)
    const tokenInit = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(tokenInit.method).toBe("POST")
    expect(String(tokenInit.body)).toContain("grant_type=refresh_token")
    expect(String(tokenInit.body)).toContain("refresh_token=gmail-refresh-token")

    expect(fetchMock.mock.calls[1]?.[0]).toBe(SUPPORT_INBOX_GMAIL_LABEL_URL)
    const labelInit = fetchMock.mock.calls[1]?.[1] as RequestInit
    expect(labelInit.method).toBe("GET")
    expect(labelInit.headers).toEqual({
      Authorization: "Bearer access-token",
      "X-Goog-User-Project": "instantmed",
    })
    expect(SUPPORT_INBOX_GMAIL_LABEL_URL.endsWith("/users/me/labels/INBOX")).toBe(true)
    expect(SUPPORT_INBOX_GMAIL_LABEL_URL).not.toContain("/messages")
    expect(SUPPORT_INBOX_GMAIL_LABEL_URL).not.toContain("/threads")
  })

  it("fails closed when dedicated Gmail credentials are incomplete", async () => {
    const fetchMock = vi.fn()

    await expect(readSupportInboxUnreadThreadCount({
      clientId: "gmail-client-id",
      clientSecret: "",
      fetch: fetchMock,
      refreshToken: "gmail-refresh-token",
    })).rejects.toThrow("Support inbox Gmail credentials are not configured")

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("fails closed when Google does not return an access token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({}, { status: 200 }))

    await expect(readSupportInboxUnreadThreadCount({
      clientId: "gmail-client-id",
      clientSecret: "gmail-client-secret",
      fetch: fetchMock,
      refreshToken: "gmail-refresh-token",
    })).rejects.toThrow("Support inbox Gmail token response was invalid")
  })

  it.each([-1, 1.5, 10_001, "3", null, undefined])(
    "rejects an invalid threadsUnread aggregate: %s",
    async (threadsUnread) => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(Response.json({ access_token: "access-token" }))
        .mockResolvedValueOnce(Response.json({ id: "INBOX", threadsUnread }))

      await expect(readSupportInboxUnreadThreadCount({
        clientId: "gmail-client-id",
        clientSecret: "gmail-client-secret",
        fetch: fetchMock,
        refreshToken: "gmail-refresh-token",
      })).rejects.toThrow("Support inbox Gmail label response was invalid")
    },
  )

  it("does not include Google response bodies in request errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error_description: "sensitive-provider-detail" }),
      { status: 401 },
    ))

    await expect(readSupportInboxUnreadThreadCount({
      clientId: "gmail-client-id",
      clientSecret: "gmail-client-secret",
      fetch: fetchMock,
      refreshToken: "gmail-refresh-token",
    })).rejects.toThrow("Support inbox Gmail token request failed (401)")
    await expect(readSupportInboxUnreadThreadCount({
      clientId: "gmail-client-id",
      clientSecret: "gmail-client-secret",
      fetch: fetchMock,
      refreshToken: "gmail-refresh-token",
    })).rejects.not.toThrow("sensitive-provider-detail")
  })
})
