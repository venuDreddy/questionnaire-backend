# Questionnaire Backend

Node.js + Express server for AI evaluation.

## Setup

```bash
npm install
```

## Run Locally

```bash
OPENAI_API_KEY=sk-... npm start
```

Server listens on port 3001 (or `PORT` env var).

## Environment Variables

- `OPENAI_API_KEY` - Required. OpenAI API key from platform.openai.com
- `OPENAI_MODEL` - Optional. Model name (default: `gpt-4o-mini`)
- `PORT` - Optional. Port to listen on (default: `3001`)

## API

**POST /api/evaluate**

Request body:
```json
{
  "responses": [
    { "id": "q1", "question": "...", "choice": "A", "answer": "..." },
    ...
  ]
}
```

Response:
```json
{
  "score": 75,
  "shortDescription": "...",
  "personalityAnalysis": [...],
  "strengths": [...],
  "weaknesses": [...],
  "behavioralSignals": [...],
  "mythologyCharacter": "...",
  "reason": "...",
  "archetypeLine": "..."
}
```

## Deployment

**Render:**
1. Create new Web Service
2. Connect GitHub repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Set environment variables in Settings

**Railway:**
Similar setup, add environment variables in Variables tab.

**Heroku, DigitalOcean, etc:**
Follow platform-specific instructions, ensure `OPENAI_API_KEY` is set.
