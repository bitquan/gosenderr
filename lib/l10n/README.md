# Localization (l10n) Module

This module handles internationalization and localization for the GoSender application.

## Structure

- `app_en.arb`: English (default) translations
- `app_es.arb`: Spanish translations
- `generated/`: Auto-generated localization code (created by build runner)

## Supported Languages

- **English (en)**: Default language
- **Spanish (es)**: Secondary language

## Usage

### Setup
The app is configured to use Flutter's internationalization package. Generated classes are created automatically when you run:

```bash
flutter pub get
```

### Adding Translations
1. Add new keys to `app_en.arb` with descriptions
2. Add corresponding translations to other language files
3. Run `flutter pub get` to regenerate localization classes

### Using in Code
```dart
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

// In your widget
Text(AppLocalizations.of(context)!.welcome)
```

## Best Practices

- Always add descriptions to ARB entries for context
- Use meaningful keys that describe the content
- Keep translations concise and culturally appropriate
- Test the app in all supported languages
- Consider text expansion when designing UI layouts
- Use pluralization when needed

## Adding New Languages

1. Create a new ARB file (e.g., `app_fr.arb` for French)
2. Add the locale to `pubspec.yaml` if needed
3. Translate all existing keys
4. Test thoroughly in the new language

## Tools

- **Flutter Intl Extension**: VS Code extension for easier ARB management
- **Translation Services**: Consider professional translation for production
- **Testing**: Use device language settings to test different locales