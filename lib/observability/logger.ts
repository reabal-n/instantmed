/* eslint-disable no-console */
/**
 * Centralized Logging Service
 * 
 * Provides structured logging with:
 * - Log levels (debug, info, warn, error)
 * - Automatic context enrichment
 * - Production-safe (no sensitive data)
 * - Error tracking integration ready
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Minimum log level based on environment
const MIN_LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL]
}

// Allow disabling sanitization in development for debugging (set LOG_SANITIZE_DEV=false)
const SANITIZE_IN_DEV = process.env.LOG_SANITIZE_DEV !== 'false'

function sanitizeContext(context: LogContext): LogContext {
  // Skip sanitization in development when explicitly disabled
  if (process.env.NODE_ENV === 'development' && !SANITIZE_IN_DEV) {
    return context
  }
  
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'auth', 
    'medicare', 'credit', 'card', 'ssn', 'dob',
    'address', 'street', 'postcode', 'suburb',
    'phone', 'mobile', 'email',
    'full_name', 'fullName', 'firstName', 'lastName',
    'dateOfBirth', 'date_of_birth'
  ]
  
  const sanitized: LogContext = {}
  
  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk))
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeContext(value as LogContext)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

function formatLogEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    // JSON format for production (better for log aggregators)
    return JSON.stringify(entry)
  }
  
  // Human-readable format for development
  const { timestamp, level, message, context, error } = entry
  const contextStr = context ? ` ${JSON.stringify(context)}` : ''
  const errorStr = error ? ` | Error: ${error.message}` : ''
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}${errorStr}`
}

function createLogEntry(
  level: LogLevel, 
  message: string, 
  context?: LogContext,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  }
  
  if (context) {
    entry.context = sanitizeContext(context)
  }
  
  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }
  }
  
  return entry
}

function log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
  if (!shouldLog(level)) return
  
  const entry = createLogEntry(level, message, context, error)
  const formatted = formatLogEntry(entry)
  
  switch (level) {
    case 'debug':
      console.debug(formatted)
      break
    case 'info':
      console.info(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      // Send to Sentry in production
      if (process.env.NODE_ENV === 'production' && error) {
        try {
          // Dynamic import to avoid bundling issues
          import('@sentry/nextjs').then((Sentry) => {
            Sentry.captureException(error, {
              extra: entry.context,
              tags: { source: 'logger' },
            })
          }).catch(() => {
            // Sentry not available - silently ignore
          })
        } catch {
          // Ignore Sentry errors
        }
      }
      break
  }
}

/**
 * Logger instance with convenience methods
 */
export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext, error?: Error) => log('warn', message, context, error),
  error: (message: string, context?: LogContext, error?: Error) => log('error', message, context, error),
  
  /**
   * Log an error with full context
   */
  captureError: (error: Error, context?: LogContext) => {
    log('error', error.message, {
      ...context,
      errorName: error.name,
    }, error)
  },
  
  /**
   * Create a child logger with preset context
   */
  child: (baseContext: LogContext) => ({
    debug: (message: string, context?: LogContext) => 
      log('debug', message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) => 
      log('info', message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext, error?: Error) => 
      log('warn', message, { ...baseContext, ...context }, error),
    error: (message: string, context?: LogContext, error?: Error) => 
      log('error', message, { ...baseContext, ...context }, error),
  }),
}

/**
 * Create a named logger with module context
 */
export function createLogger(module: string, baseContext?: LogContext) {
  return {
    debug: (message: string, context?: LogContext) => 
      log('debug', `[${module}] ${message}`, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) => 
      log('info', `[${module}] ${message}`, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext, error?: unknown) => 
      log('warn', `[${module}] ${message}`, { ...baseContext, ...context }, error instanceof Error ? error : undefined),
    error: (message: string, context?: LogContext, error?: unknown) => 
      log('error', `[${module}] ${message}`, { ...baseContext, ...context }, error instanceof Error ? error : undefined),
  }
}

// No-op logger for silencing logs in specific contexts
export const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  captureError: () => {},
  child: () => silentLogger,
}

// Re-export for convenience
export type { LogContext, LogLevel }
