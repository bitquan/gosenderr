# gosenderr

This repository is configured for Flutter development using GitHub Codespaces.

## Flutter Development Setup

The repository includes a devcontainer configuration that automatically installs Flutter SDK and configures VS Code for Flutter development.

### Flutter SDK Location

The Flutter SDK is installed at `/usr/local/flutter` and VS Code is configured to use this path automatically.

### Rebuilding the Codespace

If you need to rebuild the Codespace to apply devcontainer changes:

1. **From VS Code in Codespaces:**
   - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
   - Type "Codespaces: Rebuild Container"
   - Select the command and confirm

2. **From GitHub.com:**
   - Go to your Codespace
   - Click the three dots menu (...)
   - Select "Rebuild container"

3. **From GitHub CLI:**
   ```bash
   gh codespace rebuild
   ```

### Verifying Flutter Installation

After the Codespace starts, you can verify Flutter is properly installed by running:

```bash
flutter doctor
```

This should show Flutter SDK installed at `/usr/local/flutter` with all dependencies properly configured.