#!/bin/bash

# Batch migrate old logger to new observability logger
# Usage: ./scripts/migrate-logger.sh

echo "🔄 Migrating logger imports across 22 files..."

# Files to migrate
files=(
  "app/prescriptions/request/prescription-flow-client.tsx"
  "app/api/search/route.ts"
  "app/api/ai/decline-reason/route.ts"
  "app/api/med-cert/render/route.ts"
  "app/api/internal/send-status-email/route.ts"
  "app/api/med-cert/preview/route.ts"
  "app/api/med-cert/submit/route.ts"
  "app/api/ai/clinical-note/route.ts"
  "app/api/med-cert/[id]/decision/route.ts"
  "app/api/medications/route.ts"
  "app/api/repeat-rx/submit/route.ts"
  "app/api/repeat-rx/[id]/decision/route.ts"
  "app/api/patient/documents/[requestId]/download/route.ts"
  "app/actions/signup.ts"
  "app/actions/resend-certificate.ts"
  "app/actions/create-request.ts"
  "app/actions/amend-request.ts"
  "app/actions/save-draft.ts"
  "app/doctor/actions/med-cert.ts"
  "app/doctor/requests/[id]/actions.ts"
  "app/medical-certificate/new/client.tsx"
  "app/error.tsx"
)

count=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  📝 Migrating $file..."
    
    # Replace import statement
    sed -i '' 's/import { logger } from "@\/lib\/logger"/import { createLogger } from "@\/lib\/observability\/logger"\nconst log = createLogger("'$(basename "$file" | sed 's/\.[^.]*$//')'")/g' "$file"
    
    # Replace logger.error calls
    sed -i '' 's/logger\.error(/log.error(/g' "$file"
    sed -i '' 's/logger\.warn(/log.warn(/g' "$file"
    sed -i '' 's/logger\.info(/log.info(/g' "$file"
    
    ((count++))
  else
    echo "  ⚠️  File not found: $file"
  fi
done

echo ""
echo "✅ Migration complete! Updated $count files."
echo ""
echo "⚠️  IMPORTANT: Review the changes before committing!"
echo "   Some logger calls may need manual adjustment for proper context parameters."
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Test critical routes (Stripe webhook, med-cert routes)"
echo "  3. Commit changes: git add . && git commit -m 'Migrate to observability logger'"
