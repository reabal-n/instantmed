# PHI Encryption Design (Envelope Encryption)

## Overview

This document describes the envelope encryption strategy for protecting Protected Health Information (PHI) at rest in the InstantMed database.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Envelope Encryption Flow                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Plaintext   │───▶│  Data Key    │───▶│  Encrypted PHI   │  │
│  │  PHI Data    │    │  (per-record)│    │  (stored in DB)  │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│                      ┌──────────────┐                           │
│                      │  Master Key  │                           │
│                      │  (KMS/Vault) │                           │
│                      └──────────────┘                           │
│                             │                                    │
│                             ▼                                    │
│                      ┌──────────────┐                           │
│                      │ Encrypted    │                           │
│                      │ Data Key     │                           │
│                      │ (stored)     │                           │
│                      └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## Why Envelope Encryption?

1. **Key Rotation**: Rotate master key without re-encrypting all data
2. **Performance**: Encrypt data locally with symmetric key (fast)
3. **Security**: Master key never touches application code directly
4. **Granularity**: Per-record keys enable selective decryption

## PHI Data Locations

### High Priority (Contains Symptoms/Medical History)

| Table | Field | Type | PHI Category |
|-------|-------|------|--------------|
| `intake_answers` | `answers` | JSONB | Symptoms, conditions, medications |
| `intake_answers` | `allergy_details` | TEXT | Allergies |
| `intake_answers` | `current_medications` | TEXT[] | Medications |
| `intake_answers` | `medical_conditions` | TEXT[] | Conditions |
| `intake_drafts` | `draft_data` | JSONB | Work-in-progress symptoms |
| `document_drafts` | `draft_data` | JSONB | Certificate drafts |

### Medium Priority (Contains Names/DOB)

| Table | Field | Type | PHI Category |
|-------|-------|------|--------------|
| `profiles` | `full_name` | TEXT | PII |
| `profiles` | `date_of_birth` | DATE | PII |
| `profiles` | `medicare_number` | TEXT | PII |
| `issued_certificates` | `patient_name` | TEXT | PII (snapshot) |
| `issued_certificates` | `patient_dob` | DATE | PII (snapshot) |

## Implementation Strategy

### Phase 1: Infrastructure (Week 1)

1. Set up AWS KMS or HashiCorp Vault
2. Create master key with auto-rotation
3. Implement encryption utility module
4. Add encrypted field types to database

### Phase 2: New Data Encryption (Week 2)

1. Encrypt all new `intake_answers.answers` writes
2. Store encrypted data key alongside ciphertext
3. Update read paths to decrypt transparently

### Phase 3: Backfill (Week 3)

1. Run migration script to encrypt existing PHI
2. Verify decryption works correctly
3. Remove plaintext data after verification

## Key Management Options

### Option A: AWS KMS (Recommended for Production)

```typescript
// Environment variables
AWS_KMS_KEY_ARN=arn:aws:kms:ap-southeast-2:xxx:key/xxx
AWS_REGION=ap-southeast-2
```

**Pros**: 
- HIPAA-eligible
- Automatic key rotation
- Audit logging via CloudTrail
- No key material in application

**Cons**:
- AWS dependency
- Network latency for key operations

### Option B: Local Master Key (Development/Staging)

```typescript
// Environment variable
PHI_MASTER_KEY=base64-encoded-32-byte-key
```

**Pros**:
- Simple setup
- No external dependencies

**Cons**:
- Manual key rotation
- Key in environment (less secure)

## Database Schema Changes

```sql
-- Add encrypted fields
ALTER TABLE intake_answers
ADD COLUMN answers_encrypted BYTEA,
ADD COLUMN answers_key_encrypted BYTEA,
ADD COLUMN answers_key_id TEXT,
ADD COLUMN encryption_version INTEGER DEFAULT 1;

-- Index for key lookup
CREATE INDEX idx_intake_answers_key_id 
ON intake_answers(answers_key_id);
```

## Encryption Utility API

```typescript
// lib/security/phi-encryption.ts

interface EncryptedData {
  ciphertext: Buffer
  encryptedDataKey: Buffer
  keyId: string
  iv: Buffer
  authTag: Buffer
  version: number
}

// Encrypt PHI data
async function encryptPHI(plaintext: string): Promise<EncryptedData>

// Decrypt PHI data
async function decryptPHI(encrypted: EncryptedData): Promise<string>

// Encrypt JSONB field
async function encryptJSONB(data: object): Promise<EncryptedData>

// Decrypt JSONB field
async function decryptJSONB(encrypted: EncryptedData): Promise<object>
```

## Migration Plan

### Step 1: Add New Columns

```sql
ALTER TABLE intake_answers
ADD COLUMN answers_encrypted BYTEA,
ADD COLUMN encryption_metadata JSONB;
```

### Step 2: Dual-Write Period

- Write to both `answers` (plaintext) and `answers_encrypted`
- Read from `answers_encrypted` if present, else `answers`

### Step 3: Backfill Script

```typescript
// scripts/encrypt-phi-backfill.ts
async function backfillEncryption() {
  const batch = await getUnencryptedRecords(100)
  for (const record of batch) {
    const encrypted = await encryptJSONB(record.answers)
    await updateWithEncryption(record.id, encrypted)
  }
}
```

### Step 4: Remove Plaintext

```sql
ALTER TABLE intake_answers
DROP COLUMN answers;

ALTER TABLE intake_answers
RENAME COLUMN answers_encrypted TO answers;
```

## Security Considerations

1. **Key Access Control**: Only service role can access encryption keys
2. **Audit Logging**: Log all decrypt operations with actor ID
3. **Key Rotation**: Master key rotates annually (KMS automatic)
4. **Backup Encryption**: Database backups are already encrypted by Supabase
5. **Memory Safety**: Clear plaintext from memory after use

## Compliance Mapping

| Requirement | Implementation |
|-------------|----------------|
| HIPAA § 164.312(a)(2)(iv) | AES-256-GCM encryption |
| HIPAA § 164.312(d) | Audit logging of access |
| HIPAA § 164.312(e)(2)(ii) | Encryption key management |
| AU Privacy Act | Reasonable security measures |

## Rollback Plan

If issues are detected:

1. Feature flag to disable encryption reads
2. Plaintext backup maintained during migration
3. Decrypt-all script available for emergency

## Timeline

| Week | Milestone |
|------|-----------|
| 1 | Infrastructure + encryption module |
| 2 | New data encryption (dual-write) |
| 3 | Backfill + verification |
| 4 | Remove plaintext + production validation |

## Environment Variables Required

```bash
# Production (AWS KMS)
AWS_KMS_KEY_ARN=arn:aws:kms:ap-southeast-2:xxx:key/xxx
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=ap-southeast-2

# Development (Local key)
PHI_MASTER_KEY=base64-encoded-32-byte-key

# Feature flags
PHI_ENCRYPTION_ENABLED=true
PHI_ENCRYPTION_WRITE_ENABLED=true
PHI_ENCRYPTION_READ_ENABLED=true
```
