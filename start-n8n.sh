#!/usr/bin/env bash
# ====================================================================
# Start Local n8n Server with AI Invoice Automation Environment
# ====================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="/Users/rusan/node/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

if [ -f "$SCRIPT_DIR/.env" ]; then
  echo "Loading environment from $SCRIPT_DIR/.env..."
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

# Check if n8n is already running on port $N8N_PORT
if lsof -Pi :${N8N_PORT:-5678} -sTCP:LISTEN -t >/dev/null ; then
  echo "⚠️ n8n is already running on port ${N8N_PORT:-5678}!"
  echo "👉 Open: http://localhost:${N8N_PORT:-5678}/"
  exit 0
fi

echo "🚀 Starting n8n server on http://${N8N_HOST:-127.0.0.1}:${N8N_PORT:-5678}/ ..."
LOG_FILE="$SCRIPT_DIR/n8n.log"

nohup n8n start > "$LOG_FILE" 2>&1 &
N8N_PID=$!
echo $N8N_PID > "$SCRIPT_DIR/.n8n.pid"
echo "Process started with PID $N8N_PID (logging to $LOG_FILE)"

# Wait for server to become responsive
for i in {1..30}; do
  if curl -s "http://127.0.0.1:${N8N_PORT:-5678}/" >/dev/null 2>&1; then
    echo "✅ n8n is UP and RUNNING!"
    echo "👉 Web Interface: http://localhost:${N8N_PORT:-5678}/"
    exit 0
  fi
  sleep 1
done

echo "n8n is initializing... Check logs at $LOG_FILE or open http://localhost:${N8N_PORT:-5678}/"
