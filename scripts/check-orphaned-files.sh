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
#   8. Raw browser review evidence that should use expiring artifact storage
#   9. Retired public assets with no runtime consumers
#  10. Retired vacuous E2E specs
#  11. Superseded staff and data sidecars
#  12. Unused copy catalogs and parallel flow models
#  13. Superseded validation and formatting helpers
#  14. Retired synthetic patient-count plumbing
#  15. Obsolete analytics, blog-image, and SEO engines
#  16. Superseded marketing mockups and wrappers
#  17. Abandoned specialty landing experiments
#  18. Retired generic service funnel layer
#  19. Test-only production modules and compatibility shims
#  20. Barrel-masked zero-consumer leaves
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
  "app/prescriptions/[subtype]" \
  "app/doctor/certificates" \
  "app/doctor/email-suppression" \
  "app/doctor/scripts" \
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
  "app/api/doctor/onboarding-status/route.ts" \
  "app/api/health/dashboard/route.ts"
do
  if [[ -e "$legacy_staff_api" ]]; then
    echo "ORPHAN: $legacy_staff_api still exists (superseded by server actions or current staff health surfaces)"
    orphans=$((orphans + 1))
  fi
done

# ── 2b.1. Retired public API surfaces ───────────────────────────────────
# PBS medication lookup retired 2026-06-28 (#208 + dead-code sweep): the
# medication step is free-text now; the doctor confirms the medicine in
# Parchment/MIMS. Both the old /api/medications and its /search successor
# are gone — flag either if it ever comes back.
for legacy_public_api in \
  "app/api/medications/route.ts" \
  "app/api/medications/search/route.ts"
do
  if [[ -e "$legacy_public_api" ]]; then
    echo "ORPHAN: $legacy_public_api still exists (PBS medication lookup retired 2026-06-28 — medication step is free-text)"
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
  "app/api/cron/scheduled-maintenance/route.ts" \
  "app/api/cron/treatment-followup/route.ts" \
  "app/api/test/boom/route.ts" \
  "app/api/test/boom-500/route.ts" \
  "app/api/test/edge-canary/route.ts" \
  "app/(dev)/sentry-test/page.tsx" \
  "app/admin/emails/edit" \
  "e2e/admin-crash-diagnostic.spec.ts" \
  "e2e/admin.doctor-ops.spec.ts" \
  "e2e/sentry.integration.spec.ts" \
  "e2e/sentry-observability.spec.ts" \
  "lib/config/operational-config.ts" \
  "lib/email/follow-up-reminder.ts" \
  "lib/email/treatment-followup.ts" \
  "lib/email/components/templates/decline-reengagement.tsx" \
  "lib/email/components/templates/exit-intent-last-chance.tsx" \
  "lib/email/components/templates/exit-intent-reminder.tsx" \
  "lib/email/components/templates/exit-intent-social-proof.tsx" \
  "lib/email/components/templates/follow-up-reminder.tsx" \
  "lib/email/components/templates/review-followup.tsx" \
  "lib/email/components/templates/treatment-followup.tsx" \
  "lib/crypto/exit-intent-token.ts" \
  "lib/data/followups.ts" \
  "lib/validation/followup-schema.ts" \
  "app/actions/followups.ts" \
  "app/patient/followups/[id]/page.tsx" \
  "app/patient/followups/[id]/followup-form.tsx" \
  "app/patient/followups/[id]/loading.tsx" \
  "app/patient/followups/[id]/skip/route.ts" \
  "components/patient/followup-tracker-card.tsx" \
  "lib/analytics/acquisition-health.ts" \
  "lib/__tests__/followups-actions-schema.test.ts" \
  "lib/__tests__/scheduled-maintenance-cron.test.ts"
do
  if [[ -e "$retired_non_operational_surface" ]]; then
    echo "ORPHAN: $retired_non_operational_surface still exists (retired from lean staff operations)"
    orphans=$((orphans + 1))
  fi
done

# ── 2e. Retired notification sidecars ────────────────────────────────────
for retired_notification_sidecar in \
  "components/shared/notification-bell.tsx" \
  "app/patient/notifications/page.tsx" \
  "app/patient/notifications/notifications-client.tsx" \
  "app/patient/notifications/error.tsx" \
  "app/patient/notifications/loading.tsx" \
  "lib/hooks/use-notifications.ts" \
  "lib/notifications/push-notifications.ts" \
  "lib/prescriptions/refill-reminders.ts"
do
  if [[ -e "$retired_notification_sidecar" ]]; then
    echo "ORPHAN: $retired_notification_sidecar still exists (unused by the current patient shell)"
    orphans=$((orphans + 1))
  fi
done

# ── 2f. Retired duplicate patient record summary ─────────────────────────
for retired_patient_summary_surface in \
  "app/patient/health-summary/page.tsx" \
  "app/patient/health-summary/client.tsx" \
  "app/patient/health-summary/error.tsx" \
  "app/patient/health-summary/loading.tsx" \
  "lib/data/health-summary.ts"
do
  if [[ -e "$retired_patient_summary_surface" ]]; then
    echo "ORPHAN: $retired_patient_summary_surface still exists (duplicated requests, documents, and prescriptions)"
    orphans=$((orphans + 1))
  fi
done

# ── 2g. Retired patient new-request modal ─────────────────────────────────
for retired_patient_new_request_modal in \
  "app/patient/@modal/new-request/page.tsx" \
  "app/patient/@modal/default.tsx" \
  "app/patient/default.tsx"
do
  if [[ -e "$retired_patient_new_request_modal" ]]; then
    echo "ORPHAN: $retired_patient_new_request_modal still exists (superseded by canonical /request service selector)"
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
  "app/api/ai/clinical-note/route.ts" \
  "app/api/ai/form-validation/route.ts" \
  "app/api/ai/med-cert-draft/route.ts" \
  "app/api/ai/symptom-suggestions/route.ts" \
  "lib/ai/audit.ts" \
  "lib/ai/cache.ts" \
  "lib/ai/confidence.ts" \
  "lib/ai/index.ts" \
  "lib/ai/intelligent-suggestions.ts" \
  "lib/intake/ai-collection-boundaries.ts" \
  "lib/intake/doctor-summary-format.ts" \
  "lib/intake/form-transition.ts" \
  "lib/intake/progress-persistence.ts" \
  "lib/intake/structured-intake-schema.ts" \
  "lib/intake/flow-configs.ts" \
  "lib/intake/flow-engine.ts" \
  "lib/intake/chat-flow-v2.ts" \
  "lib/monitoring/ai-health.ts"
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

# ── 8. Tracked raw review evidence ───────────────────────────────────────
while IFS= read -r tracked_review_file; do
  case "$tracked_review_file" in
    *.har|*/trace.zip|*.webm|*/critique.raw.txt)
      echo "ORPHAN: $tracked_review_file is raw review evidence and must use expiring artifact storage"
      orphans=$((orphans + 1))
      ;;
  esac
done < <(git ls-files docs/reviews)

while IFS= read -r tracked_review_markdown; do
  [[ -f "$tracked_review_markdown" ]] || continue
  if grep -Eq '\.(har|webm)|trace\.zip|video=captures/' "$tracked_review_markdown"; then
    echo "ORPHAN: $tracked_review_markdown references raw review evidence that is not committed"
    orphans=$((orphans + 1))
  fi
done < <(git ls-files 'docs/reviews/**/*.md')

# ── 9. Retired public assets ───────────────────────────────────────────────
for retired_public_asset in \
  "public/animations/Confetti.json" \
  "public/animations/Empty State.json" \
  "public/animations/Error.json" \
  "public/animations/Loading Files.json" \
  "public/animations/Loading.json" \
  "public/animations/Notification.json" \
  "public/animations/Success.json" \
  "public/sounds/notification.mp3" \
  "public/placeholder.svg" \
  "public/images/ed-1.webp" \
  "public/images/ed-2.webp" \
  "public/icons/stickers/bandage.svg" \
  "public/icons/stickers/brain.svg" \
  "public/icons/stickers/lungs.svg" \
  "public/icons/stickers/no-mobile.svg" \
  "public/icons/stickers/syringe.svg" \
  "public/icons/stickers/verified-badge.svg" \
  "public/logos/JMIRO.png" \
  "public/logos/NHMRC.png" \
  "public/logos/RACGP.png" \
  "public/logos/RANZCR.png" \
  "public/logos/acpsem.png" \
  "public/logos/anthropic.png" \
  "public/logos/claude.png" \
  "public/logos/clerk.png" \
  "public/logos/eRx.png" \
  "public/logos/next.js.png" \
  "public/logos/stripe.png" \
  "public/logos/supabase.png" \
  "public/logos/vercel.png" \
  "public/logos/wiley.png" \
  "public/logos/payment/paypal.svg"
do
  if [[ -e "$retired_public_asset" ]]; then
    echo "ORPHAN: $retired_public_asset still exists (retired public asset with no runtime consumers)"
    orphans=$((orphans + 1))
  fi
done

# ── 10. Retired vacuous E2E specs ─────────────────────────────────────────
for retired_e2e_spec in \
  "e2e/admin.decline-flow.spec.ts" \
  "e2e/dashboard.keyboard-nav.spec.ts" \
  "e2e/patient.certificate-download.spec.ts"
do
  if [[ -e "$retired_e2e_spec" ]]; then
    echo "ORPHAN: $retired_e2e_spec still exists (retired duplicate or vacuous E2E coverage)"
    orphans=$((orphans + 1))
  fi
done

# ── 11. Superseded staff and data sidecars ────────────────────────────────
for retired_staff_sidecar in \
  "app/actions/decline-bulk.ts" \
  "app/actions/render-test-email.ts" \
  "app/actions/safety-symptoms.ts" \
  "app/doctor/intakes/[id]/intake-decline-dialog.tsx" \
  "app/doctor/patients/manual-patient-dialog.tsx" \
  "components/doctor/review/clinical-notes-editor.tsx" \
  "components/doctor/review/formatting-toolbar.tsx" \
  "components/doctor/review/patient-info-card.tsx" \
  "lib/data/consultation-types.ts" \
  "lib/data/queue-availability.ts" \
  "lib/doctor/session-timeout.ts"
do
  if [[ -e "$retired_staff_sidecar" ]]; then
    echo "ORPHAN: $retired_staff_sidecar still exists (superseded staff or data sidecar)"
    orphans=$((orphans + 1))
  fi
done

# ── 12. Unused copy catalogs and parallel flow models ────────────────────
for retired_catalog in \
  "lib/microcopy/buttons.ts" \
  "lib/microcopy/errors.ts" \
  "lib/microcopy/feedback.ts" \
  "lib/microcopy/prescription.ts" \
  "lib/microcopy/referral.ts" \
  "lib/microcopy/repeat-rx.ts" \
  "types/marketing.ts" \
  "types/med-cert.ts" \
  "types/repeat-rx.ts"
do
  if [[ -e "$retired_catalog" ]]; then
    echo "ORPHAN: $retired_catalog still exists (unused copy catalog or parallel flow model)"
    orphans=$((orphans + 1))
  fi
done

# ── 13. Superseded validation and formatting helpers ─────────────────────
for retired_helper in \
  "lib/api/responses.ts" \
  "lib/format/service.ts" \
  "lib/utils/form-formatting.ts" \
  "lib/utils/idempotency.ts" \
  "lib/validation/dates.ts" \
  "lib/validation/schemas.ts"
do
  if [[ -e "$retired_helper" ]]; then
    echo "ORPHAN: $retired_helper still exists (superseded validation or formatting helper)"
    orphans=$((orphans + 1))
  fi
done

# ── 14. Retired synthetic patient-count plumbing ────────────────────────
for retired_patient_count_path in \
  "app/api/patient-count/route.ts" \
  "lib/hooks/use-patient-count.ts" \
  "lib/social-proof/server.ts" \
  "lib/__tests__/contact-hydration-contract.test.ts"
do
  if [[ -e "$retired_patient_count_path" ]]; then
    echo "ORPHAN: $retired_patient_count_path still exists (synthetic patient-count plumbing)"
    orphans=$((orphans + 1))
  fi
done

# ── 15. Obsolete analytics, blog-image, and SEO engines ─────────────────
for retired_content_helper in \
  "lib/analytics/ab-test.ts" \
  "lib/blog/images.ts" \
  "lib/data/analytics.ts" \
  "lib/seo/comparisons.ts" \
  "lib/seo/linking.ts" \
  "lib/seo/metadata.ts"
do
  if [[ -e "$retired_content_helper" ]]; then
    echo "ORPHAN: $retired_content_helper still exists (obsolete analytics, blog-image, or SEO engine)"
    orphans=$((orphans + 1))
  fi
done

# ── 16. Superseded marketing mockups and wrappers ───────────────────────
for retired_mockup in \
  "components/marketing/mockups/certificate-showcase.tsx" \
  "components/marketing/mockups/certificate.tsx" \
  "components/marketing/mockups/consult-chat-mockup.tsx" \
  "components/marketing/mockups/consult.tsx" \
  "components/marketing/mockups/ed-hero-mockup.tsx" \
  "components/marketing/mockups/escript.tsx" \
  "components/marketing/mockups/hair-loss-hero-mockup.tsx" \
  "components/marketing/mockups/how-it-works-steps.tsx" \
  "components/marketing/compliance-marquee.tsx" \
  "components/marketing/floating-card.tsx" \
  "components/marketing/how-it-works.tsx" \
  "components/marketing/service-cards.tsx" \
  "components/marketing/sections/certificate-preview-section.tsx" \
  "components/marketing/sections/how-it-works-section.tsx"
do
  if [[ -e "$retired_mockup" ]]; then
    echo "ORPHAN: $retired_mockup still exists (superseded marketing mockup or wrapper)"
    orphans=$((orphans + 1))
  fi
done

# ── 17. Abandoned specialty landing experiments ─────────────────────────
for retired_specialty_section in \
  "components/marketing/sections/ed-hook-quiz.tsx" \
  "components/marketing/sections/ed-mechanism-explainer.tsx" \
  "components/marketing/sections/ed-outcomes-section.tsx" \
  "components/marketing/sections/ed-prevalence-calculator.tsx" \
  "components/marketing/sections/hair-loss-family-history-strip.tsx" \
  "components/marketing/sections/hair-loss-hook-quiz.tsx" \
  "components/marketing/sections/hair-loss-limitations-section.tsx" \
  "components/marketing/sections/hair-loss-progress-timeline.tsx"
do
  if [[ -e "$retired_specialty_section" ]]; then
    echo "ORPHAN: $retired_specialty_section still exists (abandoned specialty landing experiment)"
    orphans=$((orphans + 1))
  fi
done

# ── 18. Retired generic service funnel layer ────────────────────────────
for retired_funnel_section in \
  "components/marketing/sections/certificate-type-selector.tsx" \
  "components/marketing/sections/common-concerns-section.tsx" \
  "components/marketing/sections/consult-guide-section.tsx" \
  "components/marketing/sections/consult-limitations-section.tsx" \
  "components/marketing/sections/escript-explainer-section.tsx" \
  "components/marketing/sections/expect-call-strip.tsx" \
  "components/marketing/sections/final-cta-section.tsx" \
  "components/marketing/sections/med-cert-guide-section.tsx" \
  "components/marketing/sections/competitor-links-section.tsx" \
  "components/marketing/sections/pricing-guide-section.tsx" \
  "components/marketing/sections/pricing-section.tsx" \
  "components/marketing/sections/prescription-limitations-section.tsx" \
  "components/marketing/sections/specialised-consults-section.tsx"
do
  if [[ -e "$retired_funnel_section" ]]; then
    echo "ORPHAN: $retired_funnel_section still exists (retired generic service funnel layer)"
    orphans=$((orphans + 1))
  fi
done

# ── 19. Test-only production modules and compatibility shims ────────────
for retired_test_only_module in \
  "components/doctor/queue-shortcut-hint.tsx" \
  "lib/data/intakes/format.ts" \
  "lib/data/types/certificate-templates.ts" \
  "lib/doctor/onboarding-state.ts" \
  "lib/marketing/ed-prevalence-data.ts" \
  "lib/marketing/hair-loss-hook-quiz.ts" \
  "lib/safety/index.ts"
do
  if [[ -e "$retired_test_only_module" ]]; then
    echo "ORPHAN: $retired_test_only_module still exists (test-only production module or compatibility shim)"
    orphans=$((orphans + 1))
  fi
done

# ── 20. Barrel-masked zero-consumer leaves ──────────────────────────────
for retired_barrel_leaf in \
  "components/dashboard/dashboard-empty.tsx" \
  "components/doctor/identity-incomplete-banner.tsx" \
  "components/heroes/full-bleed-hero.tsx" \
  "components/operator/staff-command-palette.tsx" \
  "components/ui/progress.tsx" \
  "components/uix/README.md" \
  "components/uix/accordion.tsx" \
  "components/uix/modal.tsx" \
  "components/uix/stepper.tsx"
do
  if [[ -e "$retired_barrel_leaf" ]]; then
    echo "ORPHAN: $retired_barrel_leaf still exists (barrel-masked zero-consumer leaf)"
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
