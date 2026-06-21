export enum GameStage {
  TITLE = "TITLE",
  INTRO = "INTRO",
  EXPLORE = "EXPLORE",
  PUZZLE_1 = "PUZZLE_1",
  RESULT_1 = "RESULT_1",
  PUZZLE_2 = "PUZZLE_2",
  RESULT_2 = "RESULT_2",
  PUZZLE_3 = "PUZZLE_3",
  RESULT_3 = "RESULT_3",
  CLAIM_FINAL_LIGHT = "CLAIM_FINAL_LIGHT",
  ENDING = "ENDING",
}

export interface Choice {
  id: string;
  text: string;
  letter: "A" | "B" | "C";
  isCorrect: boolean;
}

export interface Puzzle {
  id: number;
  question: string;
  choices: Choice[];
  correctFeedback: string;
  crystalExplanation: string;
}

export interface GameState {
  stage: GameStage;
  currentPuzzleIndex: number;
  saturationLevel: number;
  grassColorLevel: number;
  skyColorLevel: number;
  sunColorLevel: number;
  soundEnabled: boolean;
  history: string[];
}

export const PUZZLES: Puzzle[] = [
  {
    id: 1,
    question: "What is the longest day of the year called?",
    choices: [
      { id: "p1-a", text: "Equinox", letter: "A", isCorrect: false },
      { id: "p1-b", text: "Solstice", letter: "B", isCorrect: true },
      { id: "p1-c", text: "Eclipse", letter: "C", isCorrect: false },
    ],
    correctFeedback: "The grass becomes greener.",
    crystalExplanation:
      "The Crystal hums softly. Solstice means the Sun reaches its greatest path through the sky, giving one hemisphere its longest day or longest night. Equinox is different: day and night are nearly balanced. Eclipse means one space object blocks another's light. As sunlight stretches across the season, Greenwood Park remembers how to grow.",
  },
  {
    id: 2,
    question: "What event occurs when day and night are nearly equal in length?",
    choices: [
      { id: "p2-a", text: "Solstice", letter: "A", isCorrect: false },
      { id: "p2-b", text: "Eclipse", letter: "B", isCorrect: false },
      { id: "p2-c", text: "Equinox", letter: "C", isCorrect: true },
    ],
    correctFeedback: "The sky brightens.",
    crystalExplanation:
      "The Crystal turns like a balanced wheel. Equinox is correct because day and night are nearly equal as the Sun crosses Earth's equator. A solstice brings the year's longest or shortest daylight. An eclipse is a shadow alignment, not a season marker. Balance in the heavens clears balance in the sky.",
  },
  {
    id: 3,
    question: "Name one of the two tropical boundaries of Earth.",
    choices: [
      { id: "p3-a", text: "Cancer", letter: "A", isCorrect: true },
      { id: "p3-b", text: "Orion", letter: "B", isCorrect: false },
      { id: "p3-c", text: "Pegasus", letter: "C", isCorrect: false },
    ],
    correctFeedback: "A golden energy radiates. The full solar balance is restored.",
    crystalExplanation:
      "The Crystal flashes gold. Cancer is one of Earth's tropical boundaries, marking the farthest north the direct Sun appears at noon. Orion and Pegasus are constellations, patterns of stars, not latitude lines on Earth. Knowing the Sun's path helps Leo place light, seasons, and growth back into harmony.",
  },
];
