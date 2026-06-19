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
  },
];
