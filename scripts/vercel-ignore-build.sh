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
# fails closed when change scope is unknown. Branch protection on `main`
# requires only the `build` check.
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
  # Force a prod build/deploy for an otherwise-skippable commit with [deploy].
  # NB: matches the token ANYWHERE in the message — don't write the literal
  # token in prose (e.g. a docs commit about this gate) or it self-triggers.
  case "$msg" in
    *"[deploy]"*)
      echo "✓ '[deploy]' override on main — building + deploying."
      exit 1
      ;;
  esac

  # Cost control: even on main, skip the full prod build when the commit ONLY
  # touches paths that never reach the built/served app — docs, markdown, e2e
  # specs, unit tests, CI config. The change still lands in the repo and ships
  # with the next runtime deploy; prod runtime is unchanged by these files.
  # ~26% of recent main commits (73/284 in 30d) were docs/test-only = wasted
  # Build CPU Minutes. FAIL-SAFE: if the diff can't be computed (shallow clone,
  # root commit, empty), we BUILD. Allowlist is conservative — scripts/, public/,
  # supabase/, package.json, the lockfile, and all of app|components|lib
  # (non-test) are treated as runtime and always build.
  #
  # Vercel's Ignored Build Step runs in a shallow clone (often depth 1) where
  # HEAD^ is absent — without this the diff is empty and we fail safe to BUILD
  # every time, silently defeating the skip. Deepen by one commit so HEAD^
  # resolves; if the fetch can't run, `changed` stays empty and we still build.
  git rev-parse --verify -q HEAD^ >/dev/null 2>&1 || git fetch --deepen=1 --quiet >/dev/null 2>&1 || true
  changed="$(git diff --name-only HEAD^ HEAD 2>/dev/null || true)"
  if [ -n "$changed" ]; then
    runtime="$(printf '%s\n' "$changed" | grep -vE '(^docs/)|(^\.github/)|(^e2e/)|(\.md$)|(/__tests__/)|(\.test\.)|(\.spec\.)' || true)"
    if [ -z "$runtime" ]; then
      echo "⏭ main commit touches only non-runtime paths — skipping prod build to save Build CPU Minutes:"
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
