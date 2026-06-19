import Phaser from "phaser";
import { BootScene } from "./BootScene";
import { EndingScene } from "./EndingScene";
import { RunScene } from "./RunScene";
import type { GameCallbacks, SceneState } from "./types";

interface CreatePhaserGameOptions {
  parent: HTMLElement;
  initialState: SceneState;
  callbacks: GameCallbacks;
}

export const createPhaserGame = ({
  parent,
  initialState,
  callbacks,
}: CreatePhaserGameOptions) => {
  const runScene = new RunScene(initialState, callbacks);

  return {
    game: new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      backgroundColor: "#0f172a",
      audio: {
        noAudio: true,
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: parent.clientWidth,
        height: parent.clientHeight,
      },
      physics: {
        default: "arcade",
        arcade: {
          debug: false,
        },
      },
      scene: [BootScene, runScene, EndingScene],
    }),
    runScene,
  };
};
