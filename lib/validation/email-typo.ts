/**
 * Email Typo Detection
 * 
 * Detects common email typos and suggests corrections.
 * Based on PATIENT_JOURNEY_SIMULATION.md findings where email typos
 * like "gmial.com" caused abandonment.
 */

const COMMON_TYPOS: Record<string, string> = {
  // Gmail typos
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.comm': 'gmail.com',
  'g]mail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  
  // Hotmail typos
  'hotmal.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotamil.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  
  // Outlook typos
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outlool.com': 'outlook.com',
  'outloook.com': 'outlook.com',
  
  // Yahoo typos
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahho.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'yaoo.com': 'yahoo.com',
  
  // iCloud typos
  'iclould.com': 'icloud.com',
  'icoud.com': 'icloud.com',
  'icloud.con': 'icloud.com',
  'iclooud.com': 'icloud.com',
  
  // Common Australian domains
  'bigpond.con': 'bigpond.com',
  'bigpond.comm': 'bigpond.com',
  'optusnet.con': 'optusnet.com.au',
  'optusnet.com': 'optusnet.com.au',
}

// Common TLD typos
const TLD_TYPOS: Record<string, string> = {
  '.con': '.com',
  '.cpm': '.com',
  '.vom': '.com',
  '.comm': '.com',
  '.co': '.com', // Only if not .com.au
  '.om': '.com',
  '.cm': '.com',
  '.ocm': '.com',
}

export interface EmailTypoResult {
  hasTypo: boolean
  original: string
  suggested: string | null
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Detect common email typos and suggest corrections
 */
export function detectEmailTypo(email: string): EmailTypoResult {
  const trimmedEmail = email.trim().toLowerCase()
  
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { hasTypo: false, original: email, suggested: null, confidence: 'low' }
  }
  
  const [localPart, domain] = trimmedEmail.split('@')
  
  if (!domain) {
    return { hasTypo: false, original: email, suggested: null, confidence: 'low' }
  }
  
  // Check for exact domain typo matches (high confidence)
  if (COMMON_TYPOS[domain]) {
    return {
      hasTypo: true,
      original: email,
      suggested: `${localPart}@${COMMON_TYPOS[domain]}`,
      confidence: 'high',
    }
  }
  
  // Check for TLD typos (medium confidence)
  for (const [typo, correction] of Object.entries(TLD_TYPOS)) {
    if (domain.endsWith(typo) && !domain.endsWith('.com.au')) {
      const correctedDomain = domain.slice(0, -typo.length) + correction
      return {
        hasTypo: true,
        original: email,
        suggested: `${localPart}@${correctedDomain}`,
        confidence: 'medium',
      }
    }
  }
  
  // Check for missing TLD
  if (!domain.includes('.')) {
    // Common domains without TLD
    const domainGuesses: Record<string, string> = {
      'gmail': 'gmail.com',
      'hotmail': 'hotmail.com',
      'outlook': 'outlook.com',
      'yahoo': 'yahoo.com',
      'icloud': 'icloud.com',
    }
    
    if (domainGuesses[domain]) {
      return {
        hasTypo: true,
        original: email,
        suggested: `${localPart}@${domainGuesses[domain]}`,
        confidence: 'medium',
      }
    }
  }
  
  return { hasTypo: false, original: email, suggested: null, confidence: 'low' }
}

/**
 * Get a user-friendly message for email typo suggestion
 */
export function getEmailTypoMessage(result: EmailTypoResult): string | null {
  if (!result.hasTypo || !result.suggested) {
    return null
  }
  
  return `Did you mean ${result.suggested}?`
}
