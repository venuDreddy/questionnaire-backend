#!/bin/sh
set -e

MODEL="${OLLAMA_MODEL:-phi}"
OLLAMA_DATA="/ollama_data"
mkdir -p "$OLLAMA_DATA"

export OLLAMA_HOME="$OLLAMA_DATA"

echo "=== Starting Ollama Server ==="
ollama serve &
OLLAMA_PID=$!

echo "=== Waiting for Ollama to initialize ==="
sleep 3

# Wait for ollama to be ready
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✓ Ollama is ready"
    break
  fi
  echo "  Attempt $i/10 - waiting..."
  sleep 2
done

echo "=== Checking for model: $MODEL ==="
if curl -s http://localhost:11434/api/tags | grep -q "\"name\":\"$MODEL\""; then
  echo "✓ Model $MODEL already cached"
else
  echo "⟳ Pulling model $MODEL (this may take 5-15 minutes)..."
  curl -X POST http://localhost:11434/api/pull \
    -d "{\"name\": \"$MODEL\"}" \
    -H 'Content-Type: application/json' \
    -N 2>&1 | while read line; do
    echo "  $line"
  done
  echo "✓ Model $MODEL pull complete"
fi

echo "=== Starting Node.js Application ==="
npm start
