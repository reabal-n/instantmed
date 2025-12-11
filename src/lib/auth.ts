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
