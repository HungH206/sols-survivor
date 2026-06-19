import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import { GameStage } from "../types";
import { createPhaserGame } from "../game/createPhaserGame";
import type { RunScene } from "../game/RunScene";
import type { AnswerFeedback, GameCallbacks } from "../game/types";

interface GameCanvasProps {
  stage: GameStage;
  currentPuzzleIndex: number;
  grassColorLevel: number;
  skyColorLevel: number;
  sunColorLevel: number;
  answerFeedback: AnswerFeedback | null;
  onQuestionPodReached: (podIndex: number) => void;
  onMirrorReached: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  stage,
  currentPuzzleIndex,
  grassColorLevel,
  skyColorLevel,
  sunColorLevel,
  answerFeedback,
  onQuestionPodReached,
  onMirrorReached,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const runSceneRef = useRef<RunScene | null>(null);
  const callbackRef = useRef(onQuestionPodReached);
  const mirrorCallbackRef = useRef(onMirrorReached);

  callbackRef.current = onQuestionPodReached;
  mirrorCallbackRef.current = onMirrorReached;

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const callbacks: GameCallbacks = {
      onQuestionPodReached: (podIndex) => {
        callbackRef.current(podIndex);
      },
      onMirrorReached: () => {
        mirrorCallbackRef.current();
      },
    };

    const { game, runScene } = createPhaserGame({
      parent: containerRef.current,
      initialState: {
        stage,
        currentPuzzleIndex,
        grassColorLevel,
        skyColorLevel,
        sunColorLevel,
      },
      callbacks,
    });

    gameRef.current = game;
    runSceneRef.current = runScene;

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      runSceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    runSceneRef.current?.setCallbacks({
      onQuestionPodReached: (podIndex) => {
        callbackRef.current(podIndex);
      },
      onMirrorReached: () => {
        mirrorCallbackRef.current();
      },
    });
  }, [onQuestionPodReached, onMirrorReached]);

  useEffect(() => {
    runSceneRef.current?.setState({
      stage,
      currentPuzzleIndex,
      grassColorLevel,
      skyColorLevel,
      sunColorLevel,
    });
  }, [stage, currentPuzzleIndex, grassColorLevel, skyColorLevel, sunColorLevel]);

  useEffect(() => {
    if (!answerFeedback) return;
    runSceneRef.current?.playAnswerFeedback(answerFeedback.type);
  }, [answerFeedback]);

  const restoredPercent =
    stage === GameStage.ENDING
      ? 100
      : Math.floor((grassColorLevel + skyColorLevel + sunColorLevel) * 33);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-stone-900 border border-stone-800 phaser-scene-host"
      id="visual-environment-container"
    >
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 pointer-events-none font-mono z-10">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 text-white/80 px-2.5 py-1 text-[10px] rounded-md tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full inline-block bg-emerald-400 animate-pulse" />
          LOC: GREENWOOD RUN
        </div>
        <div className="bg-black/40 backdrop-blur-md border border-white/10 text-white/80 px-2.5 py-1 text-[10px] rounded-md tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
          <span>WORLD SATURATION:</span>
          <span className="font-semibold text-cyan-400">{restoredPercent}%</span>
        </div>
      </div>
    </div>
  );
};
