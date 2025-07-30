# Contributing to GoSender

Thank you for your interest in contributing to GoSender! We welcome contributions from the community.

## Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/gosenderr.git
   cd gosenderr
   ```

2. **Use GitHub Codespaces (Recommended)**
   - Click "Code" > "Codespaces" > "New codespace"
   - The environment will be automatically set up

3. **Local Development**
   - Install Flutter SDK (3.16.0+)
   - Install dependencies: `flutter pub get`
   - Configure Firebase as described in README.md

## Code Style

- Follow the [Dart Style Guide](https://dart.dev/guides/language/effective-dart/style)
- Use `dart format .` to format your code
- Run `flutter analyze` to check for issues
- Follow the existing code patterns and architecture

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for test additions/modifications
- `chore:` for maintenance tasks

Example:
```bash
git commit -m "feat: add order tracking notification system"
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with appropriate tests
3. Ensure all tests pass and code is formatted
4. Update documentation if needed
5. Submit a pull request with a clear description

## Testing

- Write unit tests for new functionality
- Ensure existing tests pass: `flutter test`
- Test on multiple platforms if possible

## Reporting Issues

When reporting issues, please include:
- Flutter version
- Platform (iOS, Android, Web)
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## Code of Conduct

Please be respectful and professional in all interactions. We are committed to providing a welcoming and inclusive environment for everyone.

## Questions?

Feel free to open a discussion or reach out to the maintainers if you have questions about contributing.