FROM ollama/ollama:latest

RUN apt-get update && apt-get install -y curl nodejs npm && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 11434 3001

ENTRYPOINT []
CMD ["/app/entrypoint.sh"]
