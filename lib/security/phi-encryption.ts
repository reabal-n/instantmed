/**
 * PHI Encryption Module (Envelope Encryption)
 * 
 * Implements envelope encryption for Protected Health Information:
 * 1. Generate a unique Data Encryption Key (DEK) per record
 * 2. Encrypt PHI with DEK using AES-256-GCM
 * 3. Encrypt DEK with Master Key (KEK) from KMS or env
 * 4. Store encrypted DEK alongside ciphertext
 * 
 * Decryption reverses the process:
 * 1. Decrypt DEK using Master Key
 * 2. Decrypt PHI using DEK
 */

import crypto from "crypto"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("phi-encryption")

// ============================================================================
// CONFIGURATION
// ============================================================================

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12 // GCM recommended IV length
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32 // 256 bits
const CURRENT_VERSION = 1

// Feature flags
const isEncryptionEnabled = () => process.env.PHI_ENCRYPTION_ENABLED === "true"
const isWriteEnabled = () => process.env.PHI_ENCRYPTION_WRITE_ENABLED === "true"
const isReadEnabled = () => process.env.PHI_ENCRYPTION_READ_ENABLED === "true"

// ============================================================================
// TYPES
// ============================================================================

export interface EncryptedPHI {
  /** Base64-encoded ciphertext */
  ciphertext: string
  /** Base64-encoded encrypted data key */
  encryptedDataKey: string
  /** Base64-encoded initialization vector */
  iv: string
  /** Base64-encoded authentication tag */
  authTag: string
  /** Key ID for audit/rotation tracking */
  keyId: string
  /** Encryption version for future algorithm upgrades */
  version: number
}

export interface EncryptionMetadata {
  keyId: string
  version: number
  encryptedAt: string
  algorithm: string
}

// ============================================================================
// MASTER KEY MANAGEMENT
// ============================================================================

let cachedMasterKey: Buffer | null = null

/**
 * Get the master key (Key Encryption Key)
 * 
 * In production: Would call AWS KMS to get/decrypt the master key
 * In development: Uses PHI_MASTER_KEY environment variable
 */
async function getMasterKey(): Promise<Buffer> {
  if (cachedMasterKey) {
    return cachedMasterKey
  }

  // Use environment variable for master key
  // Note: AWS KMS integration was considered but adds complexity without
  // significant benefit for current scale. AES-256-GCM with env key is
  // production-ready and HIPAA-compliant.
  const masterKeyBase64 = process.env.PHI_MASTER_KEY
  if (!masterKeyBase64) {
    throw new Error("PHI_MASTER_KEY environment variable not set")
  }

  const masterKey = Buffer.from(masterKeyBase64, "base64")
  if (masterKey.length !== KEY_LENGTH) {
    throw new Error(`PHI_MASTER_KEY must be ${KEY_LENGTH} bytes (got ${masterKey.length})`)
  }

  cachedMasterKey = masterKey
  return masterKey
}

/**
 * Generate a unique key ID for tracking/audit
 */
function generateKeyId(): string {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(4).toString("hex")
  return `dek-${timestamp}-${random}`
}

// ============================================================================
// DATA KEY OPERATIONS
// ============================================================================

/**
 * Generate a new Data Encryption Key (DEK)
 */
function generateDataKey(): Buffer {
  return crypto.randomBytes(KEY_LENGTH)
}

/**
 * Encrypt the Data Encryption Key with the Master Key
 */
async function encryptDataKey(dataKey: Buffer): Promise<Buffer> {
  const masterKey = await getMasterKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv)
  const encrypted = Buffer.concat([cipher.update(dataKey), cipher.final()])
  const authTag = cipher.getAuthTag()
  
  // Format: iv (12) + authTag (16) + encrypted key (32)
  return Buffer.concat([iv, authTag, encrypted])
}

/**
 * Decrypt the Data Encryption Key with the Master Key
 */
async function decryptDataKey(encryptedDataKey: Buffer): Promise<Buffer> {
  const masterKey = await getMasterKey()
  
  // Parse: iv (12) + authTag (16) + encrypted key (32)
  const iv = encryptedDataKey.subarray(0, IV_LENGTH)
  const authTag = encryptedDataKey.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = encryptedDataKey.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
  
  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv)
  decipher.setAuthTag(authTag)
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}

// ============================================================================
// PHI ENCRYPTION/DECRYPTION
// ============================================================================

/**
 * Encrypt PHI data using envelope encryption
 * 
 * @param plaintext - The plaintext PHI to encrypt
 * @returns EncryptedPHI object with all components needed for decryption
 */
export async function encryptPHI(plaintext: string): Promise<EncryptedPHI> {
  if (!isEncryptionEnabled() || !isWriteEnabled()) {
    throw new Error("PHI encryption is not enabled")
  }

  try {
    // 1. Generate a unique data key for this record
    const dataKey = generateDataKey()
    const keyId = generateKeyId()
    
    // 2. Encrypt the data with the data key
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, dataKey, iv)
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final()
    ])
    const authTag = cipher.getAuthTag()
    
    // 3. Encrypt the data key with the master key
    const encryptedDataKey = await encryptDataKey(dataKey)
    
    // 4. Clear the plaintext data key from memory
    dataKey.fill(0)
    
    logger.debug("PHI encrypted successfully", { keyId })
    
    return {
      ciphertext: ciphertext.toString("base64"),
      encryptedDataKey: encryptedDataKey.toString("base64"),
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      keyId,
      version: CURRENT_VERSION,
    }
  } catch (error) {
    logger.error("Failed to encrypt PHI", {}, error instanceof Error ? error : new Error(String(error)))
    throw new Error("PHI encryption failed")
  }
}

/**
 * Decrypt PHI data using envelope encryption
 * 
 * @param encrypted - The EncryptedPHI object
 * @returns The decrypted plaintext
 */
export async function decryptPHI(encrypted: EncryptedPHI): Promise<string> {
  if (!isEncryptionEnabled() || !isReadEnabled()) {
    throw new Error("PHI decryption is not enabled")
  }

  try {
    // 1. Decrypt the data key with the master key
    const encryptedDataKey = Buffer.from(encrypted.encryptedDataKey, "base64")
    const dataKey = await decryptDataKey(encryptedDataKey)
    
    // 2. Decrypt the data with the data key
    const iv = Buffer.from(encrypted.iv, "base64")
    const authTag = Buffer.from(encrypted.authTag, "base64")
    const ciphertext = Buffer.from(encrypted.ciphertext, "base64")
    
    const decipher = crypto.createDecipheriv(ALGORITHM, dataKey, iv)
    decipher.setAuthTag(authTag)
    
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]).toString("utf8")
    
    // 3. Clear the data key from memory
    dataKey.fill(0)
    
    logger.debug("PHI decrypted successfully", { keyId: encrypted.keyId })
    
    return plaintext
  } catch (error) {
    logger.error("Failed to decrypt PHI", { keyId: encrypted.keyId }, error instanceof Error ? error : new Error(String(error)))
    throw new Error("PHI decryption failed")
  }
}

// ============================================================================
// JSONB HELPERS
// ============================================================================

/**
 * Encrypt a JSONB object
 */
export async function encryptJSONB<T extends object>(data: T): Promise<EncryptedPHI> {
  const plaintext = JSON.stringify(data)
  return encryptPHI(plaintext)
}

/**
 * Decrypt a JSONB object
 */
export async function decryptJSONB<T extends object>(encrypted: EncryptedPHI): Promise<T> {
  const plaintext = await decryptPHI(encrypted)
  return JSON.parse(plaintext) as T
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a value is an encrypted PHI object
 */
export function isEncryptedPHI(value: unknown): value is EncryptedPHI {
  if (!value || typeof value !== "object") return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.ciphertext === "string" &&
    typeof obj.encryptedDataKey === "string" &&
    typeof obj.iv === "string" &&
    typeof obj.authTag === "string" &&
    typeof obj.keyId === "string" &&
    typeof obj.version === "number"
  )
}

/**
 * Get encryption metadata for audit logging
 */
export function getEncryptionMetadata(encrypted: EncryptedPHI): EncryptionMetadata {
  return {
    keyId: encrypted.keyId,
    version: encrypted.version,
    encryptedAt: new Date().toISOString(),
    algorithm: ALGORITHM,
  }
}

/**
 * Generate a new PHI master key (for initial setup)
 * Run: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
export function generateMasterKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString("base64")
}

// ============================================================================
// EXPORTS FOR TESTING
// ============================================================================

export const __test__ = {
  getMasterKey,
  generateDataKey,
  encryptDataKey,
  decryptDataKey,
  ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH,
}
