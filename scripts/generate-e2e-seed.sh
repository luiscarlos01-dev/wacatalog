#!/usr/bin/env bash
# Renders supabase/seed.sql.template into supabase/seed.sql using the
# E2E_* fixture credentials from the environment (.env locally, secrets in CI).
# Run before `supabase start`/`supabase db reset` — Supabase applies
# supabase/seed.sql automatically after migrations.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

required_vars=(
  E2E_ADMIN_EMAIL
  E2E_ADMIN_PASSWORD
  E2E_SECOND_ADMIN_EMAIL
  E2E_SECOND_ADMIN_PASSWORD
  E2E_UNAFFILIATED_ADMIN_EMAIL
  E2E_UNAFFILIATED_ADMIN_PASSWORD
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "Error: $var must be set (source .env locally, or export it in CI) before generating the seed." >&2
    exit 1
  fi
done

envsubst \
  '${E2E_ADMIN_EMAIL} ${E2E_ADMIN_PASSWORD} ${E2E_SECOND_ADMIN_EMAIL} ${E2E_SECOND_ADMIN_PASSWORD} ${E2E_UNAFFILIATED_ADMIN_EMAIL} ${E2E_UNAFFILIATED_ADMIN_PASSWORD}' \
  < supabase/seed.sql.template \
  > supabase/seed.sql

echo "Generated supabase/seed.sql"
