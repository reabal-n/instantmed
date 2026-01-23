"use server"

import { 
  validatePatientIdentification, 
  type MedicareValidationResult 
} from "@/lib/validation/medicare"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("validate-medicare")

/**
 * Server action to validate Medicare/IHI for intake submissions
 * 
 * Rules per service type:
 * - medical-certificate: Medicare NOT required
 * - repeat-prescription: Medicare OR IHI required
 * - general-consult: Medicare OR IHI required
 */
export async function validateMedicareAction(params: {
  serviceType: string
  medicareNumber?: string | null
  medicareIrn?: string | null
  ihi?: string | null
  patientId?: string | null
}): Promise<MedicareValidationResult> {
  const { serviceType, medicareNumber, medicareIrn, ihi, patientId } = params

  log.info("Validating patient identification", {
    serviceType,
    hasMedicare: !!medicareNumber,
    hasIrn: !!medicareIrn,
    hasIhi: !!ihi,
    patientId: patientId ? "[REDACTED]" : null,
  })

  const result = validatePatientIdentification({
    serviceType,
    medicareNumber,
    medicareIrn,
    ihi,
  })

  if (!result.valid) {
    log.warn("Medicare validation failed", {
      serviceType,
      error: result.error,
      requiresMedicare: result.requiresMedicare,
    })
  } else if (result.warnings && result.warnings.length > 0) {
    log.info("Medicare validation passed with warnings", {
      serviceType,
      warnings: result.warnings,
    })
  }

  return result
}

/**
 * Validate Medicare before intake submission
 * Returns early rejection if validation fails for services that require it
 */
export async function validateMedicareForIntake(params: {
  serviceType: string
  medicareNumber?: string | null
  medicareIrn?: string | null
  ihi?: string | null
}): Promise<{
  canProceed: boolean
  error?: string
  warnings?: string[]
}> {
  const result = await validateMedicareAction(params)

  if (!result.valid && result.requiresMedicare) {
    return {
      canProceed: false,
      error: result.error || "Valid Medicare number or IHI is required for this service",
    }
  }

  return {
    canProceed: true,
    warnings: result.warnings,
  }
}
