#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VSCODE_DIR="$REPO_ROOT/.vscode"
WORKTREE_JSON="$REPO_ROOT/worktree.json"

if [[ ! -f "$WORKTREE_JSON" ]]; then
  BRANCH_NAME="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  NOW_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  cat > "$WORKTREE_JSON" <<EOF
{
  "branch": "$BRANCH_NAME",
  "created_at": "$NOW_UTC",
  "original_path": "$REPO_ROOT",
  "runtasks": [
    {
      "name": "lifecycle-bootstrap",
      "cmd": "pnpm run wt:bootstrap",
      "cwd": ".",
      "description": "Install deps, build app, and sync native projects"
    },
    {
      "name": "lifecycle-dev",
      "cmd": "pnpm --filter @gosenderr/senderr-app dev",
      "cwd": ".",
      "description": "Run lifecycle senderr-app dev server"
    },
    {
      "name": "lifecycle-build",
      "cmd": "pnpm --filter @gosenderr/senderr-app build",
      "cwd": ".",
      "description": "Build lifecycle senderr-app"
    },
    {
      "name": "lifecycle-open-ios",
      "cmd": "pnpm --filter @gosenderr/senderr-app cap:open:ios",
      "cwd": ".",
      "description": "Open iOS project for senderr-app"
    },
    {
      "name": "lifecycle-sync-ios",
      "cmd": "pnpm --filter @gosenderr/senderr-app cap:sync:ios",
      "cwd": ".",
      "description": "Sync Capacitor iOS project"
    }
  ]
}
EOF
  echo "→ created $WORKTREE_JSON"
fi

node - "$WORKTREE_JSON" <<'NODE'
const fs = require('fs');
const wtPath = process.argv[2];
const wt = JSON.parse(fs.readFileSync(wtPath, 'utf8'));
wt.runtasks = [
  {
    name: 'lifecycle-bootstrap',
    cmd: 'pnpm run wt:bootstrap',
    cwd: '.',
    description: 'Install deps, build app, and sync native projects',
  },
  {
    name: 'lifecycle-dev',
    cmd: 'pnpm --filter @gosenderr/senderr-app dev',
    cwd: '.',
    description: 'Run lifecycle senderr-app dev server',
  },
  {
    name: 'lifecycle-build',
    cmd: 'pnpm --filter @gosenderr/senderr-app build',
    cwd: '.',
    description: 'Build lifecycle senderr-app',
  },
  {
    name: 'lifecycle-open-ios',
    cmd: 'pnpm --filter @gosenderr/senderr-app cap:open:ios',
    cwd: '.',
    description: 'Open iOS project for senderr-app',
  },
  {
    name: 'lifecycle-sync-ios',
    cmd: 'pnpm --filter @gosenderr/senderr-app cap:sync:ios',
    cwd: '.',
    description: 'Sync Capacitor iOS project',
  },
];
fs.writeFileSync(wtPath, JSON.stringify(wt, null, 2) + '\n');
NODE

mkdir -p "$VSCODE_DIR"
cat > "$VSCODE_DIR/tasks.json" <<'EOF'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Lifecycle: Bootstrap",
      "type": "shell",
      "command": "pnpm run wt:bootstrap",
      "options": {
        "cwd": "${workspaceFolder}"
      },
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      },
      "problemMatcher": []
    },
    {
      "label": "Lifecycle: Dev",
      "type": "shell",
      "command": "pnpm --filter @gosenderr/senderr-app dev",
      "options": {
        "cwd": "${workspaceFolder}"
      },
      "presentation": {
        "reveal": "always",
        "panel": "dedicated"
      },
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Lifecycle: Build",
      "type": "shell",
      "command": "pnpm --filter @gosenderr/senderr-app build",
      "options": {
        "cwd": "${workspaceFolder}"
      },
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      },
      "problemMatcher": []
    },
    {
      "label": "Lifecycle: iOS Sync",
      "type": "shell",
      "command": "pnpm --filter @gosenderr/senderr-app cap:sync:ios",
      "options": {
        "cwd": "${workspaceFolder}"
      },
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      },
      "problemMatcher": []
    },
    {
      "label": "Lifecycle: iOS Open",
      "type": "shell",
      "command": "pnpm --filter @gosenderr/senderr-app cap:open:ios",
      "options": {
        "cwd": "${workspaceFolder}"
      },
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      },
      "problemMatcher": []
    }
  ]
}
EOF

echo "✅ lifecycle runtasks + VS Code tasks synced"
