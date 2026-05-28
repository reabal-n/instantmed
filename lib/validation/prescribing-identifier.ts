import { validateIHI } from "@/lib/validation/ihi"

export function normalizeIdentifierDigits(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const digits = String(value).replace(/\D/g, "")
  return digits || null
}

export function normalizeValidIhiNumber(value: string | number | null | undefined): string | null {
  const digits = normalizeIdentifierDigits(value)
  if (!digits) return null
  return validateIHI(digits).valid ? digits : null
}

export function getIhiValidationError(value: string | number | null | undefined): string | null {
  const digits = normalizeIdentifierDigits(value)
  if (!digits) return null
  const result = validateIHI(digits)
  return result.valid ? null : result.error || "Enter a valid IHI."
}
