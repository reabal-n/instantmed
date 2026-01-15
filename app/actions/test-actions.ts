"use server"

/**
 * Server actions for test mode functionality.
 * Only works in development/test environments.
 */

interface TestRequestResult {
  success: boolean
  requestId?: string
  error?: string
}

export async function createTestRequest(
  _patientId: string,
  _paid?: boolean
): Promise<TestRequestResult> {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error: "Test actions are not available in production",
    }
  }

  // Stub implementation
  return {
    success: false,
    error: "Test request creation not yet implemented",
  }
}
