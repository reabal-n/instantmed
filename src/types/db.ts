export type RequestStatus = 'pending' | 'approved' | 'declined' | 'needs_follow_up'
export type AustralianState = 'ACT' | 'NSW' | 'NT' | 'QLD' | 'SA' | 'TAS' | 'VIC' | 'WA'

export interface RequestWithPatient {
  id: string
  patient_id: string
  status: RequestStatus
  [key: string]: unknown
}

