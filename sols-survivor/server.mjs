import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MIN_USEFUL_EXPLANATION_LENGTH = 80;
const MAX_BODY_BYTES = 16_384;

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const distDir = join(rootDir, "dist");
const port = Number(process.env.PORT ?? 8080);

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
]);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("Request body is too large");
    }
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function buildCrystalPrompt({ question, correctAnswer, wrongAnswers }) {
  return `
Return only the Crystal's final spoken explanation.
Do not ask a follow-up question.
Do not stop after a greeting.

Write 60 to 100 words in a magical but educational tone.
Include:
- Why "${correctAnswer}" is correct.
- Why these other choices are incorrect: ${wrongAnswers.join(", ")}.
- A connection to light, seasons, or growth.

Question:
${question}
`;
}

async function generateCrystalExplanation(payload) {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  if (
    typeof payload?.question !== "string" ||
    typeof payload?.correctAnswer !== "string" ||
    !Array.isArray(payload?.wrongAnswers)
  ) {
    throw new Error("Invalid crystal request payload");
  }

  const wrongAnswers = payload.wrongAnswers.filter((answer) => typeof answer === "string");
  const geminiResponse = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: buildCrystalPrompt({
                question: payload.question,
                correctAnswer: payload.correctAnswer,
                wrongAnswers,
              }),
            },
          ],
        },
      ],
      system_instruction: {
        parts: [
          {
            text: "You are a cosmic crystal guiding Leo in a solar-themed educational game.",
          },
        ],
      },
      generationConfig: {
        maxOutputTokens: 320,
        temperature: 0.75,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    }),
  });

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    throw new Error(`Gemini request failed: ${geminiResponse.status} ${errorText}`);
  }

  const data = await geminiResponse.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  if (text.length < MIN_USEFUL_EXPLANATION_LENGTH) {
    throw new Error(
      `Gemini returned a too-short response (${text.length} chars, finishReason: ${
        candidate?.finishReason ?? "unknown"
      }): ${text}`
    );
  }

  return text;
}

async function handleCrystalRequest(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const payload = await readJsonBody(request);
    const explanation = await generateCrystalExplanation(payload);
    sendJson(response, 200, { explanation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown crystal error";
    console.error(message);
    sendJson(response, 502, { error: message });
  }
}

async function serveStatic(request, response) {
  const url = new URL(request.url ?? "/", "http://localhost");
  const rawPath = decodeURIComponent(url.pathname);
  const normalizedPath = normalize(rawPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(distDir, normalizedPath);

  if (!filePath.startsWith(distDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(distDir, "index.html");
  }

  if (!existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const ext = extname(filePath);
  const isIndex = filePath.endsWith("index.html");
  response.writeHead(200, {
    "Content-Type": mimeTypes.get(ext) ?? "application/octet-stream",
    "Cache-Control": isIndex ? "no-cache" : "public, max-age=31536000, immutable",
  });

  createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  if (request.url?.startsWith("/api/crystal")) {
    await handleCrystalRequest(request, response);
    return;
  }

  if (request.url === "/healthz") {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("ok");
    return;
  }

  await serveStatic(request, response);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`SOLS-Runner listening on 0.0.0.0:${port}`);
});
