import Phaser from "phaser";
import { GameStage } from "../types";

export interface SceneState {
  stage: GameStage;
  currentPuzzleIndex: number;
  grassColorLevel: number;
  skyColorLevel: number;
  sunColorLevel: number;
}

export interface AnswerFeedback {
  id: number;
  type: "correct" | "wrong";
}

export interface GameCallbacks {
  onQuestionPodReached: (podIndex: number) => void;
  onMirrorReached: () => void;
}

export type PodView = {
  base: Phaser.GameObjects.Ellipse;
  rim: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  glow: Phaser.GameObjects.Ellipse;
};
