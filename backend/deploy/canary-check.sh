#!/usr/bin/env bash
# Canary gate: send N requests through the gateway, count which version answered, and fail
# (=> roll back) if any request errored or the canary got no traffic / is unhealthy.
set -euo pipefail
GATEWAY=${1:-http://localhost:8081}
N=${2:-100}
stable=0; canary=0; errors=0
for _ in $(seq "$N"); do
  body=$(curl -s -o /dev/stderr -w '%{http_code}' "$GATEWAY/actuator/info" 2>/tmp/canary-body || true)
  [ "$body" = 200 ] || { errors=$((errors+1)); continue; }
  case "$(cat /tmp/canary-body)" in
    *'"version":"canary"'*) canary=$((canary+1));;
    *'"version":"stable"'*) stable=$((stable+1));;
  esac
done
echo "requests=$N stable=$stable canary=$canary errors=$errors"
if [ "$errors" -gt 0 ] || [ "$canary" -eq 0 ]; then
  echo "CANARY FAILED -> rollback (route 100% to stable)"; exit 1
fi
echo "CANARY HEALTHY -> promote to 100%"
