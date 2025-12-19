export function isTestMode(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.TEST_MODE === 'true'
}

export function getIsTestMode(): boolean {
  return isTestMode()
}

export function setTestModeOverride(value: boolean): void {
  // Stub implementation - could use cookies or localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('testMode', value.toString())
  }
}

export const TEST_DATA = {
  // Add test data as needed
}

