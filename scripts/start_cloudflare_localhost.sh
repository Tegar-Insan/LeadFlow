#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5001}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "[leadflow] cloudflared is not installed."
  exit 1
fi

echo "[leadflow] Starting Cloudflare quick tunnel to http://localhost:${PORT}"
echo "[leadflow] Copy the generated https://*.trycloudflare.com URL and use it for TikTok verification/callback"
exec cloudflared tunnel --url "http://localhost:${PORT}"