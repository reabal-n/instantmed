export function normalizeVerificationCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "")
}
