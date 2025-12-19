export function getAuth() {
  return { user: null }
}

export async function requireAuth(role?: 'doctor' | 'patient' | 'admin') {
  // Stub implementation - should check authentication
  return { 
    user: null, 
    profile: null,
    authenticated: false 
  }
}

export async function getCurrentUser() {
  return null
}

export async function getUserProfile(userId?: string) {
  return null
}

export async function getAuthenticatedUserWithProfile() {
  // Return stub profile to prevent null errors during build
  return {
    user: {
      id: '',
      email: '',
    },
    profile: {
      id: '',
      auth_user_id: '',
      full_name: '',
      role: 'patient' as const,
      first_name: null,
      last_name: null,
      date_of_birth: '',
      gender: null,
      medicare_number: null,
      medicare_irn: null,
      medicare_expiry: null,
    },
  }
}

export async function getOptionalAuth() {
  return {
    user: null,
    profile: null,
  }
}

export async function checkOnboardingRequired(profile: unknown) {
  return false
}
