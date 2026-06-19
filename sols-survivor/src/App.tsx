import { useEffect, useState } from "react";
import { GameCanvas } from "./components/GameCanvas";
import { CrystalScreen } from "./components/CrystalScreen";
import { GameStage, PUZZLES } from "./types";
import type { Choice } from "./types";
import { synth } from "./utils/AudioSynth";

export default function App() {
  const [stage, setStage] = useState<GameStage>(GameStage.TITLE);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [grassColorLevel, setGrassColorLevel] = useState(0);
  const [skyColorLevel, setSkyColorLevel] = useState(0);
  const [sunColorLevel, setSunColorLevel] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (soundEnabled && stage !== GameStage.TITLE) {
      const activeRestorationProgress = (grassColorLevel + skyColorLevel + sunColorLevel) / 3;
      synth.startBackgroundDrone(activeRestorationProgress);
    } else {
      synth.stopDrone();
    }
  }, [stage, grassColorLevel, skyColorLevel, sunColorLevel, soundEnabled]);

  useEffect(() => {
    return () => {
      synth.stopDrone();
    };
  }, []);

  const handleStartGame = () => {
    synth.playClick();
    setStage(GameStage.EXPLORE);
    setHistory(["Leo began running through Greenwood Park on a gloomy, windless gray day."]);
  };

  const handleContinueFromIntro = () => {
    synth.playClick();
    setStage(GameStage.PUZZLE_1);
    setHistory((prev) => [
      ...prev,
      "Leo stopped and examined a pulsing octagonal crystal floating above the pathway.",
    ]);
  };

  const handleQuestionPodReached = (podIndex: number) => {
    if (stage !== GameStage.EXPLORE || podIndex !== currentPuzzleIndex) return;

    synth.playClick();
    setStage(
      podIndex === 0
        ? GameStage.PUZZLE_1
        : podIndex === 1
          ? GameStage.PUZZLE_2
          : GameStage.PUZZLE_3
    );
    setHistory((prev) => [
      ...prev,
      `Leo reached question pod ${podIndex + 1}. The crystal projects a new challenge.`,
    ]);
  };

  const handleMirrorReached = () => {
    if (stage !== GameStage.CLAIM_FINAL_LIGHT) return;

    synth.playSuccessSound();
    setStage(GameStage.ENDING);
    setHistory((prev) => [
      ...prev,
      "Leo stepped into the mirror light and claimed the final 1%.",
      "He turned back toward the restored park and celebrated the completed run.",
    ]);
  };

  const handleSelectAnswer = (choice: Choice) => {
    const puzzle = PUZZLES[currentPuzzleIndex];

    if (!choice.isCorrect) {
      synth.playFailureSound();
      setHistory((prev) => [
        ...prev,
        `${choice.letter}. ${choice.text} makes the crystal dim. Leo steadies his breath and tries again.`,
      ]);
      return;
    }

    if (currentPuzzleIndex === 0) {
      synth.playCrystalChime(currentPuzzleIndex);
      setGrassColorLevel(1);
      setStage(GameStage.RESULT_1);
      setHistory((prev) => [
        ...prev,
        `Correct: ${choice.text}. ${puzzle.correctFeedback}`,
      ]);
    } else if (currentPuzzleIndex === 1) {
      synth.playCrystalChime(currentPuzzleIndex);
      setSkyColorLevel(1);
      setStage(GameStage.RESULT_2);
      setHistory((prev) => [
        ...prev,
        `Correct: ${choice.text}. ${puzzle.correctFeedback}`,
      ]);
    } else {
      synth.playSuccessSound();
      setSunColorLevel(1);
      setStage(GameStage.RESULT_3);
      setHistory((prev) => [
        ...prev,
        `Correct: ${choice.text}. ${puzzle.correctFeedback}`,
      ]);
    }
  };

  const handleNextPuzzle = () => {
    synth.playClick();
    if (currentPuzzleIndex === 0) {
      setCurrentPuzzleIndex(1);
      setStage(GameStage.EXPLORE);
    } else if (currentPuzzleIndex === 1) {
      setCurrentPuzzleIndex(2);
      setStage(GameStage.EXPLORE);
    } else {
      setCurrentPuzzleIndex(3);
      setStage(GameStage.CLAIM_FINAL_LIGHT);
      setHistory((prev) => [
        ...prev,
        "The three question pods are complete. A mirror appears on the road, holding the final 1%.",
      ]);
    }
  };

  const handleRestart = () => {
    synth.playClick();
    setStage(GameStage.TITLE);
    setCurrentPuzzleIndex(0);
    setGrassColorLevel(0);
    setSkyColorLevel(0);
    setSunColorLevel(0);
    setHistory([]);
    synth.stopDrone();
  };

  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    synth.isMuted = !nextState;

    if (!nextState) {
      synth.stopDrone();
    } else {
      synth.playClick();
    }
  };

  const currentPuzzle =
    stage === GameStage.PUZZLE_1 || stage === GameStage.RESULT_1
      ? PUZZLES[0]
      : stage === GameStage.PUZZLE_2 || stage === GameStage.RESULT_2
        ? PUZZLES[1]
        : stage === GameStage.PUZZLE_3 || stage === GameStage.RESULT_3
          ? PUZZLES[2]
          : null;

  return (
    <div className="app-shell" id="game-application-container">
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span />
          </div>
          <div>
            <span className="brand-title">SOLS-Survivor</span>
            <span className="brand-subtitle">Solar Alchemy Run</span>
          </div>
        </div>

        <div className="restore-meter" aria-label="World restoration progress">
          <span>World Restoration</span>
          <div>
            <i className={grassColorLevel > 0 ? "meter-on grass-on" : ""} title="Grass restored" />
            <i className={skyColorLevel > 0 ? "meter-on sky-on" : ""} title="Sky restored" />
            <i className={sunColorLevel > 0 ? "meter-on sun-on" : ""} title="Sun restored" />
          </div>
        </div>
      </header>

      <main className="game-layout focus-game-layout left-panel-layout">
        <section className="game-message-panel">
          <CrystalScreen
            stage={stage}
            puzzle={currentPuzzle}
            currentPuzzleIndex={currentPuzzleIndex}
            history={history}
            soundEnabled={soundEnabled}
            onStartGame={handleStartGame}
            onContinue={handleContinueFromIntro}
            onSelectAnswer={handleSelectAnswer}
            onNextPuzzle={handleNextPuzzle}
            onRestart={handleRestart}
            onToggleSound={handleToggleSound}
          />
        </section>

        <section className="game-stage">
          <div className="scene-column">
            <GameCanvas
              stage={stage}
              currentPuzzleIndex={currentPuzzleIndex}
              grassColorLevel={grassColorLevel}
              skyColorLevel={skyColorLevel}
              sunColorLevel={sunColorLevel}
              onQuestionPodReached={handleQuestionPodReached}
              onMirrorReached={handleMirrorReached}
            />
          </div>
        </section>
      </main>

      <footer className="app-footer">SOLS-SURVIVOR // PROCEDURAL INTERACTION SYSTEM</footer>
    </div>
  );
}
