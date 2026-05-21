FROM ollama/ollama:latest

RUN apt-get update && apt-get install -y curl nodejs npm && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 11434 3001

CMD ["/bin/sh", "-c", "ollama serve & sleep 5 && npm start"]
