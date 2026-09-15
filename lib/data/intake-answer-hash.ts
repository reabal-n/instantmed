import "server-only"

import crypto from "crypto"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * Compute a deterministic SHA-256 hash of intake answers.
 * Used to detect whether patient answers changed after draft generation.
 */
export async function computeIntakeHash(intakeId: string): Promise<string | null> {
  const supabase = createServiceRoleClient()

  const { data: answers } = await supabase
    .from("intake_answers")
    .select("answers")
    .eq("intake_id", intakeId)
    .single()

  if (!answers) {
    return null
  }

  // Create deterministic hash of answers
  const content = JSON.stringify(answers.answers, Object.keys(answers.answers).sort())
  return crypto.createHash("sha256").update(content).digest("hex")
}

