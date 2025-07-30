#!/usr/bin/env python3
"""
GoSender Project Validation Script
Validates the project structure and configuration for the GoSender platform.
"""

import os
import json
import yaml
from pathlib import Path

def check_file_exists(path, description):
    """Check if a file exists and print status"""
    if os.path.exists(path):
        print(f"✅ {description}: {path}")
        return True
    else:
        print(f"❌ Missing {description}: {path}")
        return False

def check_directory_structure():
    """Validate the expected directory structure"""
    print("\n📁 Checking Directory Structure...")
    
    directories = [
        "lib/core/constants",
        "lib/core/services", 
        "lib/core/theme",
        "lib/features/customer/screens",
        "lib/features/vendor/screens",
        "lib/features/delivery_agent/screens",
        "lib/features/admin/screens",
        "lib/shared_widgets",
        "lib/l10n",
        "docs",
        "assets/images",
        "assets/icons",
        "assets/fonts",
        ".devcontainer"
    ]
    
    all_exist = True
    for directory in directories:
        if os.path.exists(directory):
            print(f"✅ {directory}/")
        else:
            print(f"❌ Missing directory: {directory}/")
            all_exist = False
    
    return all_exist

def check_core_files():
    """Check existence of core project files"""
    print("\n📄 Checking Core Files...")
    
    files = [
        ("lib/main.dart", "Main entry point"),
        ("lib/app.dart", "App configuration"),
        ("pubspec.yaml", "Flutter dependencies"),
        ("README.md", "Project documentation"),
        (".gitignore", "Git ignore rules"),
        (".devcontainer/devcontainer.json", "Codespace configuration")
    ]
    
    all_exist = True
    for file_path, description in files:
        if not check_file_exists(file_path, description):
            all_exist = False
    
    return all_exist

def check_flutter_files():
    """Check Flutter-specific files and structure"""
    print("\n🎯 Checking Flutter Files...")
    
    flutter_files = [
        ("lib/core/theme/app_theme.dart", "App theming"),
        ("lib/core/constants/app_constants.dart", "App constants"),
        ("lib/core/services/firestore_service.dart", "Firestore service"),
        ("lib/core/services/storage_service.dart", "Storage service"),
        ("lib/shared_widgets/floating_card.dart", "Shared widget"),
        ("firebase_options.dart.example", "Firebase config example"),
        ("firebase.rules.example", "Firebase security rules")
    ]
    
    all_exist = True
    for file_path, description in flutter_files:
        if not check_file_exists(file_path, description):
            all_exist = False
    
    return all_exist

def check_role_screens():
    """Check that all role screens exist"""
    print("\n👥 Checking Role-Based Screens...")
    
    screens = [
        ("lib/features/customer/screens/customer_home_screen.dart", "Customer home"),
        ("lib/features/vendor/screens/vendor_home_screen.dart", "Vendor dashboard"),
        ("lib/features/delivery_agent/screens/delivery_agent_home_screen.dart", "Delivery agent home"),
        ("lib/features/admin/screens/admin_home_screen.dart", "Admin dashboard")
    ]
    
    all_exist = True
    for file_path, description in screens:
        if not check_file_exists(file_path, description):
            all_exist = False
    
    return all_exist

def check_localization():
    """Check localization files"""
    print("\n🌍 Checking Localization...")
    
    l10n_files = [
        ("lib/l10n/app_en.arb", "English translations"),
        ("lib/l10n/app_es.arb", "Spanish translations")
    ]
    
    all_exist = True
    for file_path, description in l10n_files:
        if not check_file_exists(file_path, description):
            all_exist = False
    
    return all_exist

def validate_pubspec():
    """Validate pubspec.yaml configuration"""
    print("\n📦 Validating pubspec.yaml...")
    
    try:
        with open('pubspec.yaml', 'r') as f:
            pubspec = yaml.safe_load(f)
        
        # Check required fields
        if pubspec.get('name') == 'gosenderr':
            print("✅ Project name: gosenderr")
        else:
            print("❌ Incorrect project name")
            return False
        
        # Check key dependencies
        deps = pubspec.get('dependencies', {})
        required_deps = [
            'flutter',
            'firebase_core',
            'firebase_auth', 
            'cloud_firestore',
            'firebase_storage',
            'flutter_bloc',
            'go_router',
            'google_fonts'
        ]
        
        missing_deps = []
        for dep in required_deps:
            if dep in deps:
                print(f"✅ {dep}")
            else:
                print(f"❌ Missing dependency: {dep}")
                missing_deps.append(dep)
        
        return len(missing_deps) == 0
        
    except Exception as e:
        print(f"❌ Error reading pubspec.yaml: {e}")
        return False

def validate_devcontainer():
    """Validate devcontainer configuration"""
    print("\n🐳 Validating Devcontainer...")
    
    try:
        with open('.devcontainer/devcontainer.json', 'r') as f:
            config = json.load(f)
        
        # Check Flutter image
        if 'flutter' in config.get('image', '').lower():
            print("✅ Flutter Docker image configured")
        else:
            print("❌ Missing Flutter Docker image")
            return False
        
        # Check VS Code extensions
        extensions = config.get('customizations', {}).get('vscode', {}).get('extensions', [])
        flutter_extensions = [ext for ext in extensions if 'dart' in ext.lower() or 'flutter' in ext.lower()]
        
        if flutter_extensions:
            print(f"✅ Flutter extensions: {len(flutter_extensions)} configured")
        else:
            print("❌ Missing Flutter VS Code extensions")
            return False
        
        # Check post-create command
        if 'flutter' in config.get('postCreateCommand', ''):
            print("✅ Flutter setup commands configured")
        else:
            print("❌ Missing Flutter setup commands")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error reading devcontainer.json: {e}")
        return False

def main():
    """Main validation function"""
    print("🚀 GoSender Project Validation")
    print("=" * 50)
    
    # Change to project directory
    os.chdir(Path(__file__).parent)
    
    # Run all checks
    checks = [
        check_directory_structure(),
        check_core_files(),
        check_flutter_files(),
        check_role_screens(),
        check_localization(),
        validate_pubspec(),
        validate_devcontainer()
    ]
    
    # Summary
    print("\n📊 Validation Summary")
    print("=" * 30)
    
    passed = sum(checks)
    total = len(checks)
    
    if passed == total:
        print(f"🎉 All checks passed! ({passed}/{total})")
        print("\n✅ Project is ready for development!")
        print("💡 Next steps:")
        print("   1. Open in GitHub Codespaces")
        print("   2. Run 'flutter doctor' to verify setup")
        print("   3. Run 'flutter pub get' to install dependencies")
        print("   4. Configure Firebase (copy firebase_options.dart.example)")
        print("   5. Run 'flutter run' to start development!")
    else:
        print(f"⚠️  {passed}/{total} checks passed")
        print("Please fix the issues above before proceeding.")
    
    return passed == total

if __name__ == "__main__":
    main()