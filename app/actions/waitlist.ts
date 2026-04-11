"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getPostHogClient } from "@/lib/posthog-server"

const WaitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  serviceId: z.string().min(1),
})

export async function joinWaitlist(
  _prev: { success: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const parsed = WaitlistSchema.safeParse({
    email: formData.get("email"),
    serviceId: formData.get("serviceId"),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("service_waitlist")
    .upsert(
      { email: parsed.data.email, service_id: parsed.data.serviceId },
      { onConflict: "email,service_id" }
    )

  if (error) {
    return { success: false, error: "Something went wrong. Please try again." }
  }

  // Track waitlist signup in PostHog (no PII - skip email)
  try {
    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: "anonymous",
      event: "waitlist_joined",
      properties: {
        service_id: parsed.data.serviceId,
      },
    })
  } catch {
    // Non-blocking - don't fail the action if analytics fails
  }

  return { success: true }
}
