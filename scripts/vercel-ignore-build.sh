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
# validates every PR with lint, typecheck, unit tests, and a production build
# without depending on a Vercel preview URL. Lighthouse is a separate local
# gate; shared-fixture Playwright E2E runs for every non-Markdown change and
# fails closed when change scope is unknown. The main ruleset requires strict,
# up-to-date `build` and `e2e` checks; Vercel status is not a merge gate.
#
# Need a real preview deployment for a specific PR (e.g. to exercise the
# preview-only `e2e-preview.yml` gate against the live URL, or to eyeball a
# risky UI/clinical change)? Put `[preview]` anywhere in the latest commit
# message and this step will build that preview.
#
# Vercel exposes VERCEL_GIT_COMMIT_REF (branch), VERCEL_GIT_COMMIT_MESSAGE, and
# VERCEL_GIT_PREVIOUS_SHA (last successful branch deployment) to this step.
# Docs: https://vercel.com/docs/project-configuration/vercel-json
#
# One-line revert: delete the "ignoreCommand" line from vercel.json. This
# script then goes inert and Vercel rebuilds every branch as before.

set -eu

PROD_BRANCH="main"
ref="${VERCEL_GIT_COMMIT_REF:-}"
msg="${VERCEL_GIT_COMMIT_MESSAGE:-}"
previous_sha="${VERCEL_GIT_PREVIOUS_SHA:-}"

if [ "$ref" = "$PROD_BRANCH" ]; then
  # Force a prod build/deploy for an otherwise-skippable commit with [deploy].
  # NB: matches the token ANYWHERE in the message — don't write the literal
  # token in prose (e.g. a docs commit about this gate) or it self-triggers.
  case "$msg" in
    *"[deploy]"*)
      echo "✓ '[deploy]' override on main — building + deploying."
      exit 1
      ;;
  esac

  # Cost control: even on main, skip the full prod build when the complete range
  # since the last successful deployment ONLY touches paths that never reach the
  # built/served app — docs, markdown, e2e specs, unit tests, CI config. Comparing
  # the deployed SHA (not merely HEAD^) is essential for batched pushes whose
  # final commit is docs-only but whose earlier commits contain runtime changes.
  # ~26% of recent main commits (73/284 in 30d) were docs/test-only = wasted
  # Build CPU Minutes. FAIL-SAFE: if the diff can't be computed (shallow clone,
  # root commit, empty), we BUILD. Allowlist is conservative — scripts/, public/,
  # supabase/, package.json, the lockfile, and all of app|components|lib
  # (non-test) are treated as runtime and always build.
  #
  # Vercel exposes VERCEL_GIT_PREVIOUS_SHA as the last successful deployment for
  # this project and branch. Its shallow clone may not contain that commit, so
  # fetch the exact object when needed. A missing/malformed/unreadable SHA or an
  # unreadable/empty diff always fails safe to BUILD.
  changed=""
  diff_ready="false"
  if printf '%s' "$previous_sha" | grep -Eq '^[0-9a-fA-F]{40}$' &&
    [ "$previous_sha" != "0000000000000000000000000000000000000000" ]; then
    git cat-file -e "${previous_sha}^{commit}" >/dev/null 2>&1 ||
      git fetch --depth=1 --quiet origin "$previous_sha" >/dev/null 2>&1 || true
    if git cat-file -e "${previous_sha}^{commit}" >/dev/null 2>&1; then
      # Disable rename detection so moving runtime code into an ignored path
      # still exposes the runtime deletion as well as the ignored addition.
      if changed="$(git diff --no-renames --name-only "$previous_sha" HEAD 2>/dev/null)"; then
        diff_ready="true"
      fi
    fi
  fi

  if [ "$diff_ready" = "true" ] && [ -n "$changed" ]; then
    runtime="$(printf '%s\n' "$changed" | grep -vE '(^docs/)|(^\.github/)|(^e2e/)|(\.md$)|(/__tests__/)|(\.test\.)|(\.spec\.)' || true)"
    if [ -z "$runtime" ]; then
      echo "⏭ main changes since the last successful deployment touch only non-runtime paths — skipping prod build to save Build CPU Minutes:"
      printf '%s\n' "$changed" | sed 's/^/    /'
      exit 0
    fi
  fi

  echo "✓ '$ref' is the production branch with runtime changes — building + deploying."
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
