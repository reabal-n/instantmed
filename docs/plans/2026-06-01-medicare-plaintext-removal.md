# Medicare Plaintext Column Removal

**Deadline:** 2026-06-01
**Status:** Pending
**Tracking:** `lib/data/profiles.ts:97` — `TODO(security)`

## Background

PHI encryption (AES-256-GCM) was added to the `profiles` table. Medicare number is stored
in both `medicare_number` (plaintext) and `medicare_number_encrypted` (encrypted) for
rollback safety. The encrypted column has been live since launch (2026-03).

After the deadline, drop the plaintext column to reduce PHI surface area.

---

## Pre-Removal Checklist

### Step 1: Verify encrypted column is fully populated

Run on production Supabase SQL editor:
```sql
SELECT
  COUNT(*) AS total_patients,
  COUNT(medicare_number) AS has_plaintext,
  COUNT(medicare_number_encrypted) AS has_encrypted,
  COUNT(CASE WHEN medicare_number IS NOT NULL AND medicare_number_encrypted IS NULL THEN 1 END) AS plaintext_only
FROM profiles
WHERE role = 'patient' AND medicare_number IS NOT NULL;
```

**Required before proceeding:** `plaintext_only = 0`

### Step 2: Backfill any missing encrypted values (if needed)

If `plaintext_only > 0`, write a one-off script to encrypt remaining rows before proceeding.

### Step 3: Remove plaintext reads/writes in `lib/data/profiles.ts`

- Remove `medicare_number` from all `.select()` calls
- In `encryptProfilePhi`: remove the dual-write block that sets `medicare_number` alongside `medicare_number_encrypted` — keep only the `_encrypted` write
- In `decryptProfilePhi`: remove any read from the plaintext column, read only from `_encrypted`
- Remove the `TODO(security)` comment

### Step 4: Confirm no remaining plaintext references

```bash
grep -rn "\.medicare_number\b" lib/ app/ --include="*.ts" --include="*.tsx" | grep -v "_encrypted"
```

Expected: zero results.

### Step 5: Create and run the migration

```bash
supabase migration new drop_plaintext_medicare_number
```

Add to the migration file:
```sql
ALTER TABLE profiles DROP COLUMN medicare_number;
```

Push to production:
```bash
supabase db push
```

### Step 6: Check RLS policies

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
  AND (qual::text LIKE '%medicare_number%' OR with_check::text LIKE '%medicare_number%');
```

Update any policies found to reference `medicare_number_encrypted` instead.

### Step 7: Run full test suite and build

```bash
pnpm test && pnpm typecheck && pnpm build
```

### Step 8: Deploy and monitor

After deployment, watch Sentry for 30 minutes for any errors related to missing `medicare_number` column. Check patient onboarding and intake flows specifically.
