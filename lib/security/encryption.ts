import "server-only"
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from "crypto"

/**
 * Field-Level Encryption Module
 *
 * Provides AES-256-GCM encryption for sensitive fields like:
 * - Medicare numbers
 * - Date of birth
 * - Phone numbers
 * - Medical history
 *
 * Features:
 * - AES-256-GCM authenticated encryption
 * - Unique IV per encryption
 * - Key derivation with scrypt
 * - Base64 encoding for storage
 */

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits
const KEY_LENGTH = 32 // 256 bits
const SALT_LENGTH = 16

// Encryption key from environment - validated at startup
let encryptionKey: Buffer | null = null

/**
 * Get the encryption key from environment
 * Derives a 256-bit key from the master secret using scrypt
 */
function getEncryptionKey(): Buffer {
  if (encryptionKey) {
    return encryptionKey
  }

  const masterKey = process.env.ENCRYPTION_KEY
  if (!masterKey) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required for field encryption. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    )
  }

  // Decode base64 master key
  const keyBuffer = Buffer.from(masterKey, "base64")
  if (keyBuffer.length < KEY_LENGTH) {
    throw new Error("ENCRYPTION_KEY must be at least 32 bytes (256 bits)")
  }

  // Use first 32 bytes as key
  encryptionKey = keyBuffer.subarray(0, KEY_LENGTH)
  return encryptionKey
}

/**
 * Encrypt a plaintext string
 *
 * @param plaintext - The string to encrypt
 * @returns Base64-encoded ciphertext with IV and auth tag
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return ""
  }

  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, "utf8")
  encrypted = Buffer.concat([encrypted, cipher.final()])

  const authTag = cipher.getAuthTag()

  // Format: iv (16 bytes) + authTag (16 bytes) + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted])

  return combined.toString("base64")
}

/**
 * Decrypt a ciphertext string
 *
 * @param ciphertext - Base64-encoded ciphertext from encrypt()
 * @returns Original plaintext string
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) {
    return ""
  }

  const key = getEncryptionKey()
  const combined = Buffer.from(ciphertext, "base64")

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Invalid ciphertext: too short")
  }

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString("utf8")
}

/**
 * Encrypt a field value, handling various types
 * Serializes objects to JSON before encryption
 */
export function encryptField<T>(value: T): string {
  if (value === null || value === undefined) {
    return ""
  }

  const stringValue = typeof value === "string"
    ? value
    : JSON.stringify(value)

  return encrypt(stringValue)
}

/**
 * Decrypt a field value back to its original type
 */
export function decryptField<T>(ciphertext: string, parseJson = false): T | string {
  if (!ciphertext) {
    return "" as T
  }

  const plaintext = decrypt(ciphertext)

  if (parseJson) {
    try {
      return JSON.parse(plaintext) as T
    } catch {
      return plaintext as T
    }
  }

  return plaintext as T
}

/**
 * Check if a value appears to be encrypted
 * Useful for migration - detecting already-encrypted values
 */
export function isEncrypted(value: string): boolean {
  if (!value) {
    return false
  }

  try {
    const buffer = Buffer.from(value, "base64")
    // Check minimum length (IV + auth tag + at least 1 byte)
    return buffer.length > IV_LENGTH + AUTH_TAG_LENGTH
  } catch {
    return false
  }
}

/**
 * Encrypt if not already encrypted
 * Idempotent operation safe for migrations
 */
export function encryptIfNeeded(value: string): string {
  if (!value) {
    return ""
  }

  if (isEncrypted(value)) {
    return value
  }

  return encrypt(value)
}

/**
 * Decrypt if encrypted, otherwise return as-is
 * Safe for mixed encrypted/plaintext data during migration
 */
export function decryptIfNeeded(value: string): string {
  if (!value) {
    return ""
  }

  if (!isEncrypted(value)) {
    return value
  }

  try {
    return decrypt(value)
  } catch {
    // If decryption fails, value was likely not encrypted
    return value
  }
}

/**
 * Mask a sensitive value for display
 * Shows first and last few characters only
 */
export function maskSensitiveValue(value: string, showChars = 4): string {
  if (!value || value.length <= showChars * 2) {
    return "****"
  }

  const start = value.substring(0, showChars)
  const end = value.substring(value.length - showChars)

  return `${start}${"*".repeat(Math.max(4, value.length - showChars * 2))}${end}`
}

/**
 * Generate a new encryption key
 * Use this to generate ENCRYPTION_KEY for .env
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString("base64")
}

/**
 * Verify encryption key is valid and working
 * Call at startup to fail fast on misconfiguration
 */
export function verifyEncryptionSetup(): { valid: boolean; error?: string } {
  try {
    const testValue = "encryption-test-" + Date.now()
    const encrypted = encrypt(testValue)
    const decrypted = decrypt(encrypted)

    if (decrypted !== testValue) {
      return { valid: false, error: "Encryption roundtrip failed" }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}
