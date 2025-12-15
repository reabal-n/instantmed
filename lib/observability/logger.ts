import "server-only"

/**
 * Structured logging utility for backend observability.
 * All logs are JSON-formatted for easy parsing in production (Vercel, etc.)
 * 
 * Log levels:
 * - debug: Verbose information for development
 * - info: Normal operational information
 * - warn: Something unexpected but handled
 * - error: Something failed that needs attention
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogContext {
  // Request identification
  requestId?: string
  sessionId?: string
  userId?: string
  profileId?: string
  
  // Operation context
  action?: string
  module?: string
  
  // Additional data
  [key: string]: unknown
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  duration?: number
}

/**
 * Format error for logging (extracts useful info)
 */
function formatError(error: unknown): LogEntry["error"] | undefined {
  if (!error) return undefined
  
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      code: (error as Error & { code?: string }).code,
    }
  }
  
  if (typeof error === "string") {
    return {
      name: "Error",
      message: error,
    }
  }
  
  return {
    name: "UnknownError",
    message: JSON.stringify(error),
  }
}

/**
 * Create a log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: context ? { ...context } : undefined,
    error: formatError(error),
  }
}

/**
 * Output log to console in structured format
 */
function outputLog(entry: LogEntry): void {
  // In production, output as JSON for log aggregators
  if (process.env.NODE_ENV === "production") {
    const logFn = entry.level === "error" ? console.error :
                  entry.level === "warn" ? console.warn :
                  entry.level === "debug" ? console.debug :
                  console.log
    
    logFn(JSON.stringify(entry))
  } else {
    // In development, use readable format
    const prefix = `[${entry.level.toUpperCase()}] [${entry.context?.module || "app"}]`
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : ""
    
    if (entry.level === "error") {
      console.error(`${prefix} ${entry.message}${contextStr}`, entry.error || "")
    } else if (entry.level === "warn") {
      console.warn(`${prefix} ${entry.message}${contextStr}`)
    } else if (entry.level === "debug") {
      console.debug(`${prefix} ${entry.message}${contextStr}`)
    } else {
      console.log(`${prefix} ${entry.message}${contextStr}`)
    }
  }
}

/**
 * Main logger class
 */
class Logger {
  private defaultContext: LogContext

  constructor(defaultContext: LogContext = {}) {
    this.defaultContext = defaultContext
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger({ ...this.defaultContext, ...context })
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === "production") return // Skip debug in prod
    outputLog(createLogEntry("debug", message, { ...this.defaultContext, ...context }))
  }

  info(message: string, context?: LogContext): void {
    outputLog(createLogEntry("info", message, { ...this.defaultContext, ...context }))
  }

  warn(message: string, context?: LogContext, error?: unknown): void {
    outputLog(createLogEntry("warn", message, { ...this.defaultContext, ...context }, error))
  }

  error(message: string, context?: LogContext, error?: unknown): void {
    outputLog(createLogEntry("error", message, { ...this.defaultContext, ...context }, error))
  }

  /**
   * Log the start of an operation (returns a function to log completion)
   */
  startOperation(operation: string, context?: LogContext): (success: boolean, error?: unknown) => void {
    const startTime = Date.now()
    const fullContext = { ...this.defaultContext, ...context, action: operation }
    
    this.info(`Starting: ${operation}`, fullContext)
    
    return (success: boolean, error?: unknown) => {
      const duration = Date.now() - startTime
      
      if (success) {
        this.info(`Completed: ${operation}`, { ...fullContext, duration })
      } else {
        this.error(`Failed: ${operation}`, { ...fullContext, duration }, error)
      }
    }
  }
}

// Export singleton instance
export const logger = new Logger({ module: "backend" })

// Export factory for module-specific loggers
export function createLogger(module: string, context?: LogContext): Logger {
  return new Logger({ module, ...context })
}

// ============================================
// CONVENIENCE WRAPPERS FOR SERVER ACTIONS
// ============================================

/**
 * Wrap a server action with automatic error logging
 */
export function withLogging<T extends unknown[], R>(
  actionName: string,
  action: (...args: T) => Promise<R>,
  options?: { module?: string }
): (...args: T) => Promise<R> {
  const log = createLogger(options?.module || "action")
  
  return async (...args: T): Promise<R> => {
    const complete = log.startOperation(actionName)
    
    try {
      const result = await action(...args)
      complete(true)
      return result
    } catch (error) {
      complete(false, error)
      throw error
    }
  }
}

/**
 * Log a server action error with context
 */
export function logActionError(
  actionName: string,
  error: unknown,
  context?: LogContext
): void {
  const log = createLogger("action")
  log.error(`Action failed: ${actionName}`, context, error)
}

/**
 * Log a webhook event
 */
export function logWebhook(
  eventType: string,
  eventId: string,
  context?: LogContext & { success?: boolean; error?: unknown }
): void {
  const log = createLogger("webhook")
  const { success, error, ...rest } = context || {}
  
  if (success === false) {
    log.error(`Webhook failed: ${eventType}`, { eventId, ...rest }, error)
  } else if (success === true) {
    log.info(`Webhook processed: ${eventType}`, { eventId, ...rest })
  } else {
    log.info(`Webhook received: ${eventType}`, { eventId, ...rest })
  }
}

/**
 * Log a database operation error
 */
export function logDbError(
  operation: string,
  table: string,
  error: unknown,
  context?: LogContext
): void {
  const log = createLogger("database")
  log.error(`DB ${operation} failed on ${table}`, context, error)
}

/**
 * Log an external API call
 */
export function logExternalApi(
  service: string,
  endpoint: string,
  context?: LogContext & { success?: boolean; statusCode?: number; error?: unknown }
): void {
  const log = createLogger("external-api")
  const { success, statusCode, error, ...rest } = context || {}
  
  if (success === false) {
    log.error(`API call failed: ${service}/${endpoint}`, { statusCode, ...rest }, error)
  } else {
    log.info(`API call: ${service}/${endpoint}`, { statusCode, ...rest })
  }
}
