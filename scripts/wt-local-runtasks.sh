#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VSCODE_DIR="$REPO_ROOT/.vscode"
WORKTREE_JSON="$REPO_ROOT/worktree.json"
DEFAULT_SOURCE_TREE="/Users/papadev/dev/worktrees/gosenderr/V1-senderr-ios-smoke"
SOURCE_TREE="${WT_RUNTASK_SOURCE:-$DEFAULT_SOURCE_TREE}"
SOURCE_WORKTREE_JSON="$SOURCE_TREE/worktree.json"
SOURCE_TASKS_JSON="$SOURCE_TREE/.vscode/tasks.json"

TARGET_APP_REL=""
TARGET_KIND=""
TARGET_IOS_DIR_REL=""
TARGET_IOS_PROJECT_REL=""

if [[ -d "$REPO_ROOT/apps/V1-senderr-ios" ]]; then
  TARGET_APP_REL="apps/V1-senderr-ios"
  TARGET_KIND="react-native"
  TARGET_IOS_DIR_REL="apps/V1-senderr-ios/ios"
  if [[ -d "$REPO_ROOT/apps/V1-senderr-ios/ios/Senderrappios.xcworkspace" ]]; then
    TARGET_IOS_PROJECT_REL="apps/V1-senderr-ios/ios/Senderrappios.xcworkspace"
  elif [[ -d "$REPO_ROOT/apps/V1-senderr-ios/ios/Senderrappios.xcodeproj" ]]; then
    TARGET_IOS_PROJECT_REL="apps/V1-senderr-ios/ios/Senderrappios.xcodeproj"
  fi
elif [[ -d "$REPO_ROOT/apps/senderr-app" ]]; then
  TARGET_APP_REL="apps/senderr-app"
  TARGET_KIND="capacitor"
  if [[ -d "$REPO_ROOT/apps/senderr-app/ios/App" ]]; then
    TARGET_IOS_DIR_REL="apps/senderr-app/ios/App"
  else
    TARGET_IOS_DIR_REL="apps/senderr-app/ios"
  fi
  if [[ -d "$REPO_ROOT/apps/senderr-app/ios/App/App.xcworkspace" ]]; then
    TARGET_IOS_PROJECT_REL="apps/senderr-app/ios/App/App.xcworkspace"
  elif [[ -d "$REPO_ROOT/apps/senderr-app/ios/App/App.xcodeproj" ]]; then
    TARGET_IOS_PROJECT_REL="apps/senderr-app/ios/App/App.xcodeproj"
  fi
fi

if [[ -z "$TARGET_APP_REL" ]]; then
  echo "❌ No supported iOS app directory found in this tree."
  echo "   Expected one of: apps/V1-senderr-ios or apps/senderr-app"
  exit 1
fi

if [[ ! -f "$SOURCE_WORKTREE_JSON" ]]; then
  echo "❌ Missing source runtasks: $SOURCE_WORKTREE_JSON"
  echo "   Set WT_RUNTASK_SOURCE to a valid source worktree path."
  exit 1
fi

if [[ ! -f "$SOURCE_TASKS_JSON" ]]; then
  echo "❌ Missing source VS Code tasks: $SOURCE_TASKS_JSON"
  echo "   Run task sync in source tree first, then rerun this command."
  exit 1
fi

if [[ ! -f "$WORKTREE_JSON" ]]; then
  BRANCH_NAME="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  NOW_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  cat > "$WORKTREE_JSON" <<EOF
{
  "branch": "$BRANCH_NAME",
  "created_at": "$NOW_UTC",
  "original_path": "$REPO_ROOT"
}
EOF
  echo "→ created $WORKTREE_JSON"
fi

node - "$WORKTREE_JSON" "$SOURCE_WORKTREE_JSON" "$SOURCE_TREE" "$TARGET_APP_REL" "$TARGET_KIND" "$TARGET_IOS_DIR_REL" <<'NODE'
const fs = require('fs');
const wtPath = process.argv[2];
const sourceWtPath = process.argv[3];
const sourceTree = process.argv[4];
const targetAppRel = process.argv[5];
const targetKind = process.argv[6];
const targetIosDirRel = process.argv[7];
const wt = JSON.parse(fs.readFileSync(wtPath, 'utf8'));
const sourceWt = JSON.parse(fs.readFileSync(sourceWtPath, 'utf8'));
if (!Array.isArray(sourceWt.runtasks) || sourceWt.runtasks.length === 0) {
  throw new Error(`Source worktree has no runtasks: ${sourceWtPath}`);
}
const mapText = (value) => String(value || '').replaceAll('apps/V1-senderr-ios', targetAppRel);
const mapped = JSON.parse(JSON.stringify(sourceWt.runtasks)).map((task) => {
  const next = { ...task };
  next.cmd = mapText(next.cmd);
  next.cwd = mapText(next.cwd);

  if (targetKind === 'capacitor') {
    if (next.name === 'ios-metro') {
      next.cmd = 'pnpm --filter @gosenderr/senderr-app dev';
      next.cwd = '.';
    }
    if (next.name === 'ios-pods-install') {
        next.name = 'ios-pods-install-sync';
        next.cwd = '.';
        next.cmd = `(pnpm --filter @gosenderr/senderr-app exec cap sync ios || true) && cd ${targetIosDirRel || 'apps/senderr-app/ios'} && if [ -f Podfile ]; then pod install; else echo "No Podfile detected (Capacitor SPM mode); skipping pod install."; fi`;
    }
  }

  return next;
});

wt.runtasks = mapped;
wt.runtasks_source = sourceTree;
fs.writeFileSync(wtPath, JSON.stringify(wt, null, 2) + '\n');
NODE

mkdir -p "$VSCODE_DIR"
node - "$SOURCE_TASKS_JSON" "$VSCODE_DIR/tasks.json" "$TARGET_APP_REL" "$TARGET_KIND" "$TARGET_IOS_DIR_REL" "$TARGET_IOS_PROJECT_REL" <<'NODE'
const fs = require('fs');

const sourceTasksPath = process.argv[2];
const outTasksPath = process.argv[3];
const targetAppRel = process.argv[4];
const targetKind = process.argv[5];
const targetIosDirRel = process.argv[6];
const targetIosProjectRel = process.argv[7];

const tasksDoc = JSON.parse(fs.readFileSync(sourceTasksPath, 'utf8'));
const mapText = (value) => String(value || '').replaceAll('apps/V1-senderr-ios', targetAppRel);

tasksDoc.tasks = (tasksDoc.tasks || []).map((task) => {
  const next = { ...task };
  if (typeof next.command === 'string') next.command = mapText(next.command);

  if (next.options && typeof next.options.cwd === 'string') {
    next.options = { ...next.options, cwd: mapText(next.options.cwd) };
  }

  if (targetKind === 'capacitor') {
    if (next.label === 'ios-metro') {
      next.command = 'pnpm --filter @gosenderr/senderr-app dev';
      next.options = { ...(next.options || {}), cwd: '${workspaceFolder}' };
    }

    if (next.label === 'ios-open-xcode' && targetIosProjectRel) {
      next.command = `open -a Xcode ${targetIosProjectRel}`;
    }

    if (next.label === 'ios-pods-install') {
      next.label = 'ios-pods-install-sync';
      next.command = `(pnpm --filter @gosenderr/senderr-app exec cap sync ios || true) && cd ${targetIosDirRel || 'apps/senderr-app/ios'} && if [ -f Podfile ]; then pod install; else echo "No Podfile detected (Capacitor SPM mode); skipping pod install."; fi`;
      next.options = { ...(next.options || {}), cwd: '${workspaceFolder}' };
    }
  }

  return next;
});

fs.writeFileSync(outTasksPath, JSON.stringify(tasksDoc, null, 2) + '\n');
NODE

echo "✅ runtasks inherited from source and mapped for this tree: $SOURCE_TREE"
