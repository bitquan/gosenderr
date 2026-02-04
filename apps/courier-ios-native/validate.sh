#!/bin/bash
set -e

echo "🔍 Validating courier-ios-native setup..."
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
node --version

# Check if pnpm is installed
echo "✓ Checking pnpm..."
pnpm --version

# Check TypeScript compilation
echo "✓ Checking TypeScript compilation..."
cd "$(dirname "$0")"
npx tsc --noEmit

echo ""
echo "✅ All validation checks passed!"
echo ""
echo "Next steps for Xcode build:"
echo "  1. cd ios"
echo "  2. bundle install"
echo "  3. bundle exec pod install"
echo "  4. open Senderrappios.xcworkspace"
echo ""
echo "See SETUP.md for detailed instructions."
