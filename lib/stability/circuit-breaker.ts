/**
 * Circuit Breaker Pattern
 * 
 * Prevents cascading failures by stopping requests to failing services.
 * States: CLOSED (normal) -> OPEN (failing) -> HALF_OPEN (testing)
 */

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN"

interface CircuitBreakerOptions {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number
  /** Time in ms before trying again (default: 30000) */
  resetTimeout?: number
  /** Number of successful calls to close circuit (default: 2) */
  successThreshold?: number
  /** Called when circuit opens */
  onOpen?: () => void
  /** Called when circuit closes */
  onClose?: () => void
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED"
  private failures = 0
  private successes = 0
  private lastFailureTime = 0
  private readonly options: Required<Omit<CircuitBreakerOptions, "onOpen" | "onClose">> & 
    Pick<CircuitBreakerOptions, "onOpen" | "onClose">

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeout: options.resetTimeout ?? 30000,
      successThreshold: options.successThreshold ?? 2,
      onOpen: options.onOpen,
      onClose: options.onClose,
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
        this.state = "HALF_OPEN"
        this.successes = 0
      } else {
        throw new CircuitOpenError("Circuit breaker is open")
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.successes++
      if (this.successes >= this.options.successThreshold) {
        this.close()
      }
    } else {
      this.failures = 0
    }
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.options.failureThreshold) {
      this.open()
    }
  }

  private open(): void {
    this.state = "OPEN"
    this.options.onOpen?.()
  }

  private close(): void {
    this.state = "CLOSED"
    this.failures = 0
    this.successes = 0
    this.options.onClose?.()
  }

  getState(): CircuitState {
    return this.state
  }

  isOpen(): boolean {
    return this.state === "OPEN"
  }

  reset(): void {
    this.close()
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CircuitOpenError"
  }
}

/**
 * Pre-configured circuit breakers for common services
 */
export const circuitBreakers = {
  stripe: new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
  
  email: new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000,
  }),
  
  pdf: new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 45000,
  }),
}
