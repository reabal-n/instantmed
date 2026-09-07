#!/usr/bin/env bash
set -euo pipefail
if [[ $# -ne 0 ]]; then
  echo "PostgREST fixture image does not accept source/version overrides." >&2
  exit 1
fi
# Same v14.12 manifest index in ECR and the upstream image used by Supabase's
# official docker/docker-compose.yml. Both amd64 and arm64 manifests match.
readonly DIGEST="sha256:54000f24847d01a2c2302e0041cf0618b875c57fb48507d743cfa9aaa50bf43c"
readonly IMAGES=(
  "public.ecr.aws/supabase/postgrest:v14.12@$DIGEST"
  "docker.io/postgrest/postgrest:v14.12@$DIGEST"
)
# Reuse exact content from either registry before making network requests.
for image in "${IMAGES[@]}"; do
  if docker image inspect "$image" >/dev/null 2>&1; then
    printf '%s\n' "$image"
    exit 0
  fi
done
for image in "${IMAGES[@]}"; do
  for attempt in 1 2; do
    if docker pull "$image" >&2; then
      # The digest-qualified receipt prevents a success without the pinned image.
      if ! docker image inspect "$image" >/dev/null 2>&1; then
        echo "PostgREST pull succeeded without the expected local image." >&2
        exit 1
      fi
      printf '%s\n' "$image"
      exit 0
    fi
    if [[ $attempt -eq 1 ]]; then
      echo "PostgREST image pull failed; retrying once in 5 seconds." >&2
      sleep 5
    fi
  done
done
echo "PostgREST fixture image unavailable from both pinned sources." >&2
exit 1
