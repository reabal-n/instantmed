export interface DoctorOnboardingStep {
  id: string
  label: string
  description: string
  completed: boolean
  href?: string
  required: boolean
}

export interface DoctorOnboardingStatus {
  steps: DoctorOnboardingStep[]
  summary: {
    total: number
    completed: number
    required_total: number
    required_completed: number
    all_required_complete: boolean
    completion_percentage: number
    can_approve_intakes: boolean
  }
}
