#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOCS_DIR="$ROOT_DIR/docs"

REQUIRED=("ARCHITECTURE.md" "DEVELOPMENT.md" "DEPLOYMENT.md" "API_REFERENCE.md")
MISSING=()

for f in "${REQUIRED[@]}"; do
  if [[ ! -f "$DOCS_DIR/$f" ]]; then
    MISSING+=("$f")
  fi
done

if [[ ${#MISSING[@]} -ne 0 ]]; then
  echo "Missing required docs: ${MISSING[*]}"
  exit 2
fi

# Canonical docs verification scope:
# - Include all markdown in docs/
# - Exclude legacy planning archive paths where TODOs and stale links are expected
CANONICAL_DOCS=()
while IFS= read -r -d '' file; do
  CANONICAL_DOCS+=("$file")
done < <(
  find "$DOCS_DIR" -type f -name "*.md" \
    ! -path "$DOCS_DIR/project-plan/*" \
    ! -path "$DOCS_DIR/archive/*" \
    -print0
)

if [[ ${#CANONICAL_DOCS[@]} -eq 0 ]]; then
  echo "No canonical markdown files found under docs/."
  exit 2
fi

TODO_FOUND=0
TODO_PATTERN='\bTODO\b[: ]'
for file in "${CANONICAL_DOCS[@]}"; do
  if grep -nE "$TODO_PATTERN" "$file" >/dev/null; then
    TODO_FOUND=1
    grep -nE "$TODO_PATTERN" "$file" | sed "s|^|$file:|"
  fi
done

if [[ "$TODO_FOUND" -eq 1 ]]; then
  echo "Canonical docs contain TODO markers (legacy docs are excluded)."
  exit 2
fi

BROKEN_FOUND=0

is_external_or_ignored() {
  local link="$1"
  case "$link" in
    http://*|https://*|mailto:*|tel:*|\#*|data:*)
      return 0
      ;;
    *'{{'*|*'}}'*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

for file in "${CANONICAL_DOCS[@]}"; do
  while IFS= read -r token; do
    target="${token#*\(}"
    target="${target%)}"
    target="${target#<}"
    target="${target%>}"
    target="${target%%[[:space:]]*}"
    target="${target%%#*}"
    target="${target%%\?*}"

    [[ -z "$target" ]] && continue
    is_external_or_ignored "$target" && continue

    if [[ "$target" == /* ]]; then
      if [[ ! -e "$ROOT_DIR$target" ]]; then
        BROKEN_FOUND=1
        echo "Broken link: $file -> $target"
      fi
      continue
    fi

    file_dir="$(cd "$(dirname "$file")" && pwd)"
    if [[ -e "$file_dir/$target" ]]; then
      continue
    fi

    if [[ "$target" == apps/* || "$target" == docs/* || "$target" == scripts/* || "$target" == packages/* || "$target" == firebase/* || "$target" == .github/* ]]; then
      if [[ ! -e "$ROOT_DIR/$target" ]]; then
        BROKEN_FOUND=1
        echo "Broken link: $file -> $target"
      fi
      continue
    fi

    if [[ ! -e "$file_dir/$target" ]]; then
      BROKEN_FOUND=1
      echo "Broken link: $file -> $target"
    fi
  done < <(grep -oE '\[[^]]+\]\([^)]+\)' "$file" || true)
done

if [[ "$BROKEN_FOUND" -eq 1 ]]; then
  echo "Canonical docs contain broken local markdown links."
  exit 2
fi

echo "Docs check passed ✔️"
