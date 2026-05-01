import type { Metadata } from "next"

import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { MessagesClient } from "./messages-client"

export const metadata: Metadata = {
  title: "Messages",
  description: "Communicate with your doctor about your requests.",
}

export const dynamic = "force-dynamic"

function isUuid(value: string | undefined): value is string {
  return Boolean(value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i))
}

export default async function PatientMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ intakeId?: string }>
}) {
  // Layout enforces patient role - use cached profile
  const authUser = (await getAuthenticatedUserWithProfile())!
  const query = await searchParams
  const initialSelectedIntakeId = isUuid(query.intakeId) ? query.intakeId : null

  const supabase = createServiceRoleClient()
  const patientId = authUser.profile.id

  // Fetch messages for this patient
  const { data: rawMessages, error: messagesError } = await supabase
    .from("patient_messages")
    .select(`
      id,
      intake_id,
      sender_type,
      sender_id,
      content,
      read_at,
      created_at,
      intake:intakes!intake_id(
        id,
        category
      )
    `)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(50)
  
  // Capture fetch error for display
  const fetchError = messagesError ? "Unable to load messages. Please try again later." : null

  const doctorUnreadIds = (rawMessages || [])
    .filter((msg) => msg.sender_type === "doctor" && !msg.read_at)
    .map((msg) => msg.id)
  let readAt: string | null = null

  if (doctorUnreadIds.length > 0) {
    const attemptedReadAt = new Date().toISOString()
    const { error: markReadError } = await supabase
      .from("patient_messages")
      .update({ read_at: attemptedReadAt })
      .in("id", doctorUnreadIds)

    if (!markReadError) {
      readAt = attemptedReadAt
    }
  }

  // Format raw category slugs to human-readable service names
  function formatCategory(category: string | null | undefined): string {
    if (!category) return "Service"
    return category
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  // Transform messages to match expected type (joins return arrays)
  const messages = (rawMessages || []).map((msg) => {
    const intake = Array.isArray(msg.intake) ? msg.intake[0] : msg.intake
    const formattedName = formatCategory(intake?.category)
    return {
      ...msg,
      read_at: msg.sender_type === "doctor" && !msg.read_at ? readAt : msg.read_at,
      intake: intake ? {
        ...intake,
        service: { name: formattedName, short_name: formattedName },
      } : null,
    }
  })

  // Group messages by intake
  const messagesByIntake: Record<string, typeof messages> = {}
  for (const msg of messages || []) {
    const intakeId = msg.intake_id || "general"
    if (!messagesByIntake[intakeId]) {
      messagesByIntake[intakeId] = []
    }
    messagesByIntake[intakeId]!.push(msg)
  }

  const { count: unreadCount } = await supabase
    .from("patient_messages")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("sender_type", "doctor")
    .is("read_at", null)

  return (
    <MessagesClient
      messages={messages || []}
      messagesByIntake={messagesByIntake}
      unreadCount={unreadCount || 0}
      initialSelectedIntakeId={initialSelectedIntakeId}
      error={fetchError}
    />
  )
}
