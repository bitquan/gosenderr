#!/usr/bin/env bash
set -euo pipefail

# Convenient wrapper to start Docker Compose for local development
docker compose up --build -d "$@"

echo "Docker Compose started. Use 'docker compose logs -f' to follow logs."