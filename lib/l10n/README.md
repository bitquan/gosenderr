# Localization (l10n) Module

This module handles internationalization and localization for the GoSender application.

## Supported Languages

- **English (en)** - Default language
- **Spanish (es)** - Secondary language
- **French (fr)** - Additional language support

## Structure

### Generated Files
- `app_localizations.dart` - Generated localization delegate
- `app_localizations_en.dart` - English translations
- `app_localizations_es.dart` - Spanish translations  
- `app_localizations_fr.dart` - French translations

### Source Files
- `app_en.arb` - English Application Resource Bundle
- `app_es.arb` - Spanish Application Resource Bundle
- `app_fr.arb` - French Application Resource Bundle

## Setup

### 1. Dependencies
The app includes the necessary localization dependencies in `pubspec.yaml`:
```yaml
dependencies:
  flutter_localizations:
    sdk: flutter
  intl: ^0.18.1

flutter:
  generate: true
```

### 2. Configuration
The `MaterialApp` is configured with localization support:
```dart
MaterialApp(
  localizationsDelegates: const [
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ],
  supportedLocales: const [
    Locale('en', 'US'),
    Locale('es', 'ES'),
    Locale('fr', 'FR'),
  ],
)
```

## Usage

### In Widgets
```dart
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    
    return Text(l10n.welcomeMessage);
  }
}
```

### Adding New Translations

1. Add the key-value pair to `app_en.arb`:
```json
{
  "welcomeMessage": "Welcome to GoSender!",
  "@welcomeMessage": {
    "description": "Welcome message shown on the home screen"
  }
}
```

2. Add translations to other language files:
```json
// app_es.arb
{
  "welcomeMessage": "¡Bienvenido a GoSender!"
}

// app_fr.arb  
{
  "welcomeMessage": "Bienvenue chez GoSender!"
}
```

3. Run `flutter gen-l10n` to generate the localization files.

## Key Translation Areas

### Authentication
- Login and registration forms
- Error messages
- Validation text

### User Roles
- Customer interface text
- Driver interface text  
- Merchant interface text

### Orders & Delivery
- Order status messages
- Delivery tracking text
- Payment-related text

### Common UI
- Button labels
- Navigation items
- Error and success messages

## Placeholders and Parameters

For dynamic content, use placeholders:
```json
{
  "orderTotal": "Total: {amount}",
  "@orderTotal": {
    "description": "Order total with amount",
    "placeholders": {
      "amount": {
        "type": "String"
      }
    }
  }
}
```

Usage:
```dart
Text(l10n.orderTotal('\$25.99'))
```

## Best Practices

1. **Descriptive Keys**: Use clear, descriptive keys for translation strings
2. **Context**: Provide context descriptions for translators
3. **Pluralization**: Handle plural forms properly for different languages
4. **Testing**: Test the app in different languages during development
5. **RTL Support**: Consider right-to-left language support for future expansion