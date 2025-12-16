/**
 * HTML Sanitization Utility
 * 
 * Sanitizes HTML content to prevent XSS attacks while preserving
 * safe formatting tags for content display.
 */

// Tags that are allowed (whitelist approach)
const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'mark',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'span', 'div',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'figure', 'figcaption',
  'hr',
])

// Attributes that are allowed per tag
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  '*': new Set(['class', 'id']), // Allowed on all tags
}

// Protocols allowed in href/src attributes
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/**
 * Check if a URL is safe
 */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, 'https://example.com')
    return ALLOWED_PROTOCOLS.has(parsed.protocol)
  } catch {
    // Relative URLs are okay
    return !url.includes(':') || url.startsWith('/')
  }
}

/**
 * Escape HTML entities
 */
export function escapeHtml(str: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return str.replace(/[&<>"']/g, (char) => entities[char] || char)
}

/**
 * Sanitize an attribute value
 */
function sanitizeAttribute(tag: string, attr: string, value: string): string | null {
  const allowedForTag = ALLOWED_ATTRIBUTES[tag] || new Set()
  const allowedGlobal = ALLOWED_ATTRIBUTES['*']
  
  if (!allowedForTag.has(attr) && !allowedGlobal.has(attr)) {
    return null
  }
  
  // Check URL safety for href and src
  if ((attr === 'href' || attr === 'src') && !isSafeUrl(value)) {
    return null
  }
  
  // Force external links to have safe attributes
  if (attr === 'href' && (value.startsWith('http://') || value.startsWith('https://'))) {
    return value
  }
  
  // Remove javascript: URLs and data: URLs (except for images)
  if (value.toLowerCase().includes('javascript:')) {
    return null
  }
  
  if (attr !== 'src' && value.toLowerCase().includes('data:')) {
    return null
  }
  
  return escapeHtml(value)
}

/**
 * Simple HTML sanitizer using regex (for basic cases)
 * For production, consider using DOMPurify on the client
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // Remove style tags and their content
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  
  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '')
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '')
  
  // Remove data: URLs in href attributes (keep in src for images)
  sanitized = sanitized.replace(/href\s*=\s*["']?\s*data:/gi, 'href="')
  
  // Process tags
  sanitized = sanitized.replace(/<(\/?)([\w-]+)([^>]*)>/g, (match, slash, tag, attrs) => {
    const lowerTag = tag.toLowerCase()
    
    // Remove disallowed tags entirely
    if (!ALLOWED_TAGS.has(lowerTag)) {
      return ''
    }
    
    // For closing tags, just return the tag
    if (slash) {
      return `</${lowerTag}>`
    }
    
    // Process attributes
    const cleanAttrs: string[] = []
    const attrRegex = /(\w+)\s*=\s*["']([^"']*)["']/g
    let attrMatch
    
    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      const [, attrName, attrValue] = attrMatch
      const sanitizedValue = sanitizeAttribute(lowerTag, attrName.toLowerCase(), attrValue)
      if (sanitizedValue !== null) {
        cleanAttrs.push(`${attrName.toLowerCase()}="${sanitizedValue}"`)
      }
    }
    
    // Add rel="noopener noreferrer" to external links
    if (lowerTag === 'a' && cleanAttrs.some(a => a.includes('href="http'))) {
      if (!cleanAttrs.some(a => a.startsWith('rel='))) {
        cleanAttrs.push('rel="noopener noreferrer"')
      }
      if (!cleanAttrs.some(a => a.startsWith('target='))) {
        cleanAttrs.push('target="_blank"')
      }
    }
    
    const attrsStr = cleanAttrs.length > 0 ? ' ' + cleanAttrs.join(' ') : ''
    return `<${lowerTag}${attrsStr}>`
  })
  
  return sanitized.trim()
}

/**
 * Strip all HTML tags, keeping only text content
 */
export function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

/**
 * Truncate HTML content while preserving tag structure
 */
export function truncateHtml(html: string, maxLength: number, suffix = '...'): string {
  const stripped = stripHtml(html)
  if (stripped.length <= maxLength) return html
  
  const truncated = stripped.slice(0, maxLength - suffix.length) + suffix
  return escapeHtml(truncated)
}
