# Supabase migration drift audit — 2026-04-21

> **Verdict:** Drift is real and large. Not currently breaking production.
> Will break any fresh clone that runs `supabase db push`. **Fix before launch.**
>
> **Project:** `witzcrovsoumktyndqgz` (instantmed)
> **Scope:** `supabase/migrations/` on disk vs. Supabase migration tracker via MCP `list_migrations`.

---

## Summary

| Source | Count |
|---|---|
| Files on disk (`supabase/migrations/*.sql`) | **200** |
| Entries in Supabase migration tracker | **19** |
| Delta | **181 files on disk with no tracker row** |

`CLAUDE.md` currently documents "199 migration files" — the on-disk total is 200, and the tracker is 19. Both numbers need to be corrected in `CLAUDE.md` regardless of what we do with drift.

---

## What the tracker believes is applied

Pulled via `mcp__supabase__list_migrations(project_id="witzcrovsoumktyndqgz")`:

| # | Version | Name |
|---|---|---|
| 1 | `20240101000000` | `baseline` |
| 2 | `20260402000002` | `flag_preoperational_intakes` |
| 3 | `20260402000003` | `add_e2e_intake_reset_rpc` |
| 4 | `20260402000004` | `auto_approval_state_machine` |
| 5 | `20260402000005` | `auto_approval_increment_rpc` |
| 6 | `20260402000006` | `drop_old_auto_approval_columns` |
| 7 | `20260403000001` | `add_delay_notification_sent_at` |
| 8 | `20260403000002` | `referral_system` |
| 9 | `20260403062235` | `add_delay_notification_sent_at` *(duplicate name)* |
| 10 | `20260404000001` | `create_subscriptions` |
| 11 | `20260406000001` | `email_engagement_columns` |
| 12 | `20260408000001` | `lock_down_intake_drafts_and_safety_audit` |
| 13 | `20260410000001` | `followup_tracker` |
| 14 | `20260410000002` | `doctor_telegram_alert` |
| 15 | `20260411000001` | `drop_clerk_auth` |
| 16 | `20260411000002` | `service_waitlist` |
| 17 | `20260411000003` | `parchment_integration` |
| 18 | `20260412000001` | `harden_new_user_trigger` |
| 19 | `20260419102642` | `allow_paid_to_awaiting_script` |

Tracker jumps from baseline (2024‑01‑01) straight to 2026‑04‑02. That means **everything between those two dates was squashed into the baseline** and is NOT replayed on a `supabase db push`.

---

## Findings

### 1. 181 pre-baseline files still shipping on disk

Dates `20240119…` through `20260401000002…` exist as separate `.sql` files but the tracker has no rows for them. Supabase's migration CLI will try to apply any file on disk whose version is not in the tracker, so a fresh `supabase db push` against a brand-new database would attempt to replay **all 181 historical files in order**. Most will fail the moment they hit an object the baseline already created.

**Risk:** low while only CI/prod exists (these already have baseline applied). Medium/high for any contributor cloning fresh, any preview branch, or any dev-reset workflow.

**Examples of orphaned-on-disk files (pre-squash):**
- `20240101000000_create_enums.sql` — collides with `20240101000000_baseline.sql` on timestamp
- `20240601000000_create_audit_logs.sql`
- `20241215000001_schema_hardening.sql` through `20241228_state_machine_constraints.sql`
- 160+ files between `20250101…` and `20260401000002…`

### 2. Timestamp collision at the baseline

Two files share timestamp `20240101000000`:
- `20240101000000_baseline.sql` (the squashed one)
- `20240101000000_create_enums.sql` (one of the pre-squash originals)

Supabase normalises the version to the leading 14 digits, so both claim the same version slot. The tracker only knows about `baseline`; `create_enums` is effectively ghost data.

### 3. Tracker contains a duplicate migration name

`add_delay_notification_sent_at` appears twice:
- `20260403000001`
- `20260403062235`

Most likely: the first push applied the migration, the file was edited / re-run, and the tracker got a second row. Both ran successfully, but the name is no longer a unique key — this makes any future rollback or repair command ambiguous.

### 4. File/tracker name mismatch for the most recent migration

- **Tracker:** `20260419102642_allow_paid_to_awaiting_script`
- **Disk:** `20260419000001_allow_paid_to_awaiting_script.sql`

Different 14-digit timestamps (`102642` vs `000001`), same name. Whichever applied to prod used the `102642` version; the disk copy would be treated as a new migration by a fresh push. Candidate for `supabase migration repair` to reconcile.

---

## Recommendations, ranked

### R1 — Archive pre-baseline files out of `supabase/migrations/`
**Risk-reducing, non-destructive, ship this first.**
Move the 181 pre-squash files to `supabase/migrations/_archive/` (or delete if you want to keep git history as the only record). Keep only files corresponding to tracker rows plus any unmerged future migrations. Prevents the "fresh clone replays history and explodes" failure mode entirely.

### R2 — Repair the `20260419*` timestamp mismatch
Either:
- rename the disk file to `20260419102642_allow_paid_to_awaiting_script.sql` (matching tracker), OR
- run `supabase migration repair --status applied 20260419102642` and delete the `20260419000001` row.

### R3 — Collapse the duplicate `add_delay_notification_sent_at`
Review which of the two entries in the tracker is the canonical one, `supabase migration repair --status reverted` the other, and delete the corresponding file on disk.

### R4 — Delete `20240101000000_create_enums.sql`
Collides with the baseline timestamp. The baseline SQL already contains the enum definitions (or should — verify with a `grep CREATE TYPE supabase/migrations/20240101000000_baseline.sql`). If the enums are already in baseline, the collision file is pure noise.

### R5 — Update `CLAUDE.md` gotchas with corrected counts
Change "199 migration files" to "20 live migrations (1 baseline + 19 incremental)" once R1 lands, or to "200 files (1 baseline + 181 pre-baseline archived + 18 incremental)" if R1 is deferred. Whatever the state is, the doc should match it exactly or contributors will keep guessing.

### R6 — Add a CI check: disk ⇆ tracker parity
One-liner script: `supabase migration list --linked | diff - <(ls supabase/migrations | cut -c1-14)`. Runs in the existing `ci.yml` after lint. Any future drift fails the PR instead of surprising someone at launch.

---

## What NOT to do

- **Do not** run `supabase db reset` against production or the live project branch. The archived files cannot all replay from scratch — many contain `DROP` statements that reference objects the baseline already owns, or were superseded by later migrations.
- **Do not** `supabase db push --include-all` hoping the CLI figures it out. It will refuse, or it will try, or it will partially succeed and leave the DB inconsistent.
- **Do not** rename pre-baseline files to fake-fit the timeline. Archive or delete; do not renumber.

---

## Immediate action for this pass

This audit is read-only. No migrations touched, no tracker rows modified. Fixing the drift is a surgical operation that needs explicit approval — the operator should pick which of R1–R6 to run and when.

**Suggested order if all six are approved:** R5 (doc), R1 (archive), R4 (delete collision), R3 (collapse duplicate), R2 (timestamp repair), R6 (CI check).
