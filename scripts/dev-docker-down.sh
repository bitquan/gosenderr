#!/usr/bin/env bash
set -euo pipefail

# Tear down the local development Docker Compose setup
docker compose down -v

echo "Docker Compose stopped and volumes removed."