# GoSender - Delivery Marketplace Platform

<div align="center">

![GoSender Logo](https://via.placeholder.com/200x80/2196F3/FFFFFF?text=GoSender)

**A comprehensive Flutter + Firebase delivery marketplace platform connecting customers, drivers, and merchants.**

[![Flutter Version](https://img.shields.io/badge/Flutter-3.16.0-blue.svg)](https://flutter.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Enabled-orange.svg)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Features](#features) • [Getting Started](#getting-started) • [Architecture](#architecture) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

## ✨ Features

### 👥 Multi-Role Platform
- **Customers**: Browse restaurants, place orders, track deliveries
- **Drivers**: Accept deliveries, track earnings, optimize routes  
- **Merchants**: Manage orders, update menus, view analytics

### 🚀 Core Capabilities
- **Real-time Order Tracking**: Live updates powered by Firebase
- **Smart Driver Matching**: Intelligent algorithm for optimal delivery assignment
- **Comprehensive Analytics**: Business insights and performance metrics
- **Multi-language Support**: English, Spanish, and French localization
- **Offline Functionality**: Continue using core features without internet
- **Secure Payments**: Integrated payment processing with multiple methods

### 📱 Modern UI/UX
- **Material 3 Design**: Latest Flutter design system
- **Responsive Layout**: Optimized for all screen sizes
- **Dark/Light Themes**: System-aware theme switching
- **Accessibility**: WCAG 2.1 compliant interface
- **Smooth Animations**: Polished user experience

## 🚀 Getting Started

### Prerequisites
- Flutter SDK (3.16.0 or higher)
- Dart SDK (3.1.0 or higher)
- Firebase CLI
- Android Studio / VS Code
- Git

### Quick Start with GitHub Codespaces

1. **Open in Codespaces** (Recommended)
   ```bash
   # Click "Code" > "Codespaces" > "New codespace" on GitHub
   # Or use the button below
   ```
   [![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/bitquan/gosenderr)

2. **Wait for Environment Setup**
   - The devcontainer will automatically install Flutter, Android SDK, and dependencies
   - This process takes about 5-10 minutes on first setup

3. **Configure Firebase**
   ```bash
   # Copy the Firebase options template
   cp lib/firebase_options.dart.example lib/firebase_options.dart
   
   # Update with your Firebase project configuration
   # Get your config from: https://console.firebase.google.com
   ```

4. **Run the Application**
   ```bash
   flutter run -d web-server --web-port 8080
   ```

### Local Development Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/bitquan/gosenderr.git
   cd gosenderr
   ```

2. **Install Dependencies**
   ```bash
   flutter pub get
   ```

3. **Configure Firebase**
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Initialize Firebase (if not already done)
   firebase init
   
   # Copy and configure Firebase options
   cp lib/firebase_options.dart.example lib/firebase_options.dart
   ```

4. **Set up Firebase Services**
   - **Authentication**: Enable Email/Password and Google sign-in
   - **Firestore**: Create database with security rules from `firebase.rules.example`
   - **Storage**: Enable Firebase Storage for file uploads
   - **Functions**: Deploy cloud functions for backend logic

5. **Run the Application**
   ```bash
   # For web development
   flutter run -d chrome
   
   # For mobile development (with device connected)
   flutter run
   
   # For specific platform
   flutter run -d android
   flutter run -d ios
   ```

## 🏗️ Architecture

### Project Structure
```
lib/
├── core/                   # Core utilities and services
│   ├── constants/         # App constants and configuration
│   ├── services/          # Firebase, storage, and auth services
│   └── theme/            # App theming and styling
├── features/              # Feature modules by user role
│   ├── auth/             # Authentication flows
│   ├── customer/         # Customer-specific features
│   ├── driver/           # Driver-specific features
│   └── merchant/         # Merchant-specific features
├── shared_widgets/        # Reusable UI components
├── l10n/                 # Internationalization
├── main.dart             # Application entry point
└── app.dart              # Main app configuration
```

### Technology Stack
- **Frontend**: Flutter with Material 3
- **Backend**: Firebase (Auth, Firestore, Storage, Functions)
- **State Management**: BLoC pattern
- **Navigation**: GoRouter
- **Local Storage**: Hive + SharedPreferences
- **Internationalization**: Flutter Intl

### Key Design Patterns
- **Clean Architecture**: Separation of concerns with clear layers
- **Repository Pattern**: Data access abstraction
- **BLoC Pattern**: Predictable state management
- **Dependency Injection**: Loose coupling between components

## 📚 Documentation

- [**Blueprint Specification**](docs/blueprint.md) - Detailed technical specification
- [**API Documentation**](docs/api.md) - Backend API reference
- [**Deployment Guide**](docs/deployment.md) - Production deployment instructions
- [**Contributing Guide**](CONTRIBUTING.md) - How to contribute to the project

### Module Documentation
- [Core Module](lib/core/README.md) - Core services and utilities
- [Features Module](lib/features/README.md) - Feature-specific implementations  
- [Shared Widgets](lib/shared_widgets/README.md) - Reusable UI components
- [Localization](lib/l10n/README.md) - Internationalization setup

## 🛠️ Development

### Available Scripts
```bash
# Run the app in debug mode
flutter run

# Build for production
flutter build web
flutter build apk
flutter build ios

# Run tests
flutter test

# Generate code (localization, etc.)
flutter gen-l10n

# Analyze code quality
flutter analyze

# Format code
dart format .
```

### Environment Variables
Create a `.env` file in the root directory:
```env
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_MAPS_API_KEY=your-maps-api-key
STRIPE_PUBLISHABLE_KEY=your-stripe-key
```

### Testing
```bash
# Run all tests
flutter test

# Run tests with coverage
flutter test --coverage

# Run specific test file
flutter test test/unit/auth_service_test.dart
```

## 🔥 Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable Google Analytics (optional)

### 2. Configure Authentication
```bash
# Enable sign-in methods
- Email/Password ✅
- Google ✅
- Phone (optional) ✅
```

### 3. Set up Firestore Database
```bash
# Create database in production mode
# Apply security rules from firebase.rules.example
```

### 4. Configure Storage
```bash
# Enable Firebase Storage
# Set up appropriate security rules for file uploads
```

### 5. Add Platform Apps
```bash
# Add Android app with package name: com.example.gosenderr
# Add iOS app with bundle ID: com.example.gosenderr
# Add Web app with hosting URL
```

## 🌐 Deployment

### Web Deployment (Firebase Hosting)
```bash
# Build for web
flutter build web

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Mobile App Deployment
```bash
# Android
flutter build apk --release
flutter build appbundle --release

# iOS
flutter build ios --release
```

### Environment-Specific Builds
```bash
# Development
flutter build web --dart-define=ENVIRONMENT=development

# Staging  
flutter build web --dart-define=ENVIRONMENT=staging

# Production
flutter build web --dart-define=ENVIRONMENT=production
```

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code of Conduct
- Development Process
- Submitting Pull Requests
- Coding Standards
- Testing Requirements

### Quick Start for Contributors
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with conventional commits: `git commit -m 'feat: add amazing feature'`
5. Push to your fork: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Flutter team for the amazing framework
- Firebase team for the backend infrastructure
- Material Design team for the design system
- The open-source community for inspiration and tools

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/bitquan/gosenderr/issues)
- **Discussions**: [GitHub Discussions](https://github.com/bitquan/gosenderr/discussions)
- **Email**: support@gosenderr.com

---

<div align="center">

**Made with ❤️ by the GoSender Team**

[⭐ Star this repo](https://github.com/bitquan/gosenderr) if you find it helpful!

</div>