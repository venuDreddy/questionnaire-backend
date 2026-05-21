FROM ollama/ollama:latest

RUN apt-get update && apt-get install -y curl nodejs npm && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Pre-download tinyllama during build (runs in background)
ENV OLLAMA_HOME=/ollama_data
RUN mkdir -p /ollama_data && \
    (timeout 120 ollama serve &) && \
    sleep 10 && \
    curl -X POST http://localhost:11434/api/pull \
      -d '{"name": "tinyllama"}' \
      -H 'Content-Type: application/json' || true

EXPOSE 11434 3001

ENTRYPOINT []
CMD ["/app/entrypoint.sh"]
