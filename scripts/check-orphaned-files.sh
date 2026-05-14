#!/bin/bash
# Detect orphaned files that should have been cleaned up.
#
# Checks:
#   1. Intake step files not registered in step-registry.ts
#   2. Files under deleted route groups (/flow/)
#   3. @deprecated modules with zero imports
#   4. Superseded legacy intake engines that should not return
#   5. Retired subscription acquisition files
#   6. Stale worktree directories
#   7. Copied local artifact directories that confuse deploy/package scans
#
# Exit 1 if any orphans found.

set -euo pipefail

orphans=0

echo "Checking for orphaned files..."

# ── 1. Intake steps not in step registry ──────────────────────────────────
registry="lib/request/step-registry.ts"
if [[ -f "$registry" ]]; then
  for step_file in components/request/steps/*-step.tsx; do
    [[ -f "$step_file" ]] || continue
    # Extract component name from filename (e.g., ed-goals-step.tsx -> EdGoalsStep)
    basename_no_ext=$(basename "$step_file" .tsx)
    # Check if the step ID (kebab-case without -step suffix) appears in the registry
    step_id="${basename_no_ext%-step}"
    if ! grep -q "$step_id" "$registry" 2>/dev/null; then
      echo "ORPHAN: $step_file is not registered in $registry"
      orphans=$((orphans + 1))
    fi
  done
fi

# ── 2. Files under deleted /flow/ route group ────────────────────────────
if [[ -d "app/api/flow" ]]; then
  echo "ORPHAN: app/api/flow/ still exists (the /flow system was deleted)"
  orphans=$((orphans + 1))
fi
if [[ -d "app/flow" ]] || [[ -d "app/(flow)" ]]; then
  echo "ORPHAN: app/flow/ or app/(flow)/ still exists (the /flow system was deleted)"
  orphans=$((orphans + 1))
fi

for legacy_route in \
  "app/auth/login" \
  "app/login" \
  "app/consult/request" \
  "app/medical-certificate/request" \
  "app/admin/compliance" \
  "app/admin/email-test" \
  "app/admin/emails/page.tsx" \
  "app/admin/emails/analytics" \
  "app/admin/emails/preview" \
  "app/admin/page.tsx" \
  "app/admin/ops/doctors" \
  "app/admin/ops/sla" \
  "app/doctor/certificates" \
  "app/doctor/email-suppression" \
  "app/prescriptions/new" \
  "app/prescriptions/repeat" \
  "app/prescriptions/request"
do
  if [[ -e "$legacy_route" ]]; then
    echo "ORPHAN: $legacy_route still exists (handled by next.config.mjs redirects)"
    orphans=$((orphans + 1))
  fi
done

# ── 2b. Staff APIs retired with the unified cockpit ──────────────────────
for legacy_staff_api in \
  "app/api/admin/test-email/route.ts" \
  "app/api/doctor/assign-request/route.ts" \
  "app/api/doctor/drafts/[intakeId]/route.ts" \
  "app/api/health/dashboard/route.ts"
do
  if [[ -e "$legacy_staff_api" ]]; then
    echo "ORPHAN: $legacy_staff_api still exists (superseded by server actions or current staff health surfaces)"
    orphans=$((orphans + 1))
  fi
done

# ── 2c. Patient APIs retired by the one-off request model ────────────────
for legacy_patient_api in \
  "app/api/patient/last-prescription/route.ts" \
  "app/api/patient/refill-prescription/route.ts" \
  "app/api/patient/update-profile/route.ts"
do
  if [[ -e "$legacy_patient_api" ]]; then
    echo "ORPHAN: $legacy_patient_api still exists (superseded by one-off request flows and /api/patient/profile)"
    orphans=$((orphans + 1))
  fi
done

# ── 2d. Retired non-operational cron/test surfaces ───────────────────────
for retired_non_operational_surface in \
  "app/api/cron/acquisition-health/route.ts" \
  "app/api/cron/daily-digest/route.ts" \
  "app/api/cron/decline-reengagement/route.ts" \
  "app/api/cron/email-digest/route.ts" \
  "app/api/cron/follow-up-reminder/route.ts" \
  "app/api/test/boom/route.ts" \
  "app/api/test/boom-500/route.ts" \
  "app/api/test/edge-canary/route.ts" \
  "app/(dev)/sentry-test/page.tsx" \
  "app/admin/emails/edit" \
  "e2e/admin-crash-diagnostic.spec.ts" \
  "e2e/admin.doctor-ops.spec.ts" \
  "e2e/sentry.integration.spec.ts" \
  "e2e/sentry-observability.spec.ts" \
  "lib/email/follow-up-reminder.ts" \
  "lib/email/components/templates/decline-reengagement.tsx" \
  "lib/analytics/acquisition-health.ts"
do
  if [[ -e "$retired_non_operational_surface" ]]; then
    echo "ORPHAN: $retired_non_operational_surface still exists (retired from lean staff operations)"
    orphans=$((orphans + 1))
  fi
done

# ── 2e. Retired notification sidecars ────────────────────────────────────
for retired_notification_sidecar in \
  "components/shared/notification-bell.tsx" \
  "lib/hooks/use-notifications.ts" \
  "lib/notifications/push-notifications.ts" \
  "lib/prescriptions/refill-reminders.ts"
do
  if [[ -e "$retired_notification_sidecar" ]]; then
    echo "ORPHAN: $retired_notification_sidecar still exists (unused by the current patient shell)"
    orphans=$((orphans + 1))
  fi
done

# ── 3. @deprecated modules with zero imports ─────────────────────────────
# Exclude the guard tests themselves — they scan for the @deprecated literal
# as part of their policy, so they would always self-match.
while IFS= read -r deprecated_file; do
  [[ -f "$deprecated_file" ]] || continue
  case "$deprecated_file" in
    ./lib/__tests__/deprecated-guard.test.ts) continue ;;
    ./lib/__tests__/voice-guard.test.ts)      continue ;;
  esac
  # Get the import path (e.g., lib/foo/bar.ts -> @/lib/foo/bar)
  import_path="${deprecated_file%.ts}"
  import_path="${import_path%.tsx}"
  # Check if anything imports from this file (excluding the file itself)
  matches=$(grep -rl \
    --exclude-dir=.git \
    --exclude-dir=node_modules \
    --exclude-dir="node_modules 2" \
    --exclude-dir=.next \
    --exclude-dir=.next-stale-* \
    --exclude-dir=.worktrees \
    --exclude-dir=playwright-report \
    --exclude-dir="playwright-report 2" \
    --exclude-dir=test-results \
    "$import_path" \
    --include="*.ts" \
    --include="*.tsx" \
    . 2>/dev/null || true)
  import_count=$(printf "%s\n" "$matches" \
    | grep -vF "$deprecated_file" || true)
  import_count=$(printf "%s\n" "$import_count" | sed '/^$/d' | wc -l | tr -d ' ')
  if [[ "$import_count" -eq 0 ]]; then
    echo "ORPHAN: $deprecated_file is @deprecated with 0 imports"
    orphans=$((orphans + 1))
  fi
done < <(grep -rl \
  --exclude-dir=.git \
  --exclude-dir=node_modules \
  --exclude-dir="node_modules 2" \
  --exclude-dir=.next \
  --exclude-dir=.next-stale-* \
  --exclude-dir=.worktrees \
  --exclude-dir=playwright-report \
  --exclude-dir="playwright-report 2" \
  --exclude-dir=test-results \
  "@deprecated" \
  --include="*.ts" \
  --include="*.tsx" \
  . 2>/dev/null)

# ── 4. Superseded intake engines ──────────────────────────────────────────
for legacy_intake_module in \
  "lib/intake/flow-configs.ts" \
  "lib/intake/flow-engine.ts" \
  "lib/intake/chat-flow-v2.ts"
do
  if [[ -e "$legacy_intake_module" ]]; then
    echo "ORPHAN: $legacy_intake_module still exists (superseded by lib/request/step-registry.ts and current AI intake routes)"
    orphans=$((orphans + 1))
  fi
done

# ── 5. Retired subscription acquisition files ─────────────────────────────
for retired_subscription_file in \
  "app/api/cron/subscription-nudge/route.ts" \
  "lib/data/subscriptions.ts" \
  "lib/email/subscription-nudge.ts" \
  "components/email/templates/subscription-nudge.tsx" \
  "lib/email/components/templates/subscription-nudge.tsx" \
  "components/patient/subscription-card.tsx" \
  "app/api/stripe/customer-portal/route.ts" \
  "app/api/stripe/webhook/handlers/invoice-payment-succeeded.ts" \
  "app/api/stripe/webhook/handlers/invoice-payment-failed.ts" \
  "app/api/stripe/webhook/handlers/customer-subscription-deleted.ts" \
  "app/api/stripe/webhook/handlers/customer-subscription-updated.ts" \
  "lib/email/components/templates/subscription-cancelled.tsx"
do
  if [[ -e "$retired_subscription_file" ]]; then
    echo "ORPHAN: $retired_subscription_file still exists (repeat-Rx subscription acquisition is retired)"
    orphans=$((orphans + 1))
  fi
done

# ── 6. Stale worktree directories ────────────────────────────────────────
if [[ -d ".worktrees" ]]; then
  # registered = total git worktrees (includes main worktree, so subtract 1 for linked count)
  registered_total=$(git worktree list --porcelain 2>/dev/null | grep "^worktree " | wc -l | tr -d ' ')
  linked_registered=$((registered_total - 1))
  ondisk=$(find .worktrees -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$ondisk" -gt "$linked_registered" ]]; then
    echo "WARNING: .worktrees/ has $ondisk directories but only $linked_registered linked worktrees registered with git"
    orphans=$((orphans + 1))
  fi
fi

# ── 7. Copied local artifacts ─────────────────────────────────────────────
for generated_artifact in \
  "node_modules 2" \
  "playwright-report 2" \
  "test-results 2" \
  "coverage 2"
do
  if [[ -e "$generated_artifact" ]]; then
    echo "ORPHAN: $generated_artifact exists (copied local artifact; remove it before deploy)"
    orphans=$((orphans + 1))
  fi
done

# ── Results ──────────────────────────────────────────────────────────────
if [[ $orphans -gt 0 ]]; then
  echo ""
  echo "Found $orphans orphaned file(s). Clean up before deploying."
  exit 1
fi

echo "No orphaned files found."
