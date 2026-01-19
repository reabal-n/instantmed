/**
 * Bot Detection System
 * 
 * ADVERSARIAL_SECURITY_AUDIT EXPLOIT RL-3: Prevents automated submissions
 * 
 * Implements multiple signals:
 * - Honeypot fields (hidden fields bots fill)
 * - Timing analysis (real humans have variable typing speed)
 * - Interaction tracking (mouse movement, key patterns)
 */

export interface BotDetectionResult {
  isBot: boolean
  confidence: number // 0-100
  signals: BotSignal[]
}

export interface BotSignal {
  type: "honeypot" | "timing" | "interaction" | "pattern"
  triggered: boolean
  details: string
}

/**
 * Honeypot field names - these should be hidden with CSS
 * Bots will fill them, humans won't see them
 */
export const HONEYPOT_FIELDS = {
  // Looks like a real field but is hidden
  email_confirm: "email_confirm",
  phone_verify: "phone_verify", 
  address_2: "address_line_2",
  website: "website_url",
  fax: "fax_number",
}

/**
 * Check honeypot fields for bot activity
 */
export function checkHoneypotFields(
  formData: Record<string, unknown>
): BotSignal {
  const honeypotValues = Object.values(HONEYPOT_FIELDS)
  
  for (const field of honeypotValues) {
    const value = formData[field]
    if (value && String(value).trim().length > 0) {
      return {
        type: "honeypot",
        triggered: true,
        details: `Honeypot field '${field}' was filled`,
      }
    }
  }
  
  return {
    type: "honeypot",
    triggered: false,
    details: "No honeypot fields filled",
  }
}

/**
 * Analyze form completion timing
 * Real humans take variable time, bots are consistent
 */
export function checkFormTiming(
  startTime: Date,
  endTime: Date,
  fieldCount: number
): BotSignal {
  const durationMs = endTime.getTime() - startTime.getTime()
  const durationSeconds = durationMs / 1000
  
  // Less than 2 seconds per field is suspicious
  const secondsPerField = durationSeconds / Math.max(fieldCount, 1)
  
  if (secondsPerField < 2) {
    return {
      type: "timing",
      triggered: true,
      details: `Form completed too quickly: ${secondsPerField.toFixed(1)}s per field`,
    }
  }
  
  // Exactly round number timing is suspicious (bot with fixed delay)
  if (durationSeconds % 5 === 0 && durationSeconds > 10) {
    return {
      type: "timing",
      triggered: true,
      details: `Suspiciously round completion time: exactly ${durationSeconds}s`,
    }
  }
  
  return {
    type: "timing",
    triggered: false,
    details: `Normal completion time: ${durationSeconds}s`,
  }
}

/**
 * Check interaction patterns from client-side tracking
 */
export function checkInteractionPatterns(
  interactions: {
    mouseMovements?: number
    keystrokes?: number
    scrollEvents?: number
    focusChanges?: number
  }
): BotSignal {
  const { mouseMovements = 0, keystrokes = 0, scrollEvents = 0, focusChanges = 0 } = interactions
  
  // No mouse movement at all is suspicious
  if (mouseMovements === 0 && keystrokes > 10) {
    return {
      type: "interaction",
      triggered: true,
      details: "No mouse movement detected during form completion",
    }
  }
  
  // Keyboard-only with no scrolling on long form is suspicious
  if (scrollEvents === 0 && keystrokes > 50) {
    return {
      type: "interaction",
      triggered: true,
      details: "Long form completed without scrolling",
    }
  }
  
  // No focus changes suggests automated tab through
  if (focusChanges === 0 && keystrokes > 20) {
    return {
      type: "interaction",
      triggered: true,
      details: "No field focus changes detected",
    }
  }
  
  return {
    type: "interaction",
    triggered: false,
    details: "Normal interaction patterns",
  }
}

/**
 * Check for automated submission patterns
 */
export function checkSubmissionPatterns(
  userAgent: string,
  acceptLanguage: string,
  acceptEncoding: string
): BotSignal {
  // Check for common bot user agents
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /headless/i, /phantom/i, /selenium/i, /puppeteer/i,
    /curl/i, /wget/i, /python-requests/i, /axios/i,
  ]
  
  for (const pattern of botPatterns) {
    if (pattern.test(userAgent)) {
      return {
        type: "pattern",
        triggered: true,
        details: `Bot user agent detected: ${userAgent.substring(0, 50)}`,
      }
    }
  }
  
  // Missing standard headers is suspicious
  if (!acceptLanguage || !acceptEncoding) {
    return {
      type: "pattern",
      triggered: true,
      details: "Missing standard browser headers",
    }
  }
  
  return {
    type: "pattern",
    triggered: false,
    details: "Normal browser patterns",
  }
}

/**
 * Run all bot detection checks
 */
export function runBotDetection(params: {
  formData: Record<string, unknown>
  startTime: Date
  endTime: Date
  fieldCount: number
  interactions?: {
    mouseMovements?: number
    keystrokes?: number
    scrollEvents?: number
    focusChanges?: number
  }
  userAgent?: string
  acceptLanguage?: string
  acceptEncoding?: string
}): BotDetectionResult {
  const signals: BotSignal[] = []
  
  // Check honeypot
  signals.push(checkHoneypotFields(params.formData))
  
  // Check timing
  signals.push(checkFormTiming(params.startTime, params.endTime, params.fieldCount))
  
  // Check interactions if provided
  if (params.interactions) {
    signals.push(checkInteractionPatterns(params.interactions))
  }
  
  // Check submission patterns if headers provided
  if (params.userAgent) {
    signals.push(checkSubmissionPatterns(
      params.userAgent,
      params.acceptLanguage || "",
      params.acceptEncoding || ""
    ))
  }
  
  // Calculate confidence
  const triggeredCount = signals.filter(s => s.triggered).length
  const totalChecks = signals.length
  const confidence = Math.round((triggeredCount / totalChecks) * 100)
  
  // Is bot if 2+ signals triggered or honeypot specifically triggered
  const honeypotTriggered = signals.find(s => s.type === "honeypot")?.triggered
  const isBot = honeypotTriggered || triggeredCount >= 2
  
  return {
    isBot,
    confidence,
    signals,
  }
}

/**
 * Generate honeypot field CSS
 * Use this in your form stylesheets
 */
export const HONEYPOT_CSS = `
/* Honeypot fields - hide from humans, visible to bots */
.hp-field {
  position: absolute;
  left: -9999px;
  opacity: 0;
  height: 0;
  width: 0;
  overflow: hidden;
  pointer-events: none;
  /* Use tabindex=-1 on the input to prevent focus */
}

/* Alternative: clip-based hiding */
.hp-field-alt {
  position: absolute;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  height: 1px;
  width: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  border: 0;
}
`
