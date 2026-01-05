#!/bin/bash
# UI Color Fix Script - InstantMed Platform
# This script automatically fixes common color system violations
# Run from project root: ./scripts/fix-ui-colors.sh

set -e

echo "🎨 InstantMed UI Color Fix Script"
echo "================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Count changes
total_changes=0

echo "📋 Phase 1: Fixing bg-blue-* violations..."

# Fix bg-blue-500 -> bg-primary
count=$(find app components -type f \( -name "*.tsx" -o -name "*.ts" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -exec grep -l "bg-blue-500" {} + 2>/dev/null | wc -l | tr -d ' ')

if [ "$count" -gt 0 ]; then
  find app components -type f \( -name "*.tsx" -o -name "*.ts" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.next/*" \
    -exec sed -i '' 's/bg-blue-500/bg-primary/g' {} +
  echo -e "${GREEN}✓${NC} Fixed bg-blue-500 in $count files"
  total_changes=$((total_changes + count))
fi

# Fix bg-blue-600 -> bg-primary
count=$(find app components -type f \( -name "*.tsx" -o -name "*.ts" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -exec grep -l "bg-blue-600" {} + 2>/dev/null | wc -l | tr -d ' ')

if [ "$count" -gt 0 ]; then
  find app components -type f \( -name "*.tsx" -o -name "*.ts" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.next/*" \
    -exec sed -i '' 's/bg-blue-600/bg-primary/g' {} +
  echo -e "${GREEN}✓${NC} Fixed bg-blue-600 in $count files"
  total_changes=$((total_changes + count))
fi

# Fix bg-blue-700 -> bg-primary/90
count=$(find app components -type f \( -name "*.tsx" -o -name "*.ts" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -exec grep -l "bg-blue-700" {} + 2>/dev/null | wc -l | tr -d ' ')

if [ "$count" -gt 0 ]; then
  find app components -type f \( -name "*.tsx" -o -name "*.ts" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.next/*" \
    -exec sed -i '' 's/bg-blue-700/bg-primary\/90/g' {} +
  echo -e "${GREEN}✓${NC} Fixed bg-blue-700 in $count files"
  total_changes=$((total_changes + count))
fi

echo ""
echo "📋 Phase 2: Fixing text-blue-* violations..."

# Fix text-blue-600 -> text-primary
count=$(find app components -type f \( -name "*.tsx" -o -name "*.ts" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -exec grep -l "text-blue-600" {} + 2>/dev/null | wc -l | tr -d ' ')

if [ "$count" -gt 0 ]; then
  find app components -type f \( -name "*.tsx" -o -name "*.ts" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.next/*" \
    -exec sed -i '' 's/text-blue-600/text-primary/g' {} +
  echo -e "${GREEN}✓${NC} Fixed text-blue-600 in $count files"
  total_changes=$((total_changes + count))
fi

# Fix text-blue-700 -> text-primary
count=$(find app components -type f \( -name "*.tsx" -o -name "*.ts" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -exec grep -l "text-blue-700" {} + 2>/dev/null | wc -l | tr -d ' ')

if [ "$count" -gt 0 ]; then
  find app components -type f \( -name "*.tsx" -o -name "*.ts" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.next/*" \
    -exec sed -i '' 's/text-blue-700/text-primary/g' {} +
  echo -e "${GREEN}✓${NC} Fixed text-blue-700 in $count files"
  total_changes=$((total_changes + count))
fi

echo ""
echo "📋 Phase 3: Fixing border-blue-* violations..."

# Fix border-blue-* -> border-primary
count=$(find app components -type f \( -name "*.tsx" -o -name "*.ts" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -exec grep -l "border-blue-" {} + 2>/dev/null | wc -l | tr -d ' ')

if [ "$count" -gt 0 ]; then
  find app components -type f \( -name "*.tsx" -o -name "*.ts" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.next/*" \
    -exec sed -i '' 's/border-blue-[0-9][0-9][0-9]/border-primary/g' {} +
  echo -e "${GREEN}✓${NC} Fixed border-blue-* in $count files"
  total_changes=$((total_changes + count))
fi

echo ""
echo "================================="
echo -e "${GREEN}✅ Complete!${NC}"
echo "Total files modified: $total_changes"
echo ""
echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo "1. Review changes with: git diff"
echo "2. Test the application"
echo "3. Commit changes if satisfied"
echo ""
echo "To revert: git checkout ."
