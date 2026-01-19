/**
 * AI Confidence Scoring
 * 
 * Analyzes AI output to estimate confidence levels
 * and flag sections that may need doctor attention.
 */

export interface ConfidenceResult {
  score: number // 0-1
  level: 'high' | 'medium' | 'low'
  flaggedSections: FlaggedSection[]
  reasoning: string[]
}

export interface FlaggedSection {
  section: string
  reason: string
  severity: 'info' | 'warning' | 'review'
}

// Patterns that reduce confidence
const UNCERTAINTY_PATTERNS = [
  { pattern: /\b(may|might|could|possibly|potentially)\b/gi, weight: 0.05 },
  { pattern: /\b(unclear|uncertain|unsure|unknown)\b/gi, weight: 0.1 },
  { pattern: /\b(appears to|seems to|likely)\b/gi, weight: 0.03 },
  { pattern: /\?/g, weight: 0.02 },
]

// Patterns that indicate good structure
const CONFIDENCE_PATTERNS = [
  { pattern: /\*\*[A-Z][^*]+\*\*/g, weight: 0.05 }, // Proper headers
  { pattern: /\d+ day/gi, weight: 0.03 }, // Specific durations
  { pattern: /\d{1,2}\/\d{1,2}\/\d{2,4}/g, weight: 0.03 }, // Dates
]

// Sections that commonly need review
const REVIEW_TRIGGER_SECTIONS = [
  { section: 'duration', patterns: [/4\+ day/i, /over a week/i, /extended/i] },
  { section: 'medication', patterns: [/controlled/i, /opioid/i, /benzo/i] },
  { section: 'symptoms', patterns: [/chest pain/i, /breathing/i, /severe/i] },
]

/**
 * Calculate confidence score for AI output
 */
export function calculateConfidence(
  output: string,
  inputData?: Record<string, unknown>
): ConfidenceResult {
  let score = 0.8 // Base confidence
  const reasoning: string[] = []
  const flaggedSections: FlaggedSection[] = []
  
  // Check for uncertainty patterns
  for (const { pattern, weight } of UNCERTAINTY_PATTERNS) {
    const matches = output.match(pattern)
    if (matches) {
      score -= weight * matches.length
      if (matches.length > 2) {
        reasoning.push(`Found ${matches.length} uncertainty indicators`)
      }
    }
  }
  
  // Check for confidence patterns
  for (const { pattern, weight } of CONFIDENCE_PATTERNS) {
    const matches = output.match(pattern)
    if (matches) {
      score += weight * Math.min(matches.length, 3)
    }
  }
  
  // Check for review triggers
  for (const { section, patterns } of REVIEW_TRIGGER_SECTIONS) {
    for (const pattern of patterns) {
      if (pattern.test(output)) {
        flaggedSections.push({
          section,
          reason: `Contains ${section} content that may need review`,
          severity: 'review',
        })
        score -= 0.05
        break
      }
    }
  }
  
  // Check output length - too short or too long reduces confidence
  if (output.length < 100) {
    score -= 0.1
    reasoning.push('Output unusually short')
  } else if (output.length > 2000) {
    score -= 0.05
    reasoning.push('Output unusually long')
  }
  
  // Check for placeholders that weren't filled
  const placeholders = output.match(/\[[^\]]+\]/g)
  if (placeholders && placeholders.length > 0) {
    const unfilled = placeholders.filter(p => 
      !p.includes('Option') && !p.includes('Button')
    )
    if (unfilled.length > 0) {
      score -= 0.1 * unfilled.length
      flaggedSections.push({
        section: 'placeholders',
        reason: `${unfilled.length} unfilled placeholder(s) detected`,
        severity: 'warning',
      })
    }
  }
  
  // Validate against input data if provided
  if (inputData) {
    const inputValidation = validateAgainstInput(output, inputData)
    score += inputValidation.adjustment
    reasoning.push(...inputValidation.reasons)
    flaggedSections.push(...inputValidation.flags)
  }
  
  // Normalize score
  score = Math.max(0, Math.min(1, score))
  
  // Determine level
  const level = score >= 0.8 ? 'high' : score >= 0.6 ? 'medium' : 'low'
  
  return {
    score: Math.round(score * 100) / 100,
    level,
    flaggedSections,
    reasoning,
  }
}

/**
 * Validate AI output against input data
 */
function validateAgainstInput(
  output: string,
  inputData: Record<string, unknown>
): { adjustment: number; reasons: string[]; flags: FlaggedSection[] } {
  let adjustment = 0
  const reasons: string[] = []
  const flags: FlaggedSection[] = []
  
  // Check if patient name appears in output when provided
  if (inputData.patientName && typeof inputData.patientName === 'string') {
    if (!output.toLowerCase().includes(inputData.patientName.toLowerCase())) {
      adjustment -= 0.1
      flags.push({
        section: 'patient_name',
        reason: 'Patient name may not be correctly included',
        severity: 'warning',
      })
    } else {
      adjustment += 0.05
    }
  }
  
  // Check if dates appear in output when provided
  if (inputData.startDate && typeof inputData.startDate === 'string') {
    if (!output.includes(inputData.startDate)) {
      adjustment -= 0.05
      reasons.push('Start date not found in output')
    }
  }
  
  // Check if symptoms mentioned
  if (inputData.symptoms && Array.isArray(inputData.symptoms)) {
    const symptomsFound = inputData.symptoms.filter(s => 
      output.toLowerCase().includes(String(s).toLowerCase())
    )
    if (symptomsFound.length < inputData.symptoms.length / 2) {
      adjustment -= 0.05
      reasons.push('Not all symptoms reflected in output')
    }
  }
  
  return { adjustment, reasons, flags }
}

/**
 * Get confidence badge for display
 */
export function getConfidenceBadge(score: number): {
  label: string
  color: 'green' | 'yellow' | 'red'
  description: string
} {
  if (score >= 0.8) {
    return {
      label: 'High Confidence',
      color: 'green',
      description: 'AI output appears well-formed and complete',
    }
  } else if (score >= 0.6) {
    return {
      label: 'Review Suggested',
      color: 'yellow',
      description: 'Some sections may benefit from review',
    }
  } else {
    return {
      label: 'Careful Review',
      color: 'red',
      description: 'Output requires thorough clinician review',
    }
  }
}
