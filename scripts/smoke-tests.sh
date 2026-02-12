#!/usr/bin/env sh
set -eu

ports="3000:admin 5173:customer 5174:courier 5175:shifter 3003:web 4000:emulator-ui"
failed=0
for p in $ports; do
  port=${p%%:*}
  name=${p##*:}
  printf "Checking %s on port %s... " "$name" "$port"
  if curl -sSf "http://127.0.0.1:${port}/" >/dev/null 2>&1; then
    echo "OK"
  else
    echo "FAIL"
    failed=1
  fi
done
exit $failed