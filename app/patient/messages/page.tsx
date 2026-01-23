import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { MessagesClient } from "./messages-client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

export default async function PatientMessagesPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in?redirect=/patient/messages")
  }

  if (!authUser.profile.onboarding_completed) {
    redirect("/patient/onboarding")
  }

  const supabase = createServiceRoleClient()
  const patientId = authUser.profile.id

  // Fetch messages for this patient
  const { data: rawMessages } = await supabase
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
        service_type,
        category
      )
    `)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(50)

  // Transform messages to match expected type (joins return arrays)
  const messages = (rawMessages || []).map((msg) => {
    const intake = Array.isArray(msg.intake) ? msg.intake[0] : msg.intake
    return {
      ...msg,
      intake: intake ? {
        ...intake,
        service: { name: intake.category || "Service", short_name: intake.category || "Service" },
      } : null,
    }
  })

  // Get unread count
  const { count: unreadCount } = await supabase
    .from("patient_messages")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("sender_type", "doctor")
    .is("read_at", null)

  // Group messages by intake
  const messagesByIntake: Record<string, typeof messages> = {}
  for (const msg of messages || []) {
    const intakeId = msg.intake_id || "general"
    if (!messagesByIntake[intakeId]) {
      messagesByIntake[intakeId] = []
    }
    messagesByIntake[intakeId]!.push(msg)
  }

  return (
    <MessagesClient
      messages={messages || []}
      messagesByIntake={messagesByIntake}
      unreadCount={unreadCount || 0}
      patientId={patientId}
    />
  )
}
