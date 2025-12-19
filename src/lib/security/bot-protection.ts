// ============================================
// BOT PROTECTION: Honeypot + timing checks
// ============================================

import { z } from 'zod'

/**
 * Honeypot field schema - must be empty
 */
export const honeypotSchema = z.object({
  website: z.string().max(0, 'Invalid submission').optional().default(''),
  _hp_field: z.string().max(0, 'Invalid submission').optional().default(''),
})

/**
 * Timing check - form must take at least 2 seconds to fill
 */
export function createFormTimestamp(): string {
  return Buffer.from(Date.now().toString()).toString('base64')
}

export function validateFormTiming(
  timestamp: string | null | undefined,
  minSeconds: number = 2
): boolean {
  if (!timestamp) return false

  try {
    const submitted = parseInt(Buffer.from(timestamp, 'base64').toString())
    const elapsed = Date.now() - submitted
    return elapsed >= minSeconds * 1000
  } catch {
    return false
  }
}

/**
 * Bot detection schema for forms
 */
export const botProtectionSchema = z.object({
  _ft: z.string().optional(), // Form timestamp
  website: z.string().max(0).optional().default(''), // Honeypot 1
  _hp_field: z.string().max(0).optional().default(''), // Honeypot 2
})

/**
 * Validate bot protection fields
 */
export function validateBotProtection(data: {
  _ft?: string
  website?: string
  _hp_field?: string
}): { valid: boolean; reason?: string } {
  // Check honeypot fields
  if (data.website || data._hp_field) {
    return { valid: false, reason: 'Bot detected (honeypot)' }
  }

  // Check timing (must be at least 2 seconds)
  if (!validateFormTiming(data._ft)) {
    return { valid: false, reason: 'Form submitted too quickly' }
  }

  return { valid: true }
}

/**
 * Check for suspicious patterns in user input
 */
export function detectSuspiciousInput(text: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i, // onclick=, onload=, etc.
    /data:/i,
    /\{\{.*\}\}/, // Template injection
    /\$\{.*\}/, // JS template literals
    /%3Cscript/i, // URL encoded
  ]

  return suspiciousPatterns.some((pattern) => pattern.test(text))
}

/**
 * Sanitize user input (basic XSS prevention)
 */
export function sanitizeInput(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}
