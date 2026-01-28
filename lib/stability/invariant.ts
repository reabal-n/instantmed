/**
 * Invariant Assertions
 * 
 * Runtime checks that throw immediately if violated.
 * Use for impossible states that indicate bugs.
 */

export class InvariantError extends Error {
  constructor(message: string) {
    super(`Invariant violation: ${message}`)
    this.name = "InvariantError"
  }
}

/**
 * Assert that a condition is true. Throws if false.
 * 
 * @example
 * invariant(user.role === "doctor", "Only doctors can approve intakes")
 */
export function invariant(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new InvariantError(message)
  }
}

/**
 * Assert that a value is not null or undefined.
 * 
 * @example
 * const user = assertDefined(await getUser(id), `User ${id} not found`)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string
): T {
  if (value === null || value === undefined) {
    throw new InvariantError(message)
  }
  return value
}

/**
 * Assert that code path is unreachable.
 * TypeScript will error if this is reachable.
 * 
 * @example
 * switch (status) {
 *   case "pending": return handlePending()
 *   case "approved": return handleApproved()
 *   default: assertNever(status)
 * }
 */
export function assertNever(value: never, message?: string): never {
  throw new InvariantError(
    message ?? `Unexpected value: ${JSON.stringify(value)}`
  )
}

/**
 * Assert array is not empty.
 */
export function assertNonEmpty<T>(
  array: T[],
  message: string
): asserts array is [T, ...T[]] {
  if (array.length === 0) {
    throw new InvariantError(message)
  }
}

/**
 * Assert value is a valid enum member.
 */
export function assertEnum<T extends Record<string, string>>(
  value: string,
  enumObject: T,
  message?: string
): asserts value is T[keyof T] {
  const values = Object.values(enumObject)
  if (!values.includes(value)) {
    throw new InvariantError(
      message ?? `Invalid enum value: ${value}. Expected one of: ${values.join(", ")}`
    )
  }
}
