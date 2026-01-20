#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT="$ROOT_DIR/docs/CLEANUP_REPORT.md"

{
  echo ""
  echo "---"
  echo "## Inventory Run"
  echo "- Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "- Host: $(uname -a)"
  echo "- Git branch: $(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'N/A')"
  echo ""

  echo "### Top-level directories"
  (cd "$ROOT_DIR" && find . -maxdepth 1 -mindepth 1 -type d -print 2>/dev/null | sed 's|^\./||' | sort) || true
  echo ""

  echo "### Tracked files (git ls-files)"
  (cd "$ROOT_DIR" && git ls-files | sort) || true
  echo ""

  echo "### Flutter/Dart remnants"
  (cd "$ROOT_DIR" && find . -maxdepth 3 -type f \( -name "*.dart" -o -name "pubspec.yaml" -o -name "*.lock" \) | sort) || true
  echo ""

  echo "### Generated folders that should not be tracked"
  (cd "$ROOT_DIR" && find . -maxdepth 5 -type d \( -name ".next" -o -name ".firebase" -o -name "out" -o -name "build" \) | sort) || true
  echo ""

  echo "### Firebase config/rules files"
  (cd "$ROOT_DIR" && find . -maxdepth 4 -type f \( -name "firebase.json" -o -name ".firebaserc" -o -name "firestore.rules" -o -name "storage.rules" \) | sort) || true
  echo ""

  echo "### Legacy docs markers"
  (cd "$ROOT_DIR" && find . -maxdepth 4 -type f \( -name "*CHECKPOINT*.md" -o -name "*TESTING_GUIDE*.md" -o -name "*deploy*.md" \) | sort) || true
  echo ""

  echo "### Next/Vercel configs"
  (cd "$ROOT_DIR" && find . -maxdepth 4 -type f \( -name "next.config.*" -o -name "vercel.json" \) | sort) || true
  echo ""

  echo "## Notes (manual)"
  echo "- Legacy vs current: (fill in after review)"
  echo "- Removals performed: (fill in as we archive/delete)"
} >> "$REPORT"

echo "Wrote inventory to: $REPORT"