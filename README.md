# Questionnaire Backend

Node.js + Express server for AI evaluation.

## Setup

```bash
npm install
```

## Run Locally

```bash
OLLAMA_MODEL=qwen2.5 npm start
```

Server listens on port 3001 (or `PORT` env var).

## Environment Variables

- `OLLAMA_URL` - Optional. Ollama base URL (default: `http://localhost:11434`)
- `OLLAMA_MODEL` - Optional. Model name (default: `qwen2.5`)
- `PORT` - Optional. Port to listen on (default: `3001`)

## API

**POST /analyze**

Request body:

```json
{
  "questions": ["..."],
  "answers": {
    "Q1": "A",
    "Q2": "C"
  }
}
```

Response:

```json
{
  "score": 74,
  "summary": "Responsible, resilient...",
  "mythology": "Yudhishthira",
  "analysis": ["..."]
}
```

## Deployment

### Heroku (with Ollama embedded)

Deploy backend + Ollama model in a single container:

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   heroku login
   ```

2. **Create Heroku app**
   ```bash
   heroku create your-app-name
   ```

3. **Set dyno type** (required for Ollama + Node):
   ```bash
   heroku dyno:type standard-2x --app your-app-name
   ```
   ⚠️ Standard 2x (~$100/mo) is needed for model loading. Free tier will OOM.

4. **Deploy**
   ```bash
   git push heroku main
   ```
   First deploy pulls the model (~5-10 min). Subsequent deploys are faster.

5. **Test**
   ```bash
   curl https://your-app-name.herokuapp.com/analyze \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
       "questions": ["Do you prefer leading or following?"],
       "answers": {"Q1": "Leading"}
     }'
   ```

6. **Environment variables** (optional):
   ```bash
   heroku config:set OLLAMA_MODEL=gemma --app your-app-name
   ```

### Docker (Local testing)

```bash
docker build -t questionnaire-backend .
docker run -p 3001:3001 -p 11434:11434 questionnaire-backend
```

First run pulls the model. Subsequent runs start instantly.

### Render or Railway

1. Deploy as a Web Service (no GPU needed for CPU models)
2. Set `OLLAMA_URL=http://localhost:11434` (default)
3. Set `OLLAMA_MODEL=qwen2.5` (or preferred model)
4. Ensure dyno/instance has at least 2GB RAM
