# GoSender - Delivery & Marketplace Platform

[![Flutter](https://img.shields.io/badge/Flutter-3.16+-blue.svg)](https://flutter.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Latest-orange.svg)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A comprehensive Flutter + Firebase delivery and marketplace platform supporting multiple user roles: customers, vendors, delivery agents, and administrators. Built with modern architecture principles and designed for scalability.

## 🚀 Quick Start with GitHub Codespaces

The fastest way to get started is using GitHub Codespaces, which provides a fully configured development environment:

1. **Open in Codespaces**:
   - Click the green "Code" button on this repository
   - Select "Codespaces" tab
   - Click "Create codespace on main"

2. **Wait for Setup**: The environment will automatically:
   - Install Flutter SDK
   - Configure VS Code extensions
   - Run `flutter doctor`
   - Install dependencies with `flutter pub get`

3. **Start Development**: Once ready, you can:
   - Run the app: `flutter run`
   - Open the project in VS Code
   - Start coding immediately!

## 🏗️ Architecture

### Modular Structure
```
lib/
├── core/                   # Core services and utilities
│   ├── constants/          # App-wide constants
│   ├── services/           # Firebase services
│   └── theme/              # Material 3 theming
├── features/               # Feature modules by user role
│   ├── customer/           # Customer app features
│   ├── vendor/             # Vendor dashboard features
│   ├── delivery_agent/     # Delivery agent features
│   └── admin/              # Admin panel features
├── shared_widgets/         # Reusable UI components
├── l10n/                   # Internationalization
├── app.dart               # App configuration & routing
└── main.dart              # Application entry point
```

### User Roles

| Role | Description | Key Features |
|------|-------------|--------------|
| **Customer** | End users who place orders | Browse products, place orders, track deliveries |
| **Vendor** | Business owners selling products | Manage inventory, process orders, view analytics |
| **Delivery Agent** | Delivery personnel | Accept deliveries, track routes, manage earnings |
| **Admin** | Platform administrators | User management, analytics, system oversight |

## 🛠️ Local Development Setup

### Prerequisites
- Flutter SDK 3.16 or higher
- Dart SDK 3.1 or higher
- Firebase CLI (for Firebase integration)
- Git

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/bitquan/gosenderr.git
   cd gosenderr
   ```

2. **Install dependencies**:
   ```bash
   flutter pub get
   ```

3. **Firebase Setup** (optional for basic UI testing):
   ```bash
   # Install Firebase CLI if not already installed
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Configure Firebase for your project
   firebase init
   ```

4. **Configure Firebase Options**:
   ```bash
   # Copy the example file
   cp firebase_options.dart.example lib/firebase_options.dart
   
   # Edit the file with your Firebase project configuration
   ```

5. **Run the application**:
   ```bash
   # Run on available device
   flutter run
   
   # Run on specific device
   flutter run -d chrome  # For web
   flutter run -d android # For Android
   flutter run -d ios     # For iOS
   ```

## 🔧 Development Tools

### VS Code Extensions (Included in Codespaces)
- **Dart & Flutter**: Official Dart and Flutter support
- **GitHub Copilot**: AI-powered code assistance
- **Prettier**: Code formatting
- **GitLens**: Enhanced Git capabilities

### Useful Commands
```bash
# Check Flutter installation
flutter doctor

# Run tests
flutter test

# Build for production
flutter build apk    # Android
flutter build ios    # iOS
flutter build web    # Web

# Format code
dart format lib/

# Analyze code
flutter analyze

# Update dependencies
flutter pub upgrade
```

## 🔥 Firebase Configuration

### Required Firebase Services
- **Authentication**: User login and registration
- **Firestore**: Real-time database
- **Storage**: File uploads and media storage
- **Cloud Messaging**: Push notifications

### Setup Steps
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication with Email/Password provider
3. Create a Firestore database
4. Enable Storage
5. Generate configuration files using Firebase CLI:
   ```bash
   firebase projects:list
   firebase use <your-project-id>
   flutterfire configure
   ```

### Security Rules
Copy the example security rules to your Firebase project:
```bash
# Copy Firestore rules
cp firebase.rules.example firestore.rules

# Deploy rules (after configuring Firebase)
firebase deploy --only firestore:rules
firebase deploy --only storage
```

## 🌍 Internationalization

The app supports multiple languages:
- **English (en)**: Default language
- **Spanish (es)**: Secondary language

### Adding New Languages
1. Create new ARB file: `lib/l10n/app_<locale>.arb`
2. Add translations for all existing keys
3. Run `flutter pub get` to regenerate localization classes

## 🎨 Theming

The app uses Material 3 design system with:
- **Light Theme**: Default mode
- **Dark Theme**: Automatic system detection
- **Custom Colors**: Brand-specific color scheme
- **Typography**: Google Fonts (Roboto)

## 📱 Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| **iOS** | ✅ Supported | iOS 12.0+ |
| **Android** | ✅ Supported | API 21+ (Android 5.0+) |
| **Web** | ✅ Supported | Modern browsers |
| **macOS** | 🚧 Planned | Future release |
| **Windows** | 🚧 Planned | Future release |
| **Linux** | 🚧 Planned | Future release |

## 🧪 Testing

### Running Tests
```bash
# Unit tests
flutter test

# Integration tests
flutter test integration_test/

# Widget tests
flutter test test/widget_test/

# Test with coverage
flutter test --coverage
```

### Test Structure
- `test/`: Unit and widget tests
- `integration_test/`: End-to-end tests
- `test_driver/`: Integration test drivers

## 📊 State Management

The app uses **BLoC (Business Logic Component)** pattern for state management:
- **Cubit**: For simple state management
- **Bloc**: For complex state with events
- **Repository Pattern**: For data layer abstraction

## 🚀 Deployment

### Web Deployment (Firebase Hosting)
```bash
flutter build web
firebase deploy --only hosting
```

### Mobile App Stores
```bash
# Android (Google Play)
flutter build appbundle
# Upload to Google Play Console

# iOS (App Store)
flutter build ios
# Use Xcode for App Store submission
```

## 📋 Project Roadmap

### Phase 1: MVP ✅
- [x] Basic app structure
- [x] User role separation
- [x] Firebase integration
- [x] Core UI components

### Phase 2: Core Features 🚧
- [ ] Authentication system
- [ ] Real-time order tracking
- [ ] Payment integration
- [ ] Push notifications

### Phase 3: Advanced Features 📅
- [ ] Real-time chat
- [ ] Advanced analytics
- [ ] Multi-language expansion
- [ ] Offline capabilities

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: [docs/blueprint.md](docs/blueprint.md)
- **Issues**: [GitHub Issues](https://github.com/bitquan/gosenderr/issues)
- **Discussions**: [GitHub Discussions](https://github.com/bitquan/gosenderr/discussions)

## 🙏 Acknowledgments

- [Flutter Team](https://flutter.dev/) for the amazing framework
- [Firebase Team](https://firebase.google.com/) for backend services
- [Material Design](https://material.io/) for design guidelines
- [Contributors](https://github.com/bitquan/gosenderr/contributors) who make this project possible

---

**Ready to build the future of delivery platforms? Start coding with GitHub Codespaces! 🚀**