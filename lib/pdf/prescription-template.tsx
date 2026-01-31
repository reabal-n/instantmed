/**
 * ⛔ PRESCRIBING WORKFLOW BOUNDARY
 * 
 * This file has been deprecated in accordance with PRESCRIBING_WORKFLOW_BOUNDARY.md
 * 
 * InstantMed Health does NOT generate prescriptions.
 * All prescribing occurs externally via dedicated prescribing platforms (e.g., Parchment).
 * 
 * This stub exists to maintain type compatibility during migration.
 * Any attempt to generate a prescription will throw an error.
 */

export interface PrescriptionTemplateData {
  patientName: string
  dob: string
  address?: string
  medicareNumber?: string
  medicationName: string
  dosage: string
  quantity: string
  repeats: number
  directions: string
  pbsListed: boolean
  authorityRequired: boolean
  authorityNumber?: string
  doctorName: string
  providerNumber: string
  prescriberNumber: string
  createdDate: string
  referenceNumber: string
}

/**
 * @deprecated Prescription generation is not permitted within InstantMed Health.
 * See PRESCRIBING_WORKFLOW_BOUNDARY.md for details.
 * Prescriptions must be created in external prescribing systems.
 */
export function generatePrescriptionHTML(_data: PrescriptionTemplateData): never {
  throw new Error(
    "PRESCRIBING BOUNDARY VIOLATION: InstantMed Health does not generate prescriptions. " +
    "Prescriptions must be created in external prescribing systems (e.g., Parchment). " +
    "See PRESCRIBING_WORKFLOW_BOUNDARY.md for details."
  )
}
