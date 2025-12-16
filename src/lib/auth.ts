/**
 * Auth utilities - Re-exports from lib/auth.ts
 * 
 * This file re-exports the auth utilities from the root lib/auth.ts
 * to work with the @/ alias that points to src/
 */

// Re-export everything from the root lib/auth.ts
export {
  getAuthenticatedUserWithProfile,
  requireAuth,
  signOut,
  getOptionalAuth,
  getCurrentUser,
  getUserProfile,
  checkOnboardingRequired,
  requirePatientAuth,
  type AuthenticatedUser,
} from '../../lib/auth'
