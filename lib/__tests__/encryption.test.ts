/**
 * Encryption Module Tests
 * 
 * Tests for AES-256-GCM field-level encryption used for PHI protection.
 * Covers: encrypt/decrypt roundtrip, edge cases, error handling, key validation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

// Mock the encryption key before importing the module
const VALID_KEY = Buffer.from("test-encryption-key-32-bytes!!!!").toString("base64")

describe("encryption module", () => {
  const originalEnv = process.env.ENCRYPTION_KEY

  beforeEach(() => {
    // Reset module cache to allow re-initialization with new key
    vi.resetModules()
    process.env.ENCRYPTION_KEY = VALID_KEY
  })

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEnv
    vi.resetModules()
  })

  describe("encrypt/decrypt roundtrip", () => {
    it("encrypts and decrypts a simple string", async () => {
      const { encrypt, decrypt } = await import("../security/encryption")
      const plaintext = "Hello, World!"
      
      const ciphertext = encrypt(plaintext)
      const decrypted = decrypt(ciphertext)
      
      expect(decrypted).toBe(plaintext)
    })

    it("encrypts and decrypts Medicare number format", async () => {
      const { encrypt, decrypt } = await import("../security/encryption")
      const medicareNumber = "1234567890"
      
      const ciphertext = encrypt(medicareNumber)
      const decrypted = decrypt(ciphertext)
      
      expect(decrypted).toBe(medicareNumber)
    })

    it("encrypts and decrypts date of birth format", async () => {
      const { encrypt, decrypt } = await import("../security/encryption")
      const dob = "1990-01-15"
      
      const ciphertext = encrypt(dob)
      const decrypted = decrypt(ciphertext)
      
      expect(decrypted).toBe(dob)
    })

    it("encrypts and decrypts phone number format", async () => {
      const { encrypt, decrypt } = await import("../security/encryption")
      const phone = "+61412345678"
      
      const ciphertext = encrypt(phone)
      const decrypted = decrypt(ciphertext)
      
      expect(decrypted).toBe(phone)
    })

    it("encrypts and decrypts unicode characters", async () => {
      const { encrypt, decrypt } = await import("../security/encryption")
      const unicode = "こんにちは 🏥 émojis"
      
      const ciphertext = encrypt(unicode)
      const decrypted = decrypt(ciphertext)
      
      expect(decrypted).toBe(unicode)
    })

    it("encrypts and decrypts long text", async () => {
      const { encrypt, decrypt } = await import("../security/encryption")
      const longText = "A".repeat(10000)
      
      const ciphertext = encrypt(longText)
      const decrypted = decrypt(ciphertext)
      
      expect(decrypted).toBe(longText)
    })
  })

  describe("unique IV per encryption", () => {
    it("produces different ciphertext for same plaintext", async () => {
      const { encrypt } = await import("../security/encryption")
      const plaintext = "Same text"
      
      const ciphertext1 = encrypt(plaintext)
      const ciphertext2 = encrypt(plaintext)
      
      expect(ciphertext1).not.toBe(ciphertext2)
    })

    it("both ciphertexts decrypt to same plaintext", async () => {
      const { encrypt, decrypt } = await import("../security/encryption")
      const plaintext = "Same text"
      
      const ciphertext1 = encrypt(plaintext)
      const ciphertext2 = encrypt(plaintext)
      
      expect(decrypt(ciphertext1)).toBe(plaintext)
      expect(decrypt(ciphertext2)).toBe(plaintext)
    })
  })

  describe("edge cases", () => {
    it("returns empty string for empty input on encrypt", async () => {
      const { encrypt } = await import("../security/encryption")
      
      expect(encrypt("")).toBe("")
    })

    it("returns empty string for empty input on decrypt", async () => {
      const { decrypt } = await import("../security/encryption")
      
      expect(decrypt("")).toBe("")
    })

    it("handles whitespace-only strings", async () => {
      const { encrypt, decrypt } = await import("../security/encryption")
      const whitespace = "   \t\n   "
      
      const ciphertext = encrypt(whitespace)
      const decrypted = decrypt(ciphertext)
      
      expect(decrypted).toBe(whitespace)
    })
  })

  describe("encryptField/decryptField", () => {
    it("encrypts and decrypts string values", async () => {
      const { encryptField, decryptField } = await import("../security/encryption")
      const value = "test-value"
      
      const encrypted = encryptField(value)
      const decrypted = decryptField<string>(encrypted)
      
      expect(decrypted).toBe(value)
    })

    it("handles null values", async () => {
      const { encryptField } = await import("../security/encryption")
      
      expect(encryptField(null)).toBe("")
    })

    it("handles undefined values", async () => {
      const { encryptField } = await import("../security/encryption")
      
      expect(encryptField(undefined)).toBe("")
    })

    it("encrypts and parses JSON objects", async () => {
      const { encryptField, decryptField } = await import("../security/encryption")
      const obj = { name: "John", age: 30 }
      
      const encrypted = encryptField(obj)
      const decrypted = decryptField<typeof obj>(encrypted, true)
      
      expect(decrypted).toEqual(obj)
    })
  })

  describe("isEncrypted detection", () => {
    it("detects encrypted values", async () => {
      const { encrypt, isEncrypted } = await import("../security/encryption")
      const ciphertext = encrypt("test")
      
      expect(isEncrypted(ciphertext)).toBe(true)
    })

    it("returns false for plaintext", async () => {
      const { isEncrypted } = await import("../security/encryption")
      
      expect(isEncrypted("plaintext")).toBe(false)
    })

    it("returns false for empty string", async () => {
      const { isEncrypted } = await import("../security/encryption")
      
      expect(isEncrypted("")).toBe(false)
    })

    it("returns false for short base64 strings", async () => {
      const { isEncrypted } = await import("../security/encryption")
      
      expect(isEncrypted("c2hvcnQ=")).toBe(false) // "short" in base64
    })
  })

  describe("encryptIfNeeded/decryptIfNeeded", () => {
    it("encrypts plaintext values", async () => {
      const { encryptIfNeeded, isEncrypted } = await import("../security/encryption")
      const plaintext = "plaintext-value"
      
      const result = encryptIfNeeded(plaintext)
      
      expect(isEncrypted(result)).toBe(true)
    })

    it("does not double-encrypt already encrypted values", async () => {
      const { encrypt, encryptIfNeeded, decrypt } = await import("../security/encryption")
      const plaintext = "test"
      const alreadyEncrypted = encrypt(plaintext)
      
      const result = encryptIfNeeded(alreadyEncrypted)
      
      expect(result).toBe(alreadyEncrypted)
      expect(decrypt(result)).toBe(plaintext)
    })

    it("decrypts encrypted values", async () => {
      const { encrypt, decryptIfNeeded } = await import("../security/encryption")
      const plaintext = "test"
      const ciphertext = encrypt(plaintext)
      
      const result = decryptIfNeeded(ciphertext)
      
      expect(result).toBe(plaintext)
    })

    it("returns plaintext values unchanged", async () => {
      const { decryptIfNeeded } = await import("../security/encryption")
      const plaintext = "plaintext-value"
      
      const result = decryptIfNeeded(plaintext)
      
      expect(result).toBe(plaintext)
    })
  })

  describe("maskSensitiveValue", () => {
    it("masks middle characters", async () => {
      const { maskSensitiveValue } = await import("../security/encryption")
      
      const result = maskSensitiveValue("1234567890")
      
      // For 10 chars with showChars=4, middle is 2 chars, but min mask is 4 asterisks
      expect(result).toBe("1234****7890")
    })

    it("returns masked placeholder for short values", async () => {
      const { maskSensitiveValue } = await import("../security/encryption")
      
      expect(maskSensitiveValue("123")).toBe("****")
    })

    it("respects custom showChars parameter", async () => {
      const { maskSensitiveValue } = await import("../security/encryption")
      
      const result = maskSensitiveValue("1234567890", 2)
      
      expect(result).toBe("12******90")
    })
  })

  describe("verifyEncryptionSetup", () => {
    it("returns valid when encryption is working", async () => {
      const { verifyEncryptionSetup } = await import("../security/encryption")
      
      const result = verifyEncryptionSetup()
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe("error handling", () => {
    it("throws on missing ENCRYPTION_KEY", async () => {
      vi.resetModules()
      delete process.env.ENCRYPTION_KEY
      
      const { encrypt } = await import("../security/encryption")
      
      expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY environment variable is required")
    })

    it("throws on short ENCRYPTION_KEY", async () => {
      vi.resetModules()
      process.env.ENCRYPTION_KEY = Buffer.from("short").toString("base64")
      
      const { encrypt } = await import("../security/encryption")
      
      expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY must be at least 32 bytes")
    })

    it("throws on invalid ciphertext (too short)", async () => {
      const { decrypt } = await import("../security/encryption")
      const shortCiphertext = Buffer.from("tooshort").toString("base64")
      
      expect(() => decrypt(shortCiphertext)).toThrow("Invalid ciphertext: too short")
    })

    it("throws on tampered ciphertext (auth tag mismatch)", async () => {
      const { encrypt, decrypt } = await import("../security/encryption")
      const ciphertext = encrypt("test")
      
      // Tamper with the ciphertext
      const buffer = Buffer.from(ciphertext, "base64")
      buffer[20] = buffer[20] ^ 0xff // Flip bits in auth tag area
      const tampered = buffer.toString("base64")
      
      expect(() => decrypt(tampered)).toThrow()
    })

    it("verifyEncryptionSetup returns error when key is missing", async () => {
      vi.resetModules()
      delete process.env.ENCRYPTION_KEY
      
      const { verifyEncryptionSetup } = await import("../security/encryption")
      
      const result = verifyEncryptionSetup()
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain("ENCRYPTION_KEY")
    })
  })

  describe("generateEncryptionKey", () => {
    it("generates a valid base64 key", async () => {
      const { generateEncryptionKey } = await import("../security/encryption")
      
      const key = generateEncryptionKey()
      const buffer = Buffer.from(key, "base64")
      
      expect(buffer.length).toBe(32) // 256 bits
    })

    it("generates unique keys each time", async () => {
      const { generateEncryptionKey } = await import("../security/encryption")
      
      const key1 = generateEncryptionKey()
      const key2 = generateEncryptionKey()
      
      expect(key1).not.toBe(key2)
    })
  })
})
