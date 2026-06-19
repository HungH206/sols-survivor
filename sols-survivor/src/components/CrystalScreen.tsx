import React, { useEffect, useState } from "react";
import { GameStage } from "../types";
import type { Choice, Puzzle } from "../types";
import { Sparkles, ArrowRight, RotateCcw, Volume2, VolumeX, History, Check, ArrowLeft, Lock } from "lucide-react";
import { synth } from "../utils/AudioSynth";

interface CrystalScreenProps {
  stage: GameStage;
  puzzle: Puzzle | null;
  currentPuzzleIndex: number;
  history: string[];
  soundEnabled: boolean;
  onStartGame: () => void;
  onContinue: () => void;
  onSelectAnswer: (choice: Choice) => void;
  onNextPuzzle: () => void;
  onRestart: () => void;
  onToggleSound: () => void;
}

// A simple local text-typing component to give dialogue a premium visual novel look
const TypingText: React.FC<{ text: string; speed?: number }> = ({ text, speed = 25 }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    setDisplayedText("");
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        const nextCharacter = text.charAt(index);
        setDisplayedText((prev) => prev + nextCharacter);
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <span className="transition-all duration-300">{displayedText}</span>;
};

export const CrystalScreen: React.FC<CrystalScreenProps> = ({
  stage,
  puzzle,
  currentPuzzleIndex,
  history,
  soundEnabled,
  onStartGame,
  onContinue,
  onSelectAnswer,
  onNextPuzzle,
  onRestart,
  onToggleSound,
}) => {
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [showWrongFeedback, setShowWrongFeedback] = useState(false);
  const [cipherShift, setCipherShift] = useState<number>(13); // ROT13 starting offset

  // Reset Caesar Cipher offset every time player enters puzzle 2
  useEffect(() => {
    if (stage === GameStage.PUZZLE_2) {
      setCipherShift(13);
    }
  }, [stage]);

  const ALPHABET_STR = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const getShiftedChar = (char: string, shift: number): string => {
    const idx = ALPHABET_STR.indexOf(char);
    if (idx === -1) return char;
    let newIdx = (idx + shift) % 26;
    if (newIdx < 0) newIdx += 26;
    return ALPHABET_STR[newIdx];
  };

  const handleShiftChange = (amount: number) => {
    synth.playClick();
    setCipherShift((prev) => {
      let next = (prev + amount) % 26;
      if (next < 0) next += 26;
      return next;
    });
  };

  // Helper to handle answer selections with state protection
  const handleAnswerClick = (choice: Choice) => {
    setSelectedLetter(choice.letter);
    if (choice.isCorrect) {
      setShowWrongFeedback(false);
      onSelectAnswer(choice);
    } else {
      setShowWrongFeedback(true);
      onSelectAnswer(choice);
      // Give a brief shake feedback, then clear choice selection
      setTimeout(() => {
        setSelectedLetter(null);
        setShowWrongFeedback(false);
      }, 1500);
    }
  };

  // Get dynamic dialogue based on the active state
  const getLeoThoughts = () => {
    switch (stage) {
      case GameStage.TITLE:
        return "Everything is covered in a heavy, lifeless gray cast. There has to be a path back to vibrancy.";
      case GameStage.INTRO:
        return "This light... it glows right through the thick mist. It responds to my presence.";
      case GameStage.EXPLORE:
        return "The next pod is ahead on the road. I need to keep moving forward.";
      case GameStage.PUZZLE_1:
        return "The crystal is asking about the Solstice. The peak of summer sun. Let me think...";
      case GameStage.RESULT_1:
        return "The grass under my boots is shifting. Cold gray is bleeding out, warm emerald is returning!";
      case GameStage.PUZZLE_2:
        return cipherShift === 0
          ? "Amazing! The celestial gears have aligned perfectly. The letters spell EQUINOX!"
          : "The crystal letters are scrambled. I can rotate the dial with Left and Right. Let me align it to 0-offset.";
      case GameStage.RESULT_2:
        return "The sky is breaking! The gray fog is evaporating into a brilliant deep azure.";
      case GameStage.PUZZLE_3:
        return "The tropical boundaries. This must refer to the sun's highest celestial arcs.";
      case GameStage.RESULT_3:
        return "Incredible! Warm golden rays of sunlight are washing across the entire landscape.";
      case GameStage.CLAIM_FINAL_LIGHT:
        return "The crystal is almost complete. That mirror is holding the final one percent.";
      case GameStage.ENDING:
        return "I claimed the final one percent. The run is complete.";
      default:
        return "The crystal pulses. My reflection is waiting.";
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8 justify-between relative shadow-2xl text-stone-100"
      id="crystal-screen-narrative-panel"
    >
      {/* Top Header Row with Sound Control & Status */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-mono text-xs text-slate-300 tracking-widest uppercase">
            STORY SYSTEM // CHALLENGE DRIVER
          </span>
        </div>
        
        <button
          onClick={onToggleSound}
          id="sound-control-toggle"
          aria-label="Toggle Sound Effects"
          className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-stone-200 hover:text-white transition-all flex items-center gap-1.5 text-xs font-mono"
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>SFX: ON</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              <span>SFX: OFF</span>
            </>
          )}
        </button>
      </div>

      {/* Primary Narrative & Interface Area */}
      <div className="flex-1 flex flex-col justify-center my-2 overflow-y-auto pr-1">
        
        {/* TITLE STAGE */}
        {stage === GameStage.TITLE && (
          <div className="text-center space-y-6 py-4" id="stage-title-layout">
            <div className="space-y-2">
              <span className="text-[10px] bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 px-3 py-1 rounded-full uppercase tracking-widest font-mono font-semibold">
                Version 1.0: Active Run
              </span>
              <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight bg-gradient-to-tr from-emerald-400 via-teal-200 to-cyan-300 bg-clip-text text-transparent uppercase">
                SOLS-Survivor
              </h1>
              <p className="font-mono text-xs text-slate-400 tracking-wider">
                Celestial Solar Challenges
              </p>
            </div>

            <div className="max-w-md mx-auto text-slate-200 text-sm leading-relaxed p-4 bg-white/5 rounded-2xl border border-white/5">
              <TypingText
                text="Leo has hit a heavy state of stagnation, where everything feels gray. In Greenwood Park, he uncovers a beautiful solar crystal. Answer its questions to restore colors to the world."
                speed={15}
              />
            </div>

            <button
              onClick={onStartGame}
              id="start-game-button"
              className="px-8 py-3.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display font-bold hover:scale-[1.03] active:scale-95 shadow-[0_10px_20px_-5px_rgba(52,211,153,0.5)] transition-all flex items-center justify-center gap-2.5 mx-auto uppercase tracking-wide"
            >
              <span>Begin Leo's Run</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>
        )}

        {/* EXPLORATION STAGE */}
        {stage === GameStage.EXPLORE && (
          <div className="space-y-6" id="stage-explore-layout">
            <div className="space-y-1.5">
              <div className="inline-block bg-cyan-400/15 border border-cyan-300/30 text-cyan-300 rounded-full px-3 py-0.5 text-[10px] font-mono uppercase tracking-widest font-bold">
                FIELD RUN / QUESTION PODS ACTIVE
              </div>
              <h2 className="text-2xl font-display font-extrabold text-white">
                Move Forward.
              </h2>
            </div>

            <div className="space-y-3.5 text-slate-200 text-sm md:text-base leading-relaxed">
              <p className="border-l-2 border-cyan-300 pl-4 py-1 italic text-slate-100">
                <TypingText text="A question pod is waiting farther up the road." speed={20} />
              </p>
              <p>
                Reach pod 1, then pod 2, then pod 3. Each correct answer releases sparks into the crystal and opens the next road segment.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((index) => {
                const isCurrent = index === currentPuzzleIndex;
                const isSolved = index < currentPuzzleIndex;
                return (
                  <div
                    key={index}
                    className={`rounded-xl border px-3 py-3 text-center font-mono text-xs font-bold ${
                      isSolved
                        ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200"
                        : isCurrent
                        ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-200"
                        : "border-white/10 bg-white/5 text-slate-400"
                    }`}
                  >
                    {isSolved ? "LIT" : "POD"} {index + 1}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* INTRO STAGE */}
        {stage === GameStage.INTRO && (
          <div className="space-y-6" id="stage-intro-layout">
            <div className="space-y-1.5">
              <div className="inline-block bg-white/10 border border-white/10 text-emerald-400 rounded-full px-3 py-0.5 text-[10px] font-mono uppercase tracking-widest font-bold">
                STAGE 0 / PART I
              </div>
              <h2 className="text-2xl font-display font-extrabold text-white">
                Leo Feels Stuck.
              </h2>
            </div>

            <div className="space-y-3.5 text-slate-200 text-sm md:text-base leading-relaxed">
              <p className="border-l-2 border-emerald-400 pl-4 py-1 italic text-slate-100">
                <TypingText text="Lately everything has felt complete gray." speed={25} />
              </p>
              <p>
                During an ordinary run through the heavy mist of Greenwood Park, you discover a mysterious celestial crystal. It floats silently, pulsing with a deep latent warmth.
              </p>
            </div>

            <button
              onClick={onContinue}
              id="continue-button-intro"
              className="px-6 py-3 rounded-full bg-white hover:bg-emerald-400 hover:text-white text-indigo-950 font-display font-bold active:scale-95 transition-all flex items-center gap-2 uppercase text-xs tracking-wider"
            >
              <span>Examine the Crystal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CELESTIAL CAESAR CIPHER / ENIGMA INTERACTIVE PUZZLE FOR PUZZLE_2 */}
        {stage === GameStage.PUZZLE_2 && puzzle && (
          <div className="relative z-10 w-full bg-white rounded-3xl p-5 md:p-6 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.4)] flex flex-col items-center text-center border border-slate-100 text-slate-900" id="stage-puzzle-caesar-layout">
            <div className="px-3.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-md mb-4 flex items-center gap-1.5 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-white animate-spin-slow" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">
                Celestial Caesar Cipher / Enigma Active
              </span>
            </div>

            <h3 className="text-indigo-950 text-base md:text-lg font-black mb-1.5 leading-tight font-display uppercase tracking-wider">
              {puzzle.question}
            </h3>
            
            <p className="text-xs text-slate-500 max-w-md mb-4 leading-relaxed">
              The sky remains a stagnant, foggy gray. The crystal has locked the letters in a simple rotational cipher. Use the Left and Right dials to shift all rings and align them to 0 rotation offset to decode the event where day and night are nearly equal.
            </p>

            {/* Scrambled Word Tile Row */}
            <div className="flex justify-center gap-1.5 md:gap-2 w-full py-4 px-2 bg-slate-50 rounded-2xl border border-slate-100 mb-4 relative overflow-visible select-none">
              {cipherShift === 0 && (
                <div className="absolute inset-0 bg-emerald-400/10 animate-pulse pointer-events-none" />
              )}
              
              {"EQUINOX".split("").map((char, charIdx) => {
                const displayedChar = getShiftedChar(char, cipherShift);
                return (
                  <div key={charIdx} className="flex flex-col items-center">
                    <div className={`w-8 h-10 md:w-9 md:h-12 rounded-xl border-2 flex items-center justify-center font-black text-base md:text-lg transition-all duration-300 shadow ${
                      cipherShift === 0
                        ? "bg-emerald-400 border-emerald-500 text-slate-950 scale-110 shadow-emerald-400/30 font-bold"
                        : "bg-white border-slate-200 text-indigo-950"
                    }`}>
                      {displayedChar}
                    </div>
                    <span className="text-[8px] text-slate-400 font-mono mt-1 uppercase font-bold tracking-tight">
                      Ring {charIdx + 1}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Rotational Dials (Controls) */}
            <div className="flex items-center gap-5 mb-5 select-none">
              <button
                onClick={() => handleShiftChange(-1)}
                className="py-2.5 px-4 rounded-full bg-slate-100 hover:bg-emerald-400 hover:text-white border border-slate-200 shadow-sm active:scale-90 transition-all font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider"
                id="caesar-btn-left"
                aria-label="Rotate Left"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Left</span>
              </button>

              <div className="flex flex-col text-center">
                <span className="text-[8px] uppercase font-bold text-slate-400 tracking-widest leading-none mb-1">Rotation Offset</span>
                <span className={`text-sm md:text-base font-black font-mono transition-all duration-300 ${cipherShift === 0 ? "text-emerald-500" : "text-indigo-950"}`}>
                  {cipherShift === 0 ? "0 (BALANCED)" : `+${cipherShift}`}
                </span>
              </div>

              <button
                onClick={() => handleShiftChange(1)}
                className="py-2.5 px-4 rounded-full bg-slate-100 hover:bg-emerald-400 hover:text-white border border-slate-200 shadow-sm active:scale-90 transition-all font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider"
                id="caesar-btn-right"
                aria-label="Rotate Right"
              >
                <span>Right</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Unlock Status / Button */}
            <div className="w-full">
              {cipherShift === 0 ? (
                <button
                  onClick={() => {
                    const matchChoice = puzzle.choices.find(c => c.letter === "C");
                    if (matchChoice) {
                      handleAnswerClick(matchChoice);
                    }
                  }}
                  id="choice-button-caesar-solve"
                  className="w-full py-3.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-400/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-slate-950 animate-bounce" />
                  <span>Stabilize Celestial Balance</span>
                </button>
              ) : (
                <div className="py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-100/80 text-[10px] text-slate-400 font-mono tracking-wider uppercase font-semibold">
                  ⚠️ ALCHEMY STATUS: CELESTIAL ALIGNMENT LOCKED
                </div>
              )}
            </div>
          </div>
        )}

        {/* PUZZLE STAGES 1 & 3 */}
        {(stage === GameStage.PUZZLE_1 || stage === GameStage.PUZZLE_3) && puzzle && (
          <div className="relative z-10 w-full bg-white rounded-3xl p-5 md:p-6 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.4)] flex flex-col items-center text-center border border-slate-100 text-slate-900" id="stage-puzzle-layout">
            <div className="px-3.5 py-1 bg-emerald-400 rounded-full shadow-md mb-4">
              <span className="text-[10px] font-bold text-emerald-950 uppercase tracking-widest">
                Challenge {puzzle.id} of 03
              </span>
            </div>
            
            <h3 className="text-indigo-950 text-xl font-extrabold mb-5 leading-tight font-display">
              {puzzle.question}
            </h3>

            {/* Answer Options Grid */}
            <div className="grid grid-cols-1 gap-3 w-full">
              {puzzle.choices.map((choice) => {
                const isSelected = selectedLetter === choice.letter;
                
                return (
                  <button
                    key={choice.id}
                    onClick={() => handleAnswerClick(choice)}
                    disabled={selectedLetter !== null}
                    id={`choice-button-${choice.letter.toLowerCase()}`}
                    className={`group flex items-center justify-between w-full p-4 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-400 ring-4 ring-emerald-400/10 shadow-md text-emerald-900"
                        : "bg-slate-50 border-slate-100 hover:border-emerald-400 hover:bg-emerald-50/10 text-indigo-950 cursor-pointer"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`w-8 h-8 flex items-center justify-center font-bold rounded-lg transition-all ${
                        isSelected
                          ? "bg-emerald-400 text-white"
                          : "bg-slate-200 text-slate-500 group-hover:bg-emerald-400 group-hover:text-white"
                      }`}>
                        {choice.letter}
                      </span>
                      <span className="font-bold text-slate-800 text-sm md:text-base">
                        {choice.text}
                      </span>
                    </span>

                    {/* Show a beautiful checkmark if correct */}
                    {isSelected && choice.isCorrect && (
                      <div className="w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {showWrongFeedback && (
              <div 
                className="mt-3 text-red-500 text-xs font-mono font-semibold"
                id="wrong-answer-notifier"
              >
                The crystal hums discordantly. Try another option.
              </div>
            )}
          </div>
        )}

        {/* RESULT VIEWPORTS */}
        {(stage === GameStage.RESULT_1 || stage === GameStage.RESULT_2 || stage === GameStage.RESULT_3) && puzzle && (
          <div className="space-y-5" id="stage-result-layout">
            <div className="space-y-1 text-center md:text-left">
              <span className="bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 px-3 py-0.5 text-[10px] font-mono uppercase tracking-widest rounded-full font-bold">
                ALCHEMICAL ALIGNMENT EFFECT
              </span>
              <h3 className="text-3xl font-display font-extrabold text-emerald-400">
                Correct.
              </h3>
            </div>

            <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-slate-100 text-base leading-relaxed flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 animate-pulse" />
                <span>
                  <TypingText text={puzzle.correctFeedback} speed={30} />
                </span>
              </p>
            </div>

            <button
              onClick={() => {
                setSelectedLetter(null);
                onNextPuzzle();
              }}
              id="next-step-button"
              className="px-6 py-3 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display font-bold hover:scale-[1.02] active:scale-95 shadow-[0_10px_20px_-5px_rgba(52,211,153,0.5)] transition-all flex items-center gap-2 justify-center uppercase text-xs tracking-wider"
            >
              <span>{stage === GameStage.RESULT_3 ? "Find the Mirror" : "Continue Journey"}</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>
        )}

        {/* FINAL CLAIM STAGE */}
        {stage === GameStage.CLAIM_FINAL_LIGHT && (
          <div className="space-y-6" id="stage-final-claim-layout">
            <div className="space-y-1.5">
              <div className="inline-block bg-amber-400/20 border border-amber-400/30 text-amber-300 px-3.5 py-0.5 text-[10px] font-mono uppercase tracking-widest rounded-full font-bold">
                FINAL 1% / MIRROR CLAIM
              </div>
              <h3 className="text-3xl font-display font-extrabold text-white">
                Claim the Last Light.
              </h3>
            </div>

            <div className="space-y-3.5 max-w-xl mx-auto text-slate-200 text-sm leading-relaxed bg-white/5 p-5 rounded-2xl border border-white/5">
              <p className="border-l-2 border-amber-300 pl-4 py-0.5">
                The crystal is bright, but one last shimmer is missing.
              </p>
              <p className="border-l-2 border-cyan-300 pl-4 py-0.5 italic text-slate-300">
                A mirror has appeared in the road. Reach it to claim the final 1%.
              </p>
            </div>
          </div>
        )}

        {/* EPILOGUE ENDING SCREEN */}
        {stage === GameStage.ENDING && (
          <div className="space-y-5" id="stage-ending-layout">
            <div className="space-y-1.5 text-center">
              <div className="inline-block bg-amber-400/20 border border-amber-400/30 text-amber-400 px-3.5 py-0.5 text-[10px] font-mono uppercase tracking-widest rounded-full font-bold">
                THE FINAL REFLECTION
              </div>
              <h3 className="text-3xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-amber-300">
                A Mirror Appears.
              </h3>
            </div>

            <div className="space-y-3.5 max-w-xl mx-auto text-slate-200 text-sm leading-relaxed bg-white/5 p-5 rounded-2xl border border-white/5">
              <p className="border-l-2 border-emerald-400 pl-4 py-0.5">
                Leo steps into the mirror light and claims the final 1%.
              </p>
              <p className="border-l-2 border-cyan-400 pl-4 py-0.5 italic text-slate-300">
                He turns back toward the road, sees the restored park, and celebrates.
              </p>
              <p className="border-l-2 border-amber-400 pl-4 py-0.5 font-display font-black text-amber-300 text-lg">
                <TypingText text="SOLS-Survivor complete." speed={40} />
              </p>
            </div>

            <div className="text-center py-1">
              <h4 className="text-3xl font-display uppercase tracking-widest font-black text-white italic">
                THE END
              </h4>
            </div>

            <button
              onClick={() => {
                onRestart();
              }}
              id="restart-game-button"
              className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-stone-100 font-display font-bold active:scale-95 transition-all flex items-center gap-2 mx-auto justify-center uppercase text-xs tracking-wider"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>Restart Run</span>
            </button>
          </div>
        )}
      </div>

      {/* CHARACTER DIALOGUE FOOTER (LEO AVATAR - Matches Vibrant Palette layout) */}
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-4 bg-black/20 p-3.5 rounded-2xl" id="character-dialogue-footer">
        <div className="flex-shrink-0">
          <div className="w-14 h-14 rounded-full bg-slate-700 border-2 border-emerald-400 overflow-hidden shadow-lg relative">
            {/* Leo Avatar representation with custom cute CSS drawing */}
            <div className="w-full h-full bg-gradient-to-b from-indigo-800 to-slate-900 relative">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-amber-200 rounded-full"></div>
              {/* cute hair */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-7 h-3 bg-stone-900 rounded-full"></div>
              {/* scarf */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-6 bg-rose-500 rounded-t-full"></div>
            </div>
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-emerald-400 font-black uppercase text-[10px] tracking-wider font-mono">LEO</span>
            <div className="h-[1px] flex-1 bg-white/10"></div>
          </div>
          <p className="text-xs md:text-sm font-medium text-slate-200 leading-relaxed italic">
            "{getLeoThoughts()}"
          </p>
        </div>
      </div>

      {/* Narrative Adventure Log / History */}
      {history.length > 0 && stage !== GameStage.TITLE && (
        <div className="mt-3 pt-3 border-t border-white/5" id="game-history-collapsible">
          <details className="group">
            <summary className="list-none flex items-center gap-1.5 text-[10px] font-mono text-slate-500 cursor-pointer hover:text-slate-300 transition-colors select-none">
              <History className="w-3 h-3 text-emerald-400" />
              <span>Adventure Run History Logs</span>
              <span className="ml-auto transition-transform group-open:rotate-180">▾</span>
            </summary>
            
            <div className="mt-2 max-h-20 overflow-y-auto space-y-1 pl-2 text-[10px] font-mono text-slate-400 border-l border-white/5">
              {history.map((log, index) => (
                <div key={index} className="flex items-start gap-1">
                  <span className="text-emerald-500">[{index + 1}]</span>
                  <span className="text-slate-300">{log}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};
