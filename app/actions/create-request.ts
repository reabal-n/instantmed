"use server"

import { createIntakeAndCheckoutAction } from "@/lib/stripe/checkout"
import crypto from "crypto"

interface CreateRequestInput {
  category: string
  subtype: string
  type: string
  answers: Record<string, unknown>
}

interface CreateRequestResult {
  success: boolean
  intakeId?: string
  checkoutUrl?: string
  error?: string
}

/**
 * Creates an intake request and initiates checkout.
 * Thin wrapper around createIntakeAndCheckoutAction for use in new intake flows.
 */
export async function createRequestAction(
  input: CreateRequestInput
): Promise<CreateRequestResult> {
  const result = await createIntakeAndCheckoutAction({
    category: input.category,
    subtype: input.subtype,
    type: input.type,
    answers: input.answers,
    idempotencyKey: crypto.randomUUID(),
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  return {
    success: true,
    intakeId: result.intakeId,
    checkoutUrl: result.checkoutUrl,
  }
}
