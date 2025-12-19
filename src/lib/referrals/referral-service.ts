export async function generateReferralCode(): Promise<string> {
  // Stub implementation
  return Math.random().toString(36).substring(2, 9).toUpperCase()
}

export async function getReferralStats(code: string) {
  // Stub implementation
  return {
    code,
    uses: 0,
    signups: 0,
  }
}

