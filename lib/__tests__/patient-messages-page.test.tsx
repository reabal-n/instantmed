import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserWithProfile: vi.fn(),
  createServiceRoleClient: vi.fn(),
  MessagesClient: vi.fn(() => null),
}))

vi.mock("@/lib/auth/helpers", () => ({
  getAuthenticatedUserWithProfile: mocks.getAuthenticatedUserWithProfile,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/app/patient/messages/messages-client", () => ({
  MessagesClient: mocks.MessagesClient,
}))

import PatientMessagesPage from "@/app/patient/messages/page"

const PATIENT_ID = "22222222-2222-4222-8222-222222222222"
const DOCTOR_MESSAGE_ID = "33333333-3333-4333-8333-333333333333"

function createMessagesPageSupabaseMock() {
  const markReadPayloads: Record<string, unknown>[] = []
  const markReadIds: string[][] = []

  const messagesQuery = {
    eq: vi.fn(() => messagesQuery),
    order: vi.fn(() => messagesQuery),
    limit: vi.fn(async () => ({
      data: [
        {
          id: DOCTOR_MESSAGE_ID,
          intake_id: "11111111-1111-4111-8111-111111111111",
          sender_type: "doctor",
          sender_id: "doctor-id",
          content: "Please confirm the date.",
          read_at: null,
          created_at: "2026-05-01T00:00:00.000Z",
          intake: { id: "11111111-1111-4111-8111-111111111111", category: "medical_certificate" },
        },
      ],
      error: null,
    })),
  }

  const countQuery = {
    eq: vi.fn(() => countQuery),
    is: vi.fn(async () => ({ count: markReadIds.length > 0 ? 0 : 1, error: null })),
  }

  const updateQuery = {
    in: vi.fn(async (_column: string, ids: string[]) => {
      markReadIds.push(ids)
      return { error: null }
    }),
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table !== "patient_messages") {
        throw new Error(`Unexpected table ${table}`)
      }

      return {
        select: vi.fn((_columns: string, options?: { count?: string; head?: boolean }) => (
          options?.head ? countQuery : messagesQuery
        )),
        update: vi.fn((payload: Record<string, unknown>) => {
          markReadPayloads.push(payload)
          return updateQuery
        }),
      }
    }),
  }

  return { markReadIds, markReadPayloads, supabase }
}

describe("PatientMessagesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedUserWithProfile.mockResolvedValue({
      profile: { id: PATIENT_ID },
    })
  })

  it("marks unread doctor messages as read when the patient opens messages", async () => {
    const { markReadIds, markReadPayloads, supabase } = createMessagesPageSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const element = await PatientMessagesPage({
      searchParams: Promise.resolve({}),
    })

    expect(markReadPayloads[0]?.read_at).toEqual(expect.any(String))
    expect(markReadIds).toEqual([[DOCTOR_MESSAGE_ID]])
    expect(element.props.unreadCount).toBe(0)
    expect(element.props.messages[0]?.read_at).toEqual(markReadPayloads[0]?.read_at)
  })

  it("passes a validated selected intake id from the query string to the message client", async () => {
    const { supabase } = createMessagesPageSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const element = await PatientMessagesPage({
      searchParams: Promise.resolve({ intakeId: "11111111-1111-4111-8111-111111111111" }),
    })

    expect(element.props.initialSelectedIntakeId).toBe("11111111-1111-4111-8111-111111111111")
  })
})
