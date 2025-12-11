'use server'

export async function createAccountAction(data: {
  email: string
  password: string
}) {
  // Stub implementation
  return { success: false, error: 'Not implemented' }
}

export async function requestPasswordReset(email: string) {
  // Stub implementation
  return { success: false, error: 'Not implemented' }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  // Stub implementation
  return { success: false, error: 'Not implemented' }
}

export async function deleteAccount() {
  // Stub implementation
  return { success: false, error: 'Not implemented' }
}
