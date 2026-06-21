import type { Puzzle } from "../types";

const MIN_USEFUL_EXPLANATION_LENGTH = 80;

interface CrystalApiResponse {
  explanation?: string;
  error?: string;
}

export async function askGeminiCrystal(puzzle: Puzzle): Promise<string> {
  const correctAnswer = puzzle.choices.find((choice) => choice.isCorrect);
  const wrongAnswers = puzzle.choices
    .filter((choice) => !choice.isCorrect)
    .map((choice) => choice.text);

  if (!correctAnswer) {
    throw new Error("Puzzle is missing a correct answer");
  }

  const response = await fetch("/api/crystal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: puzzle.question,
      correctAnswer: correctAnswer.text,
      wrongAnswers,
    }),
  });

  const data = (await response.json()) as CrystalApiResponse;

  if (!response.ok) {
    throw new Error(data.error ?? `Crystal API request failed: ${response.status}`);
  }

  const explanation = data.explanation?.trim();
  if (!explanation) {
    throw new Error("Crystal API returned an empty response");
  }

  if (explanation.length < MIN_USEFUL_EXPLANATION_LENGTH) {
    throw new Error(`Crystal API returned a too-short response (${explanation.length} chars)`);
  }

  return explanation;
}
