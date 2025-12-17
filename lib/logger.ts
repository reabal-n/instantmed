/**
 * Centralized logging utility with environment-based filtering.
 * - In development: All logs are shown
 * - In production: Only warnings and errors are shown (no debug/info)
 * 
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.debug('Debug message', { data })
 *   logger.info('Info message')
 *   logger.warn('Warning message')
 *   logger.error('Error message', error)
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  [key: string]: unknown
}

const isDev = process.env.NODE_ENV === "development"
const isServer = typeof window === "undefined"

// Color codes for terminal (server-side only)
const colors = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
  reset: "\x1b[0m",
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`
  
  if (context && Object.keys(context).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(context)}`
  }
  return `${prefix} ${message}`
}

function shouldLog(level: LogLevel): boolean {
  // In development, log everything
  if (isDev) return true
  
  // In production, only log warnings and errors
  return level === "warn" || level === "error"
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return

  const formattedMessage = formatMessage(level, message, context)
  
  // Use colors on server, plain text on client
  if (isServer) {
    const color = colors[level]
    const coloredMessage = `${color}${formattedMessage}${colors.reset}`
    
    switch (level) {
      case "debug":
      case "info":
        console.log(coloredMessage)
        break
      case "warn":
        console.warn(coloredMessage)
        break
      case "error":
        console.error(coloredMessage)
        break
    }
  } else {
    // Browser console
    switch (level) {
      case "debug":
        console.debug(formattedMessage)
        break
      case "info":
        console.info(formattedMessage)
        break
      case "warn":
        console.warn(formattedMessage)
        break
      case "error":
        console.error(formattedMessage)
        break
    }
  }
}

export const logger = {
  /**
   * Debug-level logging - only shown in development
   */
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  
  /**
   * Info-level logging - only shown in development
   */
  info: (message: string, context?: LogContext) => log("info", message, context),
  
  /**
   * Warning-level logging - shown in all environments
   */
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  
  /**
   * Error-level logging - shown in all environments
   */
  error: (message: string, context?: LogContext) => log("error", message, context),
}

// Export a no-op logger for use in production client-side code
// where you want to completely silence logs
export const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}
