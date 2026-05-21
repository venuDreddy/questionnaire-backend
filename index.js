const express = require("express");

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: "1mb" }));

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5";

const SYSTEM_PROMPT = `You are a personality pattern analyzer.

Rules:
- This is NOT a scientific psychological assessment.
- Do NOT diagnose mental disorders.
- Do NOT claim objective truth.
- Treat answers as signals, not facts.
- If a questionnaire doesn't measure something clearly, do not invent conclusions.
- Be concise but insightful.

Task:
1. Infer personality tendencies from the answers.
2. Give a score from 0–100.
3. Provide a short summary (1-2 lines).
4. Provide a mythology character match.
5. Provide 3-5 analysis bullets.

Output EXACTLY as JSON (no markdown, no text before/after):
{
  "score": <number 0-100>,
  "summary": "<short description>",
  "mythology": "<Name>",
  "analysis": ["point 1", "point 2", "point 3"]
}`;

const normalizeQuestions = (questions) =>
  questions.map((item, index) => {
    if (typeof item === "string") {
      return { id: `Q${index + 1}`, text: item.trim() };
    }
    if (item && typeof item === "object") {
      const id = item.id || item.key || `Q${index + 1}`;
      const text = item.question || item.text || item.prompt || "";
      return { id: String(id).trim(), text: String(text).trim() };
    }
    return { id: `Q${index + 1}`, text: String(item ?? "").trim() };
  });

const getAnswerForQuestion = (answers, questionId, index) => {
  if (Object.prototype.hasOwnProperty.call(answers, questionId)) {
    return answers[questionId];
  }
  const fallbackId = `Q${index + 1}`;
  if (Object.prototype.hasOwnProperty.call(answers, fallbackId)) {
    return answers[fallbackId];
  }
  const numericKey = String(index + 1);
  if (Object.prototype.hasOwnProperty.call(answers, numericKey)) {
    return answers[numericKey];
  }
  return undefined;
};

const extractJson = (text) => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      return null;
    }
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (error) {
    return null;
  }
};

const parseModelResponse = (text) => {
  const json = extractJson(text);
  if (json && typeof json === "object") {
    return json;
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const labelPattern = /^(score|summary|mythology|analysis)\b/i;

  let score;
  let summary = "";
  let mythology = "";
  let analysis = [];
  let current = null;

  for (const line of lines) {
    const labelMatch = line.match(labelPattern);
    if (labelMatch) {
      const label = labelMatch[1].toLowerCase();
      const [, rest = ""] = line.split(/:\s*/, 2);
      current = label;
      if (label === "score") {
        const scoreMatch =
          rest.match(/(\d{1,3})/) || line.match(/(\d{1,3})\s*\/\s*100/i);
        if (scoreMatch) {
          score = Number(scoreMatch[1]);
        }
      } else if (label === "summary") {
        summary = rest.trim();
      } else if (label === "mythology") {
        mythology = rest.trim();
      } else if (label === "analysis" && rest.trim()) {
        analysis = [rest.trim()];
      }
      continue;
    }

    if (current === "analysis") {
      const cleaned = line.replace(/^[-*•]\s*/, "").trim();
      if (cleaned) {
        analysis.push(cleaned);
      }
    } else if (current === "summary" && line) {
      summary = summary ? `${summary} ${line}` : line;
    } else if (!summary && /^summary\b/i.test(line)) {
      summary = line.replace(/^summary\b[:\-]?\s*/i, "");
    } else if (!mythology && /^mythology\b/i.test(line)) {
      mythology = line.replace(/^mythology\b[:\-]?\s*/i, "");
    }
  }

  if (typeof score === "undefined") {
    const scoreMatch =
      text.match(/score\s*[:\-]?\s*(\d{1,3})/i) ||
      text.match(/(\d{1,3})\s*\/\s*100/i);
    if (scoreMatch) {
      score = Number(scoreMatch[1]);
    }
  }

  return { score, summary, mythology, analysis };
};

app.post("/analyze", async (req, res) => {
  const { questions, answers } = req.body ?? {};
  if (!Array.isArray(questions) || questions.length === 0) {
    return res
      .status(400)
      .json({ error: "questions must be a non-empty array" });
  }
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return res.status(400).json({ error: "answers must be an object" });
  }

  const normalizedQuestions = normalizeQuestions(questions);
  const missingQuestions = normalizedQuestions.filter((item) => !item.text);
  if (missingQuestions.length > 0) {
    return res.status(400).json({ error: "questions must include text" });
  }

  const missingAnswers = [];
  const answerLines = normalizedQuestions.map((item, index) => {
    const answer = getAnswerForQuestion(answers, item.id, index);
    if (typeof answer === "undefined") {
      missingAnswers.push(item.id);
    }
    return `${item.id}: ${typeof answer === "undefined" ? "" : String(answer)}`;
  });

  if (missingAnswers.length > 0) {
    return res.status(400).json({
      error: `Missing answers for: ${missingAnswers.join(", ")}`,
    });
  }

  const questionLines = normalizedQuestions
    .map((item) => `${item.id}. ${item.text}`)
    .join("\n");

  const prompt = `${SYSTEM_PROMPT}\n\nQuestions:\n${questionLines}\n\nAnswers:\n${answerLines.join(
    "\n",
  )}`;

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({
        error: `Ollama request failed (${response.status}): ${errorText || response.statusText}`,
      });
    }

    const data = await response.json();
    const content = data?.response;
    if (typeof content !== "string") {
      return res.status(502).json({ error: "Ollama response missing content" });
    }

    const parsed = parseModelResponse(content);
    const score = Number(parsed?.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return res
        .status(502)
        .json({ error: "Model response did not match schema" });
    }
    if (
      typeof parsed?.summary !== "string" ||
      parsed.summary.trim().length === 0
    ) {
      return res.status(502).json({ error: "Model response missing summary" });
    }
    if (
      typeof parsed?.mythology !== "string" ||
      parsed.mythology.trim().length === 0
    ) {
      return res
        .status(502)
        .json({ error: "Model response missing mythology" });
    }

    const analysis = Array.isArray(parsed.analysis)
      ? parsed.analysis.filter(
          (item) => typeof item === "string" && item.trim(),
        )
      : [];

    return res.json({
      score,
      summary: parsed.summary.trim(),
      mythology: parsed.mythology.trim(),
      analysis,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res
      .status(502)
      .json({ error: `Failed to reach Ollama: ${message}` });
  }
});

app.listen(port, () => {
  console.log(`AI evaluation server listening on port ${port}`);
});
