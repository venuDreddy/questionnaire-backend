FROM ollama/ollama:latest

RUN apt-get update && apt-get install -y curl nodejs npm && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p /root/.ollama && ollama serve &  sleep 3 && ollama pull ${OLLAMA_MODEL:-qwen2.5}; pkill ollama || true

EXPOSE 11434 3001

CMD sh -c 'ollama serve & sleep 3 && npm start'
