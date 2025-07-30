#!/bin/bash

# Post-create script for GoSender development environment

echo "🚀 Setting up GoSender development environment..."

# Update Flutter
echo "📱 Updating Flutter..."
flutter upgrade

# Get Flutter dependencies
echo "📦 Installing Flutter dependencies..."
flutter pub get

# Generate localization files
echo "🌍 Generating localization files..."
flutter gen-l10n

# Create firebase_options.dart from example if it doesn't exist
if [ ! -f "lib/firebase_options.dart" ]; then
    echo "🔥 Creating Firebase options file from example..."
    cp lib/firebase_options.dart.example lib/firebase_options.dart
    echo "⚠️  Remember to update lib/firebase_options.dart with your actual Firebase configuration!"
fi

# Run Flutter doctor to check setup
echo "🩺 Running Flutter doctor..."
flutter doctor

# Create necessary directories
echo "📁 Creating additional directories..."
mkdir -p assets/{images,icons,fonts}
mkdir -p test/{unit,widget,integration}

echo "✅ Development environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update lib/firebase_options.dart with your Firebase project configuration"
echo "2. Add your google-services.json (Android) and GoogleService-Info.plist (iOS) files"
echo "3. Configure Firebase Authentication, Firestore, and Storage in your Firebase console"
echo "4. Run 'flutter run' to start the application"
echo ""
echo "🎉 Happy coding!"