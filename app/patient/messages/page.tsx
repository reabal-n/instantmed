import type { Metadata } from "next"

import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { resolveInitialPatientConversation } from "@/lib/patient/messages"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { MessagesClient } from "./messages-client"

export const metadata: Metadata = {
  title: "Messages",
  description: "Communicate with your doctor about your requests.",
}

export const dynamic = "force-dynamic"

export default async function PatientMessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ intakeId?: string }>
}) {
  // Layout enforces patient role - use cached profile
  const authUser = (await getAuthenticatedUserWithProfile())!
  const requestedIntakeId = (await searchParams)?.intakeId ?? null

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
      intake: intake ? {
        ...intake,
        service: { name: formattedName, short_name: formattedName },
      } : null,
    }
  })

  const readAt = new Date().toISOString()
  await supabase
    .from("patient_messages")
    .update({ read_at: readAt })
    .eq("patient_id", patientId)
    .eq("sender_type", "doctor")
    .is("read_at", null)

  const messagesForClient = messages.map((msg) =>
    msg.sender_type === "doctor" && !msg.read_at ? { ...msg, read_at: readAt } : msg,
  )

  // Group messages by intake
  const messagesByIntake: Record<string, typeof messagesForClient> = {}
  for (const msg of messagesForClient || []) {
    const intakeId = msg.intake_id || "general"
    if (!messagesByIntake[intakeId]) {
      messagesByIntake[intakeId] = []
    }
    messagesByIntake[intakeId]!.push(msg)
  }

  const initialIntakeId = resolveInitialPatientConversation(
    Object.keys(messagesByIntake),
    requestedIntakeId,
  )

  return (
    <MessagesClient
      messages={messagesForClient || []}
      messagesByIntake={messagesByIntake}
      unreadCount={0}
      error={fetchError}
      initialIntakeId={initialIntakeId}
    />
  )
}
