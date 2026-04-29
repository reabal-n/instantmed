#!/bin/bash
# Portal design-system compliance smoke check.
#
# Asserts that the patient portal source tree (`app/patient/**` and
# `components/patient/**`) contains zero references to legacy classes
# and patterns that contradict Morning Canvas (docs/DESIGN_SYSTEM.md):
#
#   - glass-card                     (legacy 21st.dev glass-forward shim, banned)
#   - dashboard-card / dashboard-bg  (raw className use; route through <DashboardCard>)
#   - hover-lift / magnetic-button   (legacy CSS effects; not part of canon)
#   - bg-gradient-to-* / bg-linear-to-*  (gradients on content surfaces, §5)
#   - border-l-[2-9] / border-l-1[0-9]   (left-stripe accents, §17 absolute_bans)
#   - border-violet / bg-violet      (purple banned outside --service-referral, §1)
#   - text-orange-*  (raw orange used outside §10 severity context)
#
# The check intentionally allows §10-sanctioned `bg-orange-100/700` etc on
# severity badges; any new orange usage must be a "bg-orange-100" pair, not
# the older `text-orange-700` ad-hoc combo.
#
# Exit 1 if any violations found. Add to CI in .github/workflows/ci.yml.

set -euo pipefail

failures=0
TARGETS=(
  "app/patient"
  "components/patient"
)

# Pattern => human-readable description
declare -a CHECKS=(
  'glass-card|legacy 21st.dev glass-forward class. Use <DashboardCard> from components/dashboard.'
  'dashboard-card|raw legacy className. Use <DashboardCard tier> primitive instead.'
  'dashboard-bg|raw legacy background. Use Tailwind bg-background or omit (canonical default).'
  'dashboard-card-elevated|deleted in v2.0.0. Use <DashboardCard tier="elevated">.'
  'dashboard-stat|deleted in v2.0.0. Use <StatCard> from components/dashboard.'
  'glow-badge|legacy neon glow. Use <StatusBadge> from components/dashboard.'
  'dashboard-spotlight|deleted in v2.0.0 (cursor-following effect, banned).'
  'dashboard-grid|deleted in v2.0.0 (CSS stagger). Use Framer stagger from lib/motion.'
  'dashboard-empty|legacy class. Use <DashboardEmpty> primitive.'
  'dashboard-header|legacy class. Use <DashboardPageHeader> or <DashboardHeader> primitives.'
  'dashboard-sidebar|deleted in v2.0.0 (frosted-glass sidebar pattern).'
  'dashboard-nav-item|deleted in v2.0.0.'
  'dashboard-row|deleted in v2.0.0.'
  'dashboard-divider|deleted in v2.0.0.'
  'dashboard-section-title|deleted in v2.0.0. Use <DashboardSection title>.'
  'magnetic-button|legacy decorative class. Remove (or use canonical button hover pattern).'
  'hover-lift|legacy decorative class. Use canonical hover:-translate-y-0.5 pattern.'
  'bg-gradient-to-|gradient on content surface, banned by §5. Use solid tint.'
  'bg-linear-to-|gradient on content surface, banned by §5. Use solid tint.'
  'border-l-[2-9]|colored left-stripe accent, banned by impeccable <absolute_bans>.'
  'border-l-1[0-9]|colored left-stripe accent, banned by impeccable <absolute_bans>.'
  'border-violet|purple/violet banned outside --service-referral (§1).'
  'bg-violet|purple/violet banned outside --service-referral (§1).'
  'text-violet|purple/violet banned outside --service-referral (§1).'
)

for target in "${TARGETS[@]}"; do
  if [[ ! -d "$target" ]]; then
    continue
  fi

  for check in "${CHECKS[@]}"; do
    pattern="${check%%|*}"
    msg="${check#*|}"

    matches=$(grep -rEl --include="*.tsx" --include="*.ts" "$pattern" "$target" 2>/dev/null || true)
    if [[ -n "$matches" ]]; then
      while IFS= read -r file; do
        # Filter out:
        #   1. Lines containing `portal-shim:allow` (same-line allowlist)
        #   2. Lines whose IMMEDIATELY PRECEDING line contains the marker
        #      (allows the marker to live on a comment line above the JSX)
        raw_lines=$(grep -nE "$pattern" "$file" || true)
        if [[ -z "$raw_lines" ]]; then
          continue
        fi
        kept_lines=""
        while IFS= read -r line; do
          [[ -z "$line" ]] && continue
          # Same-line marker?
          if [[ "$line" == *'portal-shim:allow'* ]]; then
            continue
          fi
          # Previous line marker?
          line_no="${line%%:*}"
          prev_line_no=$((line_no - 1))
          if [[ $prev_line_no -gt 0 ]]; then
            prev_text=$(sed -n "${prev_line_no}p" "$file")
            if [[ "$prev_text" == *'portal-shim:allow'* ]]; then
              continue
            fi
          fi
          kept_lines+="${line}"$'\n'
        done <<< "$raw_lines"

        if [[ -z "$kept_lines" ]]; then
          continue
        fi
        echo "VIOLATION: $pattern in $file"
        echo "  Reason: $msg"
        while IFS= read -r line; do
          [[ -z "$line" ]] && continue
          echo "  $line"
        done <<< "$kept_lines"
        failures=$((failures + 1))
      done <<< "$matches"
    fi
  done
done

if [[ $failures -gt 0 ]]; then
  echo ""
  echo "Found $failures legacy-class violation(s) in patient portal source."
  echo "See docs/DESIGN_SYSTEM.md and the design-system v2.0.0 migration table."
  exit 1
fi

echo "Patient portal: clean. No legacy classes detected."
