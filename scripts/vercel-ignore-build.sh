#!/usr/bin/env bash
#
# Vercel "Ignored Build Step" — decides WHICH git pushes spend a Vercel build.
#
#   exit 1  → build  (proceed with the deployment)
#   exit 0  → skip   (cancel the build; no Build CPU Minutes are billed)
#
# Policy: only the production branch auto-builds + auto-deploys. Feature / PR
# branches skip their per-push PREVIEW build by default — that is the single
# biggest line on the Vercel bill (≈half of all builds are throwaway previews
# on branches that auto-merge on the CI `build` check, not on the preview).
#
# This is SAFE because the required CI gate `build` in .github/workflows/ci.yml
# (lint + typecheck + unit tests + Playwright E2E + Lighthouse, all against
# localhost) validates every PR and does NOT depend on a Vercel preview URL.
# Branch protection on `main` requires only that `build` check.
#
# Need a real preview deployment for a specific PR (e.g. to exercise the
# preview-only `e2e-preview.yml` gate against the live URL, or to eyeball a
# risky UI/clinical change)? Put `[preview]` anywhere in the latest commit
# message and this step will build that preview.
#
# Vercel exposes VERCEL_GIT_COMMIT_REF (branch) and VERCEL_GIT_COMMIT_MESSAGE
# to this step. Docs: https://vercel.com/docs/project-configuration/vercel-json
#
# One-line revert: delete the "ignoreCommand" line from vercel.json. This
# script then goes inert and Vercel rebuilds every branch as before.

set -eu

PROD_BRANCH="main"
ref="${VERCEL_GIT_COMMIT_REF:-}"
msg="${VERCEL_GIT_COMMIT_MESSAGE:-}"

if [ "$ref" = "$PROD_BRANCH" ]; then
  echo "✓ '$ref' is the production branch — building + deploying."
  exit 1
fi

case "$msg" in
  *"[preview]"*)
    echo "✓ '[preview]' opt-in found in commit message — building preview for '$ref'."
    exit 1
    ;;
esac

echo "⏭ '$ref' is not the production branch and no [preview] opt-in — skipping build to save Build CPU Minutes."
exit 0
