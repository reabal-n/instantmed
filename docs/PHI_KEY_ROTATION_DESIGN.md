# PHI Encryption Key Rotation — Design

**Status:** DESIGN ONLY (2026-05-24). Not yet implemented. Operator approval required before shipping any of this.

## Current state

The PHI encryption module at `lib/security/phi-encryption.ts` already implements envelope encryption:

- Single Master Key (KEK) loaded from `PHI_MASTER_KEY` env var (base64, 32 bytes)
- One Data Encryption Key (DEK) generated per record
- DEK encrypted with KEK, stored alongside ciphertext as `encryptedDataKey`
- Each encrypted blob carries `keyId` (per-DEK tracking) and `version` (algorithm tag)
- All AES-256-GCM with random IV per encryption

Feature flags in env:
- `PHI_ENCRYPTION_ENABLED` — module on/off
- `PHI_ENCRYPTION_WRITE_ENABLED` — encrypt new writes
- `PHI_ENCRYPTION_READ_ENABLED` — decrypt on read

Production currently runs with the single `PHI_MASTER_KEY` (122 days old per Vercel env dashboard, 2026-05-24).

## Gap

No rotation path. If the master key is ever compromised, rotated voluntarily for hygiene, or required to rotate for compliance, **every encrypted PHI row must be re-encrypted in a single coordinated operation with downtime**. No graceful handoff.

For a HIPAA-equivalent posture this is a real risk: a compromised key forces either an emergency downtime or a hard cutover with read-locks.

## Proposed design

Add support for **one previous master key in addition to the current**, so rotation can happen in three operator-paced phases instead of one big-bang.

### Phase 1: dual-key reads (zero-downtime, ship anytime)

Code changes in `lib/security/phi-encryption.ts`:

1. New optional env var `PHI_MASTER_KEY_PREVIOUS` (same format: base64, 32 bytes).
2. On read, the decrypt path tries `PHI_MASTER_KEY` first. If the GCM auth tag fails, retry with `PHI_MASTER_KEY_PREVIOUS`. If neither succeeds, raise. (GCM auth failure is the canonical "wrong key" signal and is fast.)
3. Cache both keys on first use; same lazy-init pattern as the current `cachedMasterKey`.
4. No change to write path: new records always encrypted with `PHI_MASTER_KEY` (the current key).
5. Add a `master_key_attempts` counter that increments per decrypt attempt and emits a Sentry warning if `PHI_MASTER_KEY_PREVIOUS` was used to read a record older than X days. This surfaces drift (you forgot to re-encrypt old rows).

Tests:
- Round-trip encrypt-with-A, decrypt-with-A → works
- Round-trip encrypt-with-A, swap A and B (B is now current, A is previous), decrypt → works via fallback
- Decrypt with no previous and wrong current → raises (no silent failure)
- Bench: dual-key read should be at most 2x single-key read; usually ~1.05x since the fast path is the current key

### Phase 2: rotate (operator-paced, ~minutes)

Procedure document (no code change):

1. Generate a new master key (`node scripts/generate-phi-master-key.mjs` — already exists, see `encryption.ts:233` reference)
2. In Vercel: set `PHI_MASTER_KEY_PREVIOUS` = current `PHI_MASTER_KEY` value
3. In Vercel: set `PHI_MASTER_KEY` = new key value
4. Redeploy (single deploy, no downtime — reads succeed via the dual-key fallback)
5. All NEW writes are encrypted with the new key; all OLD reads decrypt via the fallback
6. Confirm via Sentry that `master_key_attempts.previous` counter starts incrementing on reads of older rows

### Phase 3: re-encryption batch (operator-paced, optional)

Required ONLY when you want to retire `PHI_MASTER_KEY_PREVIOUS` (eg. the old key was compromised, or you want to remove fallback path entirely).

Until you run this, both keys remain active and reads work via fallback indefinitely.

When ready:

1. New cron `app/api/cron/phi-key-reencrypt/route.ts` runs in batches of 100 rows per minute
2. For each encrypted PHI column on each PHI-bearing table, query rows where the per-DEK `keyId` was created before the rotation timestamp, re-encrypt with the current master key, write back atomically
3. Tracks progress in a `phi_reencryption_progress` table (one row per `table.column`)
4. Operator monitors `/admin/ops` for re-encryption progress
5. When done: drop `PHI_MASTER_KEY_PREVIOUS` from Vercel env, redeploy
6. Sentry counter for previous-key reads should go to zero

This phase has the most risk (it's a background data rewrite) but is the only phase that actually requires the legacy key to be deleted. Until then, the dual-key support from Phase 1 covers all cases.

## What this design deliberately does NOT do

- **Multi-key (>2) support.** Two is enough for rotation; more becomes a chain-of-trust problem with no clear win.
- **AWS KMS integration.** Already-considered-and-rejected per the comment in `phi-encryption.ts:81-83`. Adds complexity without clear benefit at current scale; envelope encryption with env-stored keys is HIPAA-compliant. Revisit if SOC 2 Type II requires it.
- **Per-record key versioning beyond what already exists.** The `keyId` + `version` fields are sufficient.
- **Auto-rotation cron.** Rotation is an operator-driven event, not a scheduled task. Schedule risk > value at this scale.

## Rollout sequence

| Phase | Risk | Reversible | Operator action |
|---|---|---|---|
| 1 (dual-key reads) | Low — only adds a code path | Yes (revert) | Approve PR, deploy |
| 2 (key swap) | Medium — wrong key in env breaks reads | Yes (swap env vars back, redeploy) | Manual env-var rotation in Vercel |
| 3 (re-encrypt batch) | Medium — touches every PHI row | Partial (rows already re-encrypted stay re-encrypted, but the legacy key still decrypts them) | Trigger cron, monitor |

## Open questions for operator

- **What triggers a rotation?** Calendar-driven (e.g. annually) or event-driven (e.g. on personnel turnover, on suspected leak)? Memory note `decision_phi_key_rotation_cadence.md` (TBD) should pin this.
- **Compliance posture:** is there a stated HIPAA-equivalent rotation requirement we're missing today? If yes, urgency is higher.
- **AWS KMS revisit threshold:** at what business milestone does KMS become worth the integration complexity (SOC 2? International expansion? Enterprise contracts?)?

## Implementation budget if approved

- Phase 1 code + tests: 1-2h
- Phase 2 procedure doc + ops runbook: 30min
- Phase 3 cron + admin UI: 4-6h (depends on table count and PHI column inventory)

Total: ~1 dev day. None of it ships without explicit operator approval per phase.
