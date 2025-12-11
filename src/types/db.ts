export type RequestStatus = 'pending' | 'approved' | 'declined' | 'needs_follow_up'
export type AustralianState = 'ACT' | 'NSW' | 'NT' | 'QLD' | 'SA' | 'TAS' | 'VIC' | 'WA'
export type RequestType = 'sick_cert' | 'prescription' | 'referral' | string

export interface RequestWithPatient {
  id: string
  patient_id: string
  status: RequestStatus
  [key: string]: unknown
}

export interface MedCertDraftData {
  [key: string]: unknown
}

export interface Profile {
  id: string
  auth_user_id: string
  full_name: string
  first_name: string | null
  last_name: string | null
  date_of_birth: string
  gender: string | null
  medicare_number: string | null
  medicare_irn: number | null
  medicare_expiry: string | null
  role: 'patient' | 'doctor'
  [key: string]: unknown
}
