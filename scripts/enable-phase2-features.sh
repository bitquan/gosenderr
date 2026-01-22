#!/bin/bash

# Enable Phase 2 Features via Firebase CLI
# This script updates the Firestore featureFlags document

PROJECT_ID="gosenderr-6773f"

echo "🚀 Enabling Phase 2 Features..."
echo ""

# Create a temporary JS file to run via Firebase emulator or update directly
cat > /tmp/update-flags.json << 'EOF'
{
  "customer": {
    "packageShipping": true
  },
  "delivery": {
    "routes": true
  }
}
EOF

echo "📋 Features to enable:"
echo "  📦 Package Shipping (customer.packageShipping)"
echo "  🚚 Courier Routes (delivery.routes)"
echo ""

# Use Firebase CLI to update the document
echo "🔧 Updating Firestore document..."

# Method 1: Using firebase firestore command (if available)
if firebase firestore:set --help &>/dev/null; then
  firebase firestore:set featureFlags/production --data @/tmp/update-flags.json --project $PROJECT_ID
else
  echo "⚠️  Firebase CLI firestore commands not available"
  echo ""
  echo "📝 Manual Steps Required:"
  echo ""
  echo "1. Go to Firebase Console:"
  echo "   https://console.firebase.google.com/project/$PROJECT_ID/firestore"
  echo ""
  echo "2. Navigate to: featureFlags > production"
  echo ""
  echo "3. Update these fields:"
  echo "   • customer.packageShipping = true"
  echo "   • delivery.routes = true"
  echo ""
  echo "OR use the admin UI:"
  echo "   http://localhost:3000/admin/feature-flags"
  echo ""
fi

rm -f /tmp/update-flags.json
