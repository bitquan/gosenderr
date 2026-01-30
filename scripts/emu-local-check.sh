#!/usr/bin/env bash
set -euo pipefail

PORTS="4000 8080 9099 5001"
HOSTS=("127.0.0.1" "host.docker.internal" "172.17.0.1")

echo "🔎 Checking emulator endpoints from inside container (using short curl timeouts)"
for h in "${HOSTS[@]}"; do
  echo "\nHost: $h"
  for p in $PORTS; do
    url="http://$h:$p"
    # Use short timeout to avoid long hangs
    if curl -4 -s --max-time 2 --fail "$url" >/dev/null 2>&1; then
      echo "  ✅ $url reachable"
    else
      echo "  ❌ $url not reachable"
    fi
  done
done

echo "\nTip: inside the devcontainer, use the host gateway (e.g., 172.17.0.1:<port>) or host.docker.internal:<port> to reach services running in other Docker containers. 127.0.0.1 refers to the container itself."}