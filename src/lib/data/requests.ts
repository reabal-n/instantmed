export async function updateRequestStatus(requestId: string, status: string) {
  // Stub implementation
  return { success: false }
}

export async function updateClinicalNote(requestId: string, note: string) {
  // Stub implementation
  return { success: false }
}

export async function updateScriptSent(requestId: string, sent: boolean, notes?: string) {
  // Stub implementation
  return false
}

export async function saveDoctorNotes(requestId: string, notes: string) {
  // Stub implementation
  return { success: false }
}

export async function escalateRequest(requestId: string) {
  // Stub implementation
  return { success: false }
}

export async function flagForFollowup(requestId: string) {
  // Stub implementation
  return { success: false }
}

export async function markAsReviewed(requestId: string) {
  // Stub implementation
  return { success: false }
}

export async function getRequestWithDetails(requestId: string) {
  return null
}

export async function getAllRequestsByStatus(status: string) {
  return []
}

export async function getAllRequestsForAdmin() {
  return []
}

export async function getDoctorDashboardStats() {
  return {
    pending: 0,
    approved: 0,
    declined: 0,
    total: 0,
  }
}

export async function getRequestsAwaitingPayment() {
  return []
}

export async function createRequest(data: {
  patient_id: string
  type: string
  status: string
}, answers: Record<string, unknown>) {
  // Stub implementation
  return null
}

export function formatRequestType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export function formatCategory(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export function formatSubtype(subtype: string): string {
  return subtype.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export function getRequests() {
  return []
}

export async function getPatientRequests(patientId: string) {
  return []
}

export async function getPatientRequestStats(patientId: string) {
  return {
    total: 0,
    pending: 0,
    approved: 0,
    declined: 0,
  }
}
