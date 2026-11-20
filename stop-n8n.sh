#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/.n8n.pid" ]; then
  PID=$(cat "$SCRIPT_DIR/.n8n.pid")
  if ps -p $PID > /dev/null 2>&1; then
    echo "Stopping n8n (PID: $PID)..."
    kill $PID
    rm -f "$SCRIPT_DIR/.n8n.pid"
    echo "✅ n8n stopped."
    exit 0
  fi
fi

# Fallback check by port
PORT=${N8N_PORT:-5678}
PID=$(lsof -ti tcp:$PORT)
if [ -n "$PID" ]; then
  echo "Stopping process on port $PORT (PID: $PID)..."
  kill $PID
  echo "✅ n8n stopped."
else
  echo "n8n is not currently running."
fi
