#!/usr/bin/env bash
set -euo pipefail

echo "Installing ESLint TypeScript plugin at repository root..."
pnpm -w add -D -w @typescript-eslint/eslint-plugin@^6.0.0 @typescript-eslint/parser@^6.0.0 || true

echo "Applying quick TypeScript fix: remove unused userDoc variable in edit page..."
# Make a backup
cp apps/customer-app/src/pages/vendor/items/[itemId]/edit/page.tsx apps/customer-app/src/pages/vendor/items/[itemId]/edit/page.tsx.bak || true

# Replace `const { userDoc } = useUserDoc();` with `useUserDoc();`
perl -0777 -pe "s/const\s*\{\s*userDoc\s*\}\s*=\s*useUserDoc\(\);/useUserDoc\(\);/s" -i apps/customer-app/src/pages/vendor/items/[itemId]/edit/page.tsx

echo "Done. Run 'pnpm -w install' and then 'pnpm -w -s -C . run -w lint' and 'pnpm -w -s -C . run -w type-check' to verify." 
