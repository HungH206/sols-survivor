import Phaser from "phaser";

export class EndingScene extends Phaser.Scene {
  constructor() {
    super("EndingScene");
  }

  create() {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, "SOLS-Survivor complete.", {
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "24px",
        color: "#fef3c7",
      })
      .setOrigin(0.5);
  }
}
