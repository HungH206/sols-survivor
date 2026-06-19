import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import { GameStage } from "../types";

interface GameCanvasProps {
  stage: GameStage;
  currentPuzzleIndex: number;
  grassColorLevel: number;
  skyColorLevel: number;
  sunColorLevel: number;
  onQuestionPodReached: (podIndex: number) => void;
  onMirrorReached: () => void;
}

interface SceneState {
  stage: GameStage;
  currentPuzzleIndex: number;
  grassColorLevel: number;
  skyColorLevel: number;
  sunColorLevel: number;
}

type PodView = {
  base: Phaser.GameObjects.Ellipse;
  rim: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  glow: Phaser.GameObjects.Ellipse;
};

const POD_POSITIONS = [
  { x: 0.5, y: 0.36 },
  { x: 0.5, y: 0.36 },
  { x: 0.5, y: 0.36 },
];

class SolsSurvivorScene extends Phaser.Scene {
  private state: SceneState;
  private onQuestionPodReached: (podIndex: number) => void;
  private onMirrorReached: () => void;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private leo!: Phaser.GameObjects.Container;
  private crystal!: Phaser.GameObjects.Container;
  private mirror!: Phaser.GameObjects.Container;
  private pods: PodView[] = [];
  private sparkGroup: Phaser.GameObjects.Arc[] = [];
  private reachedPod: number | null = null;
  private worldLayer!: Phaser.GameObjects.Graphics;
  private restoredCount = 0;
  private reachedMirror = false;
  private celebrationStarted = false;

  constructor(
    state: SceneState,
    onQuestionPodReached: (podIndex: number) => void,
    onMirrorReached: () => void
  ) {
    super("SolsSurvivorScene");
    this.state = state;
    this.onQuestionPodReached = onQuestionPodReached;
    this.onMirrorReached = onMirrorReached;
  }

  create() {
    this.worldLayer = this.add.graphics();
    this.createMirror();
    this.createCrystal();
    this.createPods();
    this.createLeo();

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;

    this.scale.on("resize", this.handleResize, this);
    this.handleResize();
  }

  update(_time: number, delta: number) {
    this.drawWorld();
    this.updateCrystal();
    this.updatePods();
    this.updateMirror();
    this.updateLeo(delta);
    this.updatePodProximity();
    this.updateMirrorProximity();
  }

  setState(nextState: SceneState) {
    const previousRestoredCount = this.restoredCount;
    const previousStage = this.state.stage;
    const previousPuzzleIndex = this.state.currentPuzzleIndex;
    this.state = nextState;
    this.restoredCount =
      nextState.grassColorLevel + nextState.skyColorLevel + nextState.sunColorLevel;

    if (this.restoredCount > previousRestoredCount) {
      this.burstSparkIntoCrystal();
    }

    if (
      nextState.stage === GameStage.EXPLORE ||
      nextState.stage === GameStage.INTRO ||
      nextState.stage === GameStage.RESULT_1 ||
      nextState.stage === GameStage.RESULT_2 ||
      nextState.stage === GameStage.RESULT_3 ||
      nextState.stage === GameStage.CLAIM_FINAL_LIGHT
    ) {
      this.reachedPod = null;
    }

    if (nextState.stage === GameStage.EXPLORE && nextState.currentPuzzleIndex !== previousPuzzleIndex) {
      this.resetLeoToRoadStart();
    }

    if (nextState.stage === GameStage.CLAIM_FINAL_LIGHT) {
      this.reachedMirror = false;
      this.celebrationStarted = false;
      this.resetLeoToRoadStart();
    }

    if (nextState.stage === GameStage.ENDING && previousStage !== GameStage.ENDING) {
      this.startCelebration();
    }
  }

  private handleResize() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.crystal.setPosition(width * 0.62, height * 0.38);
    this.mirror.setPosition(width * 0.5, height * 0.34);
    this.pods.forEach((pod, index) => {
      const pos = POD_POSITIONS[index];
      const x = width * pos.x;
      const y = height * pos.y;
      pod.base.setPosition(x, y);
      pod.rim.setPosition(x, y);
      pod.glow.setPosition(x, y);
      pod.label.setPosition(x, y - 2);
    });

    if (!this.leo.getData("initialized")) {
      this.resetLeoToRoadStart();
      this.leo.setData("initialized", true);
    } else {
      this.keepLeoInBounds();
    }
  }

  private drawWorld() {
    const width = this.scale.width;
    const height = this.scale.height;
    const { grassColorLevel, skyColorLevel, sunColorLevel } = this.state;
    const g = this.worldLayer;

    g.clear();
    g.fillGradientStyle(
      Phaser.Display.Color.GetColor(25 + skyColorLevel * 70, 31 + skyColorLevel * 105, 43 + skyColorLevel * 145),
      Phaser.Display.Color.GetColor(25 + skyColorLevel * 70, 31 + skyColorLevel * 105, 43 + skyColorLevel * 145),
      Phaser.Display.Color.GetColor(67 + skyColorLevel * 80, 70 + skyColorLevel * 118, 78 + skyColorLevel * 140),
      Phaser.Display.Color.GetColor(67 + skyColorLevel * 80, 70 + skyColorLevel * 118, 78 + skyColorLevel * 140),
      1
    );
    g.fillRect(0, 0, width, height);

    const sunX = width * 0.76;
    const sunY = height * 0.18;
    g.fillStyle(0xfbbf24, 0.12 + sunColorLevel * 0.58);
    g.fillCircle(sunX, sunY, 70 + sunColorLevel * 25);
    g.fillStyle(0xfff0a6, 0.55 + sunColorLevel * 0.35);
    g.fillCircle(sunX, sunY, 32);

    g.fillStyle(0x17243a, 0.72);
    g.beginPath();
    g.moveTo(0, height * 0.62);
    g.lineTo(width * 0.18, height * 0.35);
    g.lineTo(width * 0.42, height * 0.62);
    g.lineTo(width * 0.62, height * 0.39);
    g.lineTo(width, height * 0.62);
    g.lineTo(width, height);
    g.lineTo(0, height);
    g.closePath();
    g.fillPath();

    g.fillStyle(Phaser.Display.Color.GetColor(36, 74 + grassColorLevel * 116, 48 + grassColorLevel * 36), 1);
    g.fillRect(0, height * 0.62, width, height * 0.38);

    const roadTopY = height * 0.25;
    const roadBottomY = height;
    const roadTopHalf = width * 0.07;
    const roadBottomHalf = width * 0.32;

    g.fillStyle(0x050608, 0.98);
    g.beginPath();
    g.moveTo(width * 0.5 - roadTopHalf, roadTopY);
    g.lineTo(width * 0.5 + roadTopHalf, roadTopY);
    g.lineTo(width * 0.5 + roadBottomHalf, roadBottomY);
    g.lineTo(width * 0.5 - roadBottomHalf, roadBottomY);
    g.closePath();
    g.fillPath();

    g.lineStyle(4, 0xf8fafc, 0.8);
    g.beginPath();
    g.moveTo(width * 0.5 - roadTopHalf, roadTopY);
    g.lineTo(width * 0.5 - roadBottomHalf, roadBottomY);
    g.moveTo(width * 0.5 + roadTopHalf, roadTopY);
    g.lineTo(width * 0.5 + roadBottomHalf, roadBottomY);
    g.strokePath();

    const roadMotion = (this.time.now * 0.00028) % 1;
    for (let index = 0; index < 9; index++) {
      const progress = ((index / 8 + roadMotion) % 1);
      const y = Phaser.Math.Linear(roadTopY, roadBottomY, progress);
      const stripeWidth = Phaser.Math.Linear(width * 0.012, width * 0.035, progress);
      const stripeHeight = Phaser.Math.Linear(height * 0.045, height * 0.12, progress);
      const alpha = Phaser.Math.Linear(0.4, 0.95, progress);

      g.fillStyle(0xf8fafc, alpha);
      g.fillRect(width * 0.5 - stripeWidth / 2, y - stripeHeight / 2, stripeWidth, stripeHeight);
    }
  }

  private createLeo() {
    this.leo = this.add.container(0, 0);
    this.leo.setDepth(20);

    const shadow = this.add.ellipse(0, 47, 35, 10, 0x000000, 0.25);
    const body = this.add.ellipse(0, 10, 19, 42, 0x0891b2, 1);
    const scarf = this.add.triangle(-12, -4, 0, 0, -33, -10, -4, 10, 0xe11d48, 1);
    const head = this.add.circle(0, -20, 12, 0xf2c99b, 1);
    const hair = this.add.ellipse(-2, -29, 24, 13, 0x17110d, 1);
    const armLeft = this.add.rectangle(-14, 12, 6, 32, 0xf2c99b, 1).setRotation(0.6);
    const armRight = this.add.rectangle(13, 11, 6, 32, 0xf2c99b, 1).setRotation(-0.6);
    const legLeft = this.add.rectangle(-8, 40, 7, 32, 0xe11d48, 1).setRotation(0.2);
    const legRight = this.add.rectangle(10, 40, 7, 32, 0x0f172a, 1).setRotation(-0.2);

    this.leo.add([shadow, legLeft, legRight, body, scarf, armLeft, armRight, head, hair]);
  }

  private createMirror() {
    this.mirror = this.add.container(0, 0).setDepth(13).setVisible(false);

    const glow = this.add.ellipse(0, 0, 130, 170, 0xfbbf24, 0.16);
    const frame = this.add.rectangle(0, 12, 70, 112, 0x78350f, 1);
    frame.setStrokeStyle(5, 0xfacc15, 1);
    const crown = this.add.ellipse(0, -43, 70, 52, 0x78350f, 1);
    crown.setStrokeStyle(5, 0xfacc15, 1);
    const surface = this.add.rectangle(0, 14, 50, 88, 0x7dd3fc, 0.72);
    const shine = this.add.rectangle(-10, -5, 8, 70, 0xffffff, 0.34).setRotation(0.28);
    const claim = this.add
      .text(0, 79, "1%", {
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "18px",
        fontStyle: "900",
        color: "#fef3c7",
      })
      .setOrigin(0.5);

    this.mirror.add([glow, crown, frame, surface, shine, claim]);
  }

  private createCrystal() {
    this.crystal = this.add.container(0, 0).setDepth(12);
    const aura = this.add.ellipse(0, 0, 110, 110, 0x7dd3fc, 0.16).setName("aura");
    const top = this.add.triangle(0, -18, 0, -42, -24, 0, 24, 0, 0x67e8f9, 1);
    const bottom = this.add.triangle(0, 23, -24, 0, 24, 0, 0, 48, 0x22d3ee, 1);
    const facet = this.add.triangle(0, 0, 0, -42, 0, 48, 24, 0, 0xfef3c7, 0.45);
    const glint = this.add.star(-7, -13, 4, 3, 9, 0xffffff, 0.85);
    this.crystal.add([aura, top, bottom, facet, glint]);

    this.tweens.add({
      targets: this.crystal,
      y: "+=12",
      duration: 1300,
      ease: "Sine.inOut",
      yoyo: true,
      repeat: -1,
    });
  }

  private createPods() {
    this.pods = POD_POSITIONS.map(() => {
      const glow = this.add.ellipse(0, 0, 102, 62, 0x34d399, 0.08).setDepth(8);
      const base = this.add.ellipse(0, 0, 78, 50, 0x111827, 0.92).setDepth(9);
      const rim = this.add.ellipse(0, 0, 82, 54).setDepth(10);
      rim.setStrokeStyle(3, 0x94a3b8, 0.8);
      const label = this.add
        .text(0, -2, "???", {
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "20px",
          fontStyle: "900",
          color: "#e2e8f0",
        })
        .setOrigin(0.5)
        .setDepth(11);
      return { base, rim, label, glow };
    });
  }

  private updateCrystal() {
    const power = Math.max(0.15, this.restoredCount / 3);
    const aura = this.crystal.getByName("aura") as Phaser.GameObjects.Ellipse;
    aura.setScale(0.9 + power * 0.6 + Math.sin(this.time.now * 0.004) * 0.06);
    aura.setAlpha(0.12 + power * 0.42);
    this.crystal.setScale(0.95 + power * 0.2);
  }

  private updateMirror() {
    const visible =
      this.state.stage === GameStage.CLAIM_FINAL_LIGHT || this.state.stage === GameStage.ENDING;

    this.mirror.setVisible(visible);
    if (!visible) return;

    const pulse = 1 + Math.sin(this.time.now * 0.005) * 0.035;
    this.mirror.setScale(pulse);
    this.mirror.setAlpha(this.state.stage === GameStage.ENDING ? 0.78 : 1);
  }

  private updatePods() {
    const revealPods = this.state.stage === GameStage.EXPLORE;

    this.pods.forEach((pod, index) => {
      const active = revealPods && index === this.state.currentPuzzleIndex;
      const visible = active;

      pod.base.setFillStyle(active ? 0x172554 : 0x111827, 0.9);
      pod.rim.setStrokeStyle(3, active ? 0x67e8f9 : 0x64748b, active ? 1 : 0.72);
      pod.glow.setFillStyle(active ? 0x22d3ee : 0x64748b, active ? 0.18 : 0.06);
      pod.glow.setScale(active ? 1 + Math.sin(this.time.now * 0.006) * 0.08 : 1);
      pod.label.setText(`?${index + 1}?`);
      pod.label.setColor(active ? "#cffafe" : "#cbd5e1");
      pod.base.setVisible(visible);
      pod.rim.setVisible(visible);
      pod.glow.setVisible(visible);
      pod.label.setVisible(visible);
    });
  }

  private updateLeo(delta: number) {
    if (this.state.stage === GameStage.ENDING) return;

    const canMove =
      this.state.stage === GameStage.EXPLORE ||
      this.state.stage === GameStage.INTRO ||
      this.state.stage === GameStage.CLAIM_FINAL_LIGHT;
    let moveX = 0;
    let moveY = 0;

    if (canMove) {
      moveX = Number(Boolean(this.cursors?.right?.isDown || this.wasd?.D?.isDown)) -
        Number(Boolean(this.cursors?.left?.isDown || this.wasd?.A?.isDown));
      moveY = Number(Boolean(this.cursors?.down?.isDown || this.wasd?.S?.isDown)) -
        Number(Boolean(this.cursors?.up?.isDown || this.wasd?.W?.isDown));
    }

    const length = Math.hypot(moveX, moveY) || 1;
    const speed = 245;
    this.leo.x += (moveX / length) * speed * (delta / 1000);
    this.leo.y += (moveY / length) * speed * (delta / 1000);
    this.keepLeoInBounds();

    const moving = moveX !== 0 || moveY !== 0;
    this.leo.y += moving ? Math.sin(this.time.now * 0.025) * 0.45 : 0;
    this.leo.setScale(moveX < 0 ? -1 : 1, 1);
  }

  private keepLeoInBounds() {
    const height = this.scale.height;
    const y = Phaser.Math.Clamp(this.leo.y, height * 0.32, height - 58);
    const lane = this.getRoadEdgesAtY(y);
    this.leo.x = Phaser.Math.Clamp(this.leo.x, lane.left + 28, lane.right - 28);
    this.leo.y = y;
  }

  private updatePodProximity() {
    if (this.state.stage !== GameStage.EXPLORE) return;

    const activeIndex = this.state.currentPuzzleIndex;
    const activePod = this.pods[activeIndex];
    if (!activePod || this.reachedPod === activeIndex) return;

    const distance = Phaser.Math.Distance.Between(
      this.leo.x,
      this.leo.y,
      activePod.base.x,
      activePod.base.y
    );

    if (distance < 82) {
      this.reachedPod = activeIndex;
      this.onQuestionPodReached(activeIndex);
    }
  }

  private updateMirrorProximity() {
    if (this.state.stage !== GameStage.CLAIM_FINAL_LIGHT || this.reachedMirror) return;

    const distance = Phaser.Math.Distance.Between(this.leo.x, this.leo.y, this.mirror.x, this.mirror.y + 55);

    if (distance < 82) {
      this.reachedMirror = true;
      this.onMirrorReached();
    }
  }

  private getRoadEdgesAtY(y: number) {
    const width = this.scale.width;
    const height = this.scale.height;
    const roadTopY = height * 0.25;
    const progress = Phaser.Math.Clamp((y - roadTopY) / (height - roadTopY), 0, 1);
    const halfWidth = Phaser.Math.Linear(width * 0.07, width * 0.32, progress);

    return {
      left: width * 0.5 - halfWidth,
      right: width * 0.5 + halfWidth,
    };
  }

  private resetLeoToRoadStart() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.leo.setPosition(width * 0.5, height * 0.78);
  }

  private startCelebration() {
    if (this.celebrationStarted) return;
    this.celebrationStarted = true;

    this.tweens.killTweensOf(this.leo);
    this.leo.setScale(1, 1);

    this.tweens.add({
      targets: this.leo,
      x: this.scale.width * 0.5,
      y: this.scale.height * 0.72,
      duration: 450,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.leo.setScale(-1, 1);
        this.tweens.add({
          targets: this.leo,
          y: "-=20",
          duration: 210,
          yoyo: true,
          repeat: 5,
          ease: "Sine.easeInOut",
        });
      },
    });

    for (let index = 0; index < 28; index++) {
      const spark = this.add.circle(this.scale.width * 0.5, this.scale.height * 0.56, 3, 0xfef08a, 1);
      spark.setDepth(31);
      this.tweens.add({
        targets: spark,
        x: spark.x + Phaser.Math.Between(-150, 150),
        y: spark.y + Phaser.Math.Between(-125, 40),
        alpha: 0,
        scale: 0.2,
        duration: 850 + Phaser.Math.Between(0, 380),
        ease: "Cubic.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
  }

  private burstSparkIntoCrystal() {
    const startX = this.leo.x;
    const startY = this.leo.y - 28;

    for (let index = 0; index < 16; index++) {
      const spark = this.add.circle(startX, startY, Phaser.Math.Between(2, 5), 0xfef08a, 0.95);
      spark.setDepth(30);
      this.sparkGroup.push(spark);

      this.tweens.add({
        targets: spark,
        x: this.crystal.x + Phaser.Math.Between(-18, 18),
        y: this.crystal.y + Phaser.Math.Between(-18, 18),
        alpha: 0,
        scale: 0.25,
        duration: 650 + index * 24,
        ease: "Cubic.easeIn",
        onComplete: () => {
          spark.destroy();
          this.sparkGroup = this.sparkGroup.filter((item) => item !== spark);
        },
      });
    }
  }
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  stage,
  currentPuzzleIndex,
  grassColorLevel,
  skyColorLevel,
  sunColorLevel,
  onQuestionPodReached,
  onMirrorReached,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<SolsSurvivorScene | null>(null);
  const callbackRef = useRef(onQuestionPodReached);
  const mirrorCallbackRef = useRef(onMirrorReached);

  callbackRef.current = onQuestionPodReached;
  mirrorCallbackRef.current = onMirrorReached;

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const initialState = {
      stage,
      currentPuzzleIndex,
      grassColorLevel,
      skyColorLevel,
      sunColorLevel,
    };

    const scene = new SolsSurvivorScene(
      initialState,
      (podIndex) => {
        callbackRef.current(podIndex);
      },
      () => {
        mirrorCallbackRef.current();
      }
    );

    sceneRef.current = scene;
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: "#0f172a",
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      },
      scene,
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setState({
      stage,
      currentPuzzleIndex,
      grassColorLevel,
      skyColorLevel,
      sunColorLevel,
    });
  }, [stage, currentPuzzleIndex, grassColorLevel, skyColorLevel, sunColorLevel]);

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
