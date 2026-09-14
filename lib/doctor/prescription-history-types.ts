export interface PatientTimelinePrescription {
  id: string
  source: "parchment" | "instantmed_request" | "instantmed"
  medication_name: string
  medication_strength?: string | null
  dosage_instructions?: string | null
  quantity_prescribed?: number | null
  repeats_allowed?: number | null
  status: string
  recorded_at: string
  parchment_reference?: string | null
  request_id?: string | null
}
