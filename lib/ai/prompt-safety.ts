/**
 * Prompt Injection Detection and Sanitization
 * 
 * Provides utilities to detect and mitigate prompt injection attacks
 * in user-provided input before passing to LLMs.
 */

import { createLogger } from "@/lib/observability/logger"

const log = createLogger("prompt-safety")

// Unicode homoglyph map for common attack characters
// Maps confusable unicode characters to their ASCII equivalents
const UNICODE_HOMOGLYPHS: Record<string, string> = {
  // Cyrillic lookalikes
  'а': 'a', 'е': 'e', 'і': 'i', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x',
  'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P', 
  'С': 'C', 'Т': 'T', 'Х': 'X',
  // Greek lookalikes
  'α': 'a', 'ο': 'o', 'ν': 'v', 'ρ': 'p', 'τ': 't', 'υ': 'u',
  // Special characters
  'ı': 'i', 'ȷ': 'j', 'ɡ': 'g', 'ɑ': 'a',
  // Full-width characters
  'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f', 'ｇ': 'g',
  'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j', 'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n',
  'ｏ': 'o', 'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't', 'ｕ': 'u',
  'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z',
}

/**
 * Normalize unicode homoglyphs to ASCII for pattern matching
 * This prevents attackers from using lookalike characters to bypass detection
 */
function normalizeHomoglyphs(input: string): string {
  let normalized = input
  for (const [unicode, ascii] of Object.entries(UNICODE_HOMOGLYPHS)) {
    normalized = normalized.replace(new RegExp(unicode, 'g'), ascii)
  }
  return normalized
}

/**
 * Check if input contains suspicious unicode characters that could be used for obfuscation
 */
function containsSuspiciousUnicode(input: string): boolean {
  // Check for any homoglyph characters
  for (const unicode of Object.keys(UNICODE_HOMOGLYPHS)) {
    if (input.includes(unicode)) {
      return true
    }
  }
  // Check for zero-width characters (invisible injection)
  if (/[\u200B-\u200F\u2028-\u202F\uFEFF]/.test(input)) {
    return true
  }
  return false
}

// Patterns that indicate prompt injection attempts
const INJECTION_PATTERNS = [
  // Direct instruction override attempts
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/i,
  /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/i,
  /forget\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/i,
  /override\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/i,
  
  // System prompt extraction attempts
  /what\s+(are|is)\s+(your|the)\s+(system\s+)?prompt/i,
  /show\s+(me\s+)?(your|the)\s+(system\s+)?prompt/i,
  /reveal\s+(your|the)\s+(system\s+)?prompt/i,
  /print\s+(your|the)\s+(system\s+)?prompt/i,
  /output\s+(your|the)\s+(system\s+)?prompt/i,
  /display\s+(your|the)\s+(system\s+)?prompt/i,
  
  // Role-play injection attempts
  /you\s+are\s+now\s+(a|an|the)/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /act\s+as\s+(if\s+you\s+are|a|an)/i,
  /roleplay\s+as/i,
  /from\s+now\s+on\s+you\s+are/i,
  
  // Jailbreak attempts
  /dan\s+mode/i,
  /developer\s+mode/i,
  /jailbreak/i,
  /bypass\s+(safety|filter|restriction)/i,
  /disable\s+(safety|filter|restriction)/i,
  
  // Delimiter injection
  /```system/i,
  /\[system\]/i,
  /<system>/i,
  /<<sys>>/i,
  
  // New instruction injection
  /new\s+instruction[s]?:/i,
  /updated\s+instruction[s]?:/i,
  /revised\s+instruction[s]?:/i,
  /actual\s+instruction[s]?:/i,
  /real\s+instruction[s]?:/i,
]

// Suspicious but not necessarily malicious patterns (log but don't block)
const SUSPICIOUS_PATTERNS = [
  /\bsystem\s*:/i,
  /\bassistant\s*:/i,
  /\buser\s*:/i,
  /\bhuman\s*:/i,
  /```\s*(json|xml|yaml)/i, // Code blocks might be legitimate
]

export interface PromptSafetyResult {
  isSafe: boolean
  sanitizedInput: string
  detectedPatterns: string[]
  riskLevel: "none" | "low" | "medium" | "high"
}

/**
 * Check input for prompt injection patterns
 */
export function checkPromptInjection(input: string): PromptSafetyResult {
  const detectedPatterns: string[] = []
  let riskLevel: "none" | "low" | "medium" | "high" = "none"

  // Normalize unicode homoglyphs before pattern matching to catch obfuscation attempts
  const normalizedInput = normalizeHomoglyphs(input)

  // Check for suspicious unicode characters (potential obfuscation)
  if (containsSuspiciousUnicode(input)) {
    detectedPatterns.push("suspicious_unicode_characters")
    riskLevel = "medium"
  }

  // Check for injection patterns (on both original and normalized input)
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input) || pattern.test(normalizedInput)) {
      detectedPatterns.push(pattern.source)
      riskLevel = "high"
    }
  }

  // Check for suspicious patterns (lower risk)
  if (riskLevel !== "high") {
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(input) || pattern.test(normalizedInput)) {
        detectedPatterns.push(`suspicious:${pattern.source}`)
        if (riskLevel === "none") {
          riskLevel = "low"
        }
      }
    }
  }

  // Check for excessive special characters that might indicate encoding tricks
  const specialCharRatio = (input.match(/[^\w\s.,!?'-]/g) || []).length / input.length
  if (specialCharRatio > 0.3) {
    detectedPatterns.push("high_special_char_ratio")
    if (riskLevel === "none" || riskLevel === "low") {
      riskLevel = "medium"
    }
  }

  return {
    isSafe: riskLevel !== "high",
    sanitizedInput: input, // We don't modify, just flag
    detectedPatterns,
    riskLevel,
  }
}

/**
 * Sanitize user input for safe inclusion in prompts
 * This escapes potentially dangerous characters and patterns
 */
export function sanitizeForPrompt(input: string): string {
  // Remove null bytes and other control characters
  // eslint-disable-next-line no-control-regex -- Intentionally matching control characters for sanitization
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
  
  // Escape triple backticks (common delimiter)
  sanitized = sanitized.replace(/```/g, "'''")
  
  // Escape common system/role markers
  sanitized = sanitized.replace(/\[system\]/gi, "[input]")
  sanitized = sanitized.replace(/<system>/gi, "<input>")
  sanitized = sanitized.replace(/<<sys>>/gi, "<<input>>")
  
  // Limit consecutive newlines (can be used to visually separate injected content)
  sanitized = sanitized.replace(/\n{4,}/g, "\n\n\n")
  
  return sanitized
}

/**
 * Full safety check with logging
 */
export function checkAndSanitize(
  input: string,
  context: { endpoint: string; userId?: string }
): { safe: boolean; output: string; blocked: boolean } {
  const result = checkPromptInjection(input)
  
  if (result.riskLevel === "high") {
    log.warn("Prompt injection detected", {
      endpoint: context.endpoint,
      userId: context.userId,
      patterns: result.detectedPatterns,
      inputLength: input.length,
      // Don't log the actual input to avoid log injection
    })
    return { safe: false, output: "", blocked: true }
  }
  
  if (result.riskLevel === "medium") {
    log.info("Suspicious input detected", {
      endpoint: context.endpoint,
      userId: context.userId,
      patterns: result.detectedPatterns,
    })
  }
  
  const sanitized = sanitizeForPrompt(input)
  return { safe: true, output: sanitized, blocked: false }
}

/**
 * Validate that AI output doesn't contain leaked system prompts or instructions
 */
export function validateAIOutput(output: string): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Check for common system prompt leak indicators
  const leakPatterns = [
    /you\s+are\s+a\s+(medical|health|clinical)\s+(assistant|ai|bot)/i,
    /your\s+role\s+is\s+to/i,
    /you\s+must\s+(always|never)/i,
    /as\s+an\s+ai\s+(assistant|model)/i,
    /my\s+instructions\s+(are|were)/i,
    /i\s+was\s+told\s+to/i,
    /my\s+system\s+prompt/i,
  ]
  
  for (const pattern of leakPatterns) {
    if (pattern.test(output)) {
      issues.push(`Potential system prompt leak: ${pattern.source}`)
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Create a safe user message block for inclusion in prompts
 */
export function createSafeUserBlock(input: string, label = "USER INPUT"): string {
  const sanitized = sanitizeForPrompt(input)
  // Use unique delimiters that are unlikely to be guessed
  const delimiter = "═".repeat(20)
  return `${delimiter} ${label} START ${delimiter}
${sanitized}
${delimiter} ${label} END ${delimiter}`
}
