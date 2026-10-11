#!/usr/bin/env bash
set -euo pipefail
cd /workspace/codex
npm ci --cache /tmp/event-horizon-npm-cache --no-audit --no-fund
npm run build
