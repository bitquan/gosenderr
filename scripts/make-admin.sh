#!/bin/bash

# Make User Admin Script
# This script helps you set a user's role to 'admin' in Firestore

echo "🔐 GoSenderr - Make User Admin"
echo "================================"
echo ""
echo "This script will help you manually set a user's role to 'admin' in Firestore."
echo ""
echo "📋 Prerequisites:"
echo "  1. You must have Firebase CLI installed and authenticated"
echo "  2. You must be authenticated to project: gosenderr-6773f"
echo "  3. You need the user's UID"
echo ""
echo "🔍 To find your user UID:"
echo "  1. Go to https://console.firebase.google.com/"
echo "  2. Select project: gosenderr-6773f"
echo "  3. Go to Authentication > Users"
echo "  4. Find your email and copy the User UID"
echo ""
echo "================================"
echo ""

# Ask for user UID
read -p "Enter the User UID to make admin: " USER_UID

if [ -z "$USER_UID" ]; then
    echo "❌ Error: User UID cannot be empty"
    exit 1
fi

echo ""
echo "📝 You entered UID: $USER_UID"
read -p "Is this correct? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "❌ Cancelled"
    exit 0
fi

echo ""
echo "🔄 Setting user role to admin..."
echo ""
echo "Please run this command in Firebase Console or using Firebase Admin SDK:"
echo ""
echo "firebase firestore:update users/$USER_UID --data '{\"role\":\"admin\"}' --project gosenderr-6773f"
echo ""
echo "OR manually in Firebase Console:"
echo "1. Go to: https://console.firebase.google.com/project/gosenderr-6773f/firestore"
echo "2. Navigate to: users/$USER_UID"
echo "3. Edit the 'role' field to: admin"
echo "4. Click Save"
echo ""
echo "✅ After updating, you can login at: http://localhost:3000/admin-login"
echo ""
