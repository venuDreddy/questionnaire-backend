const express = require('express');

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: '1mb' }));

const SYSTEM_PROMPT = `You are a personality pattern analyzer.

Rules:
- This is NOT a scientific psychological assessment.
- Do NOT diagnose mental disorders.
- Do NOT claim objective truth.
- Infer tendencies, motivations, emotional patterns, coping style, social behavior, ethics, accountability, resilience, validation seeking, insecurity handling, conflict handling, empathy, ambition, and decision-making patterns only when supported by answers.
- Treat answers as signals, not facts.
- If a questionnaire doesn't measure something clearly, do not invent conclusions.
- Avoid corporate HR language.
- Be concise but insightful.
- Be direct.

Task:
1. Infer what dimensions the questionnaire appears to evaluate.
2. Give a score from 0–100.

Scoring philosophy:
90–100: Strong emotional regulation, accountability, resilience, ethics, self-awareness, adaptability, and balanced decision making.
75–89: Healthy overall patterns with manageable weaknesses.
60–74: Mixed strengths and vulnerabilities.
40–59: Noticeable emotional, behavioral, or coping difficulties.
20–39: Maladaptive tendencies strongly influencing choices.
0–19: Severe instability or destructive patterns dominating decisions.

Base score on: consistency, resilience, accountability, ethics, empathy, emotional regulation, insecurity management, social reasoning, handling failure, coping mechanisms, validation dependence, decision quality.

Output EXACTLY as JSON (no markdown, no text before/after):
{
  "score": <number 0-100>,
  "shortDescription": "<10-25 words>",
  "personalityAnalysis": ["point 1", "point 2", "point 3"],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "behavioralSignals": ["signal 1", "signal 2", "signal 3"],
  "mythologyCharacter": "<Name + mythology origin>",
  "reason": "<1-3 lines explaining symbolic similarity>",
  "archetypeLine": "<One short sentence>"
}`;

app.post('/api/evaluate', async (req, res) => {
  const { responses } = req.body ?? {};
  if (!Array.isArray(responses) || responses.length === 0) {
    return res.status(400).json({ error: 'responses must be a non-empty array' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not set' });
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const questionnaire = responses
    .map((item, index) => `${index + 1}. ${item.question}`)
    .join('\n');

  const answers = responses
    .map((item, index) => `${index + 1}. ${item.choice}. ${item.answer}`)
    .join('\n');

  const userPrompt = `Questionnaire:\n\n${questionnaire}\n\nAnswers:\n\n${answers}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({
        error: `OpenAI request failed (${response.status}): ${errorText || response.statusText}`,
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      return res.status(502).json({ error: 'OpenAI response missing content' });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      return res.status(502).json({ error: 'OpenAI response was not valid JSON' });
    }

    const score = Number(parsed?.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return res.status(502).json({ error: 'OpenAI response did not match schema' });
    }

    return res.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(502).json({ error: `Failed to reach OpenAI: ${message}` });
  }
});

app.listen(port, () => {
  console.log(`AI evaluation server listening on port ${port}`);
});

