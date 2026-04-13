/**
 * Shared types for intake data module.
 * Re-exports DB types and defines module-internal interfaces.
 */

export type {
  Intake,
  IntakeStatus,
  IntakeWithDetails,
  IntakeWithPatient,
  PatientNote,
} from "@/types/db"

export interface DashboardIntake {
  id: string
  status: string
  created_at: string
  updated_at: string
  service_id: string
  service: { id: string; name?: string; short_name?: string; type?: string; slug?: string } | null
}

export interface DashboardPrescription {
  id: string
  medication_name: string
  dosage_instructions: string
  issued_date: string
  expiry_date: string
  status: "active" | "expired"
}
