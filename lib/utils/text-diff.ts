/**
 * Lightweight text diff utility
 * 
 * Simple line-by-line diff for comparing clinical note edits.
 * No external dependencies - pure JavaScript implementation.
 */

// =============================================================================
// PERFORMANCE THRESHOLDS
// =============================================================================

/**
 * Maximum combined line count for safe LCS diff computation
 * LCS has O(m*n) complexity - beyond this threshold, diff is too expensive
 */
export const DIFF_MAX_LINES = 8000

/**
 * Maximum combined character count for safe diff computation
 * Prevents memory issues with very long content
 */
export const DIFF_MAX_CHARS = 200_000

/**
 * Check if content exceeds safe diff thresholds
 */
export function isDiffTooLarge(original: string, modified: string): {
  tooLarge: boolean
  reason?: string
  stats: { totalLines: number; totalChars: number }
} {
  const originalLines = original.split('\n').length
  const modifiedLines = modified.split('\n').length
  const totalLines = originalLines + modifiedLines
  const totalChars = original.length + modified.length

  if (totalLines > DIFF_MAX_LINES) {
    return {
      tooLarge: true,
      reason: `Combined content has ${totalLines.toLocaleString()} lines (limit: ${DIFF_MAX_LINES.toLocaleString()})`,
      stats: { totalLines, totalChars },
    }
  }

  if (totalChars > DIFF_MAX_CHARS) {
    return {
      tooLarge: true,
      reason: `Combined content has ${totalChars.toLocaleString()} characters (limit: ${DIFF_MAX_CHARS.toLocaleString()})`,
      stats: { totalLines, totalChars },
    }
  }

  return {
    tooLarge: false,
    stats: { totalLines, totalChars },
  }
}

// =============================================================================
// TYPES
// =============================================================================

export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed'
  content: string
  lineNumber?: number
}

export interface DiffResult {
  lines: DiffLine[]
  hasChanges: boolean
  addedCount: number
  removedCount: number
}

/**
 * Compute line-by-line diff between two strings
 * Uses a simple LCS (Longest Common Subsequence) approach
 */
export function computeLineDiff(original: string, modified: string): DiffResult {
  const originalLines = original.split('\n')
  const modifiedLines = modified.split('\n')
  
  // Build LCS table
  const m = originalLines.length
  const n = modifiedLines.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (originalLines[i - 1] === modifiedLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  
  // Backtrack to find diff
  const lines: DiffLine[] = []
  let i = m
  let j = n
  const stack: DiffLine[] = []
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalLines[i - 1] === modifiedLines[j - 1]) {
      stack.push({ type: 'unchanged', content: originalLines[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'added', content: modifiedLines[j - 1] })
      j--
    } else {
      stack.push({ type: 'removed', content: originalLines[i - 1] })
      i--
    }
  }
  
  // Reverse to get correct order
  while (stack.length > 0) {
    lines.push(stack.pop()!)
  }
  
  const addedCount = lines.filter(l => l.type === 'added').length
  const removedCount = lines.filter(l => l.type === 'removed').length
  
  return {
    lines,
    hasChanges: addedCount > 0 || removedCount > 0,
    addedCount,
    removedCount,
  }
}

/**
 * Format JSON content as readable text for diffing
 * Specifically handles clinical note structure
 */
export function formatContentForDiff(content: Record<string, unknown>): string {
  const sections: string[] = []
  
  // Clinical note fields in display order
  const fieldOrder = [
    { key: 'presentingComplaint', label: 'Presenting Complaint' },
    { key: 'historyOfPresentIllness', label: 'History of Present Illness' },
    { key: 'relevantInformation', label: 'Relevant Information' },
    { key: 'certificateDetails', label: 'Certificate Details' },
  ]
  
  for (const { key, label } of fieldOrder) {
    const value = content[key]
    if (value && typeof value === 'string' && value.trim()) {
      sections.push(`${label}:\n${value}`)
    }
  }
  
  // Handle any other string fields not in the standard order
  for (const [key, value] of Object.entries(content)) {
    if (
      !fieldOrder.some(f => f.key === key) &&
      !key.startsWith('_') &&
      key !== 'flags' &&
      typeof value === 'string' &&
      value.trim()
    ) {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
      sections.push(`${label}:\n${value}`)
    }
  }
  
  return sections.join('\n\n')
}
