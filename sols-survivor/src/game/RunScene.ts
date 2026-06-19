import Phaser from "phaser";
import { GameStage } from "../types";
import type { AnswerFeedback, GameCallbacks, PodView, SceneState } from "./types";

const DEFAULT_STATE: SceneState = {
  stage: GameStage.TITLE,
  currentPuzzleIndex: 0,
  grassColorLevel: 0,
  skyColorLevel: 0,
  sunColorLevel: 0,
};

const DEFAULT_CALLBACKS: GameCallbacks = {
  onQuestionPodReached: () => undefined,
  onMirrorReached: () => undefined,
};

export class RunScene extends Phaser.Scene {
  private state: SceneState;
  private callbacks: GameCallbacks;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private leo!: Phaser.GameObjects.Container;
  private leoZone!: Phaser.GameObjects.Zone;
  private crystal!: Phaser.GameObjects.Container;
  private mirror!: Phaser.GameObjects.Container;
  private mirrorZone!: Phaser.GameObjects.Zone;
  private pods: PodView[] = [];
  private podZones: Phaser.GameObjects.Zone[] = [];
  private sparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private celebrationEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private reachedPod: number | null = null;
  private worldLayer!: Phaser.GameObjects.Graphics;
  private restoredCount = 0;
  private reachedMirror = false;
  private celebrationStarted = false;
  private objectiveProgress = 0;
  private mirrorProgress = 0;
  private entranceTween: Phaser.Tweens.Tween | null = null;
  private isSceneReady = false;

  constructor(state: SceneState = DEFAULT_STATE, callbacks: GameCallbacks = DEFAULT_CALLBACKS) {
    super("RunScene");
    this.state = state;
    this.callbacks = callbacks;
  }

  create() {
    this.createParticleTexture();
    this.worldLayer = this.add.graphics();
    this.createMirror();
    this.createCrystal();
    this.createPods();
    this.createLeo();
    this.createPhysicsZones();
    this.createParticleEmitters();

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;

    this.scale.on("resize", this.handleResize, this);
    this.isSceneReady = true;
    this.syncCallbackListeners();
    this.handleResize();
  }

  update(_time: number, delta: number) {
    this.updateRunnerProgress(delta);
    this.drawWorld();
    this.updateCrystal();
    this.updatePods();
    this.updateMirror();
    this.updateLeo(delta);
    this.updatePodProximity();
    this.updateMirrorProximity();
  }

  setCallbacks(callbacks: GameCallbacks) {
    this.callbacks = callbacks;
    this.syncCallbackListeners();
  }

  playAnswerFeedback(type: AnswerFeedback["type"]) {
    if (!this.isSceneReady) return;

    if (type === "wrong") {
      this.playWrongAnswerFeedback();
      return;
    }

    this.cameras.main.flash(180, 255, 245, 180);
    this.cameras.main.shake(120, 0.004);
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

    if (
      nextState.stage === GameStage.EXPLORE &&
      (nextState.currentPuzzleIndex !== previousPuzzleIndex || previousStage !== GameStage.EXPLORE)
    ) {
      this.resetRunnerSegment();
    }

    if (nextState.stage === GameStage.CLAIM_FINAL_LIGHT) {
      this.reachedMirror = false;
      this.celebrationStarted = false;
      this.resetRunnerSegment();
    }

    if (nextState.stage === GameStage.ENDING && previousStage !== GameStage.ENDING) {
      this.startCelebration();
    }
  }

  private handleResize() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.crystal.setPosition(width * 0.62, height * 0.38);
    this.positionMirror();
    this.pods.forEach((_pod, index) => this.positionPod(index));
    this.updatePhysicsZones();

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

    const roadMoving =
      this.state.stage === GameStage.EXPLORE ||
      this.state.stage === GameStage.CLAIM_FINAL_LIGHT ||
      this.state.stage === GameStage.ENDING;
    const roadMotion = roadMoving ? (this.time.now * 0.00042) % 1 : 0;
    for (let index = 0; index < 9; index++) {
      const progress = (index / 8 + roadMotion) % 1;
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
    this.pods = [0, 1, 2].map(() => {
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

  private createPhysicsZones() {
    this.leoZone = this.add.zone(this.leo.x, this.leo.y, 42, 72);
    this.mirrorZone = this.add.zone(this.mirror.x, this.mirror.y + 58, 88, 118);
    this.podZones = [0, 1, 2].map(() => this.add.zone(0, 0, 86, 60));

    this.physics.add.existing(this.leoZone);
    this.physics.add.existing(this.mirrorZone);
    this.podZones.forEach((zone, index) => {
      this.physics.add.existing(zone);
      this.physics.add.overlap(this.leoZone, zone, () => this.handlePodOverlap(index));
    });
    this.physics.add.overlap(this.leoZone, this.mirrorZone, () => this.handleMirrorOverlap());
  }

  private createParticleTexture() {
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0xfef08a, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture("solar-spark", 8, 8);
    graphics.destroy();
  }

  private createParticleEmitters() {
    this.sparkEmitter = this.add.particles(0, 0, "solar-spark", {
      lifespan: 700,
      speed: { min: 80, max: 180 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: "ADD",
      emitting: false,
    });
    this.sparkEmitter.setDepth(30);

    this.celebrationEmitter = this.add.particles(0, 0, "solar-spark", {
      lifespan: 950,
      speed: { min: 90, max: 260 },
      angle: { min: 210, max: 330 },
      gravityY: 120,
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: "ADD",
      emitting: false,
    });
    this.celebrationEmitter.setDepth(31);
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

    this.positionMirror();
    this.mirror.setVisible(visible);
    this.mirrorZone?.setVisible(visible);
    if (!visible) return;

    const pulse = 1 + Math.sin(this.time.now * 0.005) * 0.035;
    const approachScale = Phaser.Math.Linear(0.5, 1, this.mirrorProgress);
    this.mirror.setScale(approachScale * pulse);
    this.mirror.setAlpha(this.state.stage === GameStage.ENDING ? 0.78 : 1);
  }

  private updatePods() {
    const revealPods =
      this.state.stage === GameStage.EXPLORE ||
      this.state.stage === GameStage.PUZZLE_1 ||
      this.state.stage === GameStage.PUZZLE_2 ||
      this.state.stage === GameStage.PUZZLE_3;

    this.pods.forEach((pod, index) => {
      this.positionPod(index);
      const active = revealPods && index === this.state.currentPuzzleIndex;
      const visible = active;

      pod.base.setFillStyle(active ? 0x172554 : 0x111827, 0.9);
      pod.rim.setStrokeStyle(3, active ? 0x67e8f9 : 0x64748b, active ? 1 : 0.72);
      pod.glow.setFillStyle(active ? 0x22d3ee : 0x64748b, active ? 0.18 : 0.06);
      const pulse = 1 + Math.sin(this.time.now * 0.006) * 0.08;
      const approachScale = index === this.state.currentPuzzleIndex
        ? Phaser.Math.Linear(0.62, 1, this.objectiveProgress)
        : 1;
      pod.glow.setScale(active ? approachScale * pulse : approachScale);
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
    const speed = 255;
    this.leo.x += (moveX / length) * speed * (delta / 1000);
    this.leo.y += (moveY / length) * speed * (delta / 1000);
    this.keepLeoInBounds();

    const moving = moveX !== 0 || moveY !== 0;
    this.leo.y += moving ? Math.sin(this.time.now * 0.025) * 0.45 : 0;
    this.leo.setScale(moveX < 0 ? -1 : 1, 1);
    this.updatePhysicsZones();
  }

  private keepLeoInBounds() {
    const height = this.scale.height;
    const y = Phaser.Math.Clamp(this.leo.y, height * 0.48, height * 0.84);
    const lane = this.getRoadEdgesAtY(y);
    this.leo.x = Phaser.Math.Clamp(this.leo.x, lane.left + 28, lane.right - 28);
    this.leo.y = y;
  }

  private updatePodProximity() {
    this.updatePhysicsZones();
  }

  private updateMirrorProximity() {
    this.updatePhysicsZones();
  }

  private handlePodOverlap(index: number) {
    if (this.state.stage !== GameStage.EXPLORE) return;
    if (index !== this.state.currentPuzzleIndex || this.reachedPod === index) return;

    this.reachedPod = index;
    this.tweens.killTweensOf(this.pods[index].base);
    this.events.emit("question-pod-reached", index);
  }

  private handleMirrorOverlap() {
    if (this.state.stage !== GameStage.CLAIM_FINAL_LIGHT || this.reachedMirror) return;

    this.reachedMirror = true;
    this.events.emit("mirror-reached");
  }

  private updateRunnerProgress(delta: number) {
    if (this.state.stage === GameStage.EXPLORE && this.reachedPod === null) {
      this.objectiveProgress = Math.min(1, this.objectiveProgress + delta * 0.00012);
    }

    if (this.state.stage === GameStage.CLAIM_FINAL_LIGHT && !this.reachedMirror) {
      this.mirrorProgress = Math.min(1, this.mirrorProgress + delta * 0.0001);
    }
  }

  private resetRunnerSegment() {
    this.objectiveProgress = 0;
    this.mirrorProgress = 0;
    this.resetLeoToRoadStart();
    this.playObjectiveEntranceTween();
  }

  private positionPod(index: number) {
    const pod = this.pods[index];
    if (!pod) return;

    const progress = index === this.state.currentPuzzleIndex ? this.objectiveProgress : 0;
    const point = this.getRoadPoint(Phaser.Math.Linear(0.18, 0.58, progress));
    const scale = Phaser.Math.Linear(0.62, 1, progress);

    pod.base.setPosition(point.x, point.y);
    pod.rim.setPosition(point.x, point.y);
    pod.glow.setPosition(point.x, point.y);
    pod.label.setPosition(point.x, point.y - 2);
    pod.base.setScale(scale);
    pod.rim.setScale(scale);
    pod.glow.setScale(scale);
    pod.label.setScale(scale);
    this.podZones[index]?.setPosition(point.x, point.y);
  }

  private positionMirror() {
    if (!this.mirror) return;

    const point = this.getRoadPoint(Phaser.Math.Linear(0.14, 0.56, this.mirrorProgress));
    this.mirror.setPosition(point.x, point.y);
    this.mirrorZone?.setPosition(point.x, point.y + 58);
  }

  private getRoadPoint(progress: number) {
    const width = this.scale.width;
    const height = this.scale.height;
    const roadTopY = height * 0.25;
    const y = Phaser.Math.Linear(roadTopY, height, Phaser.Math.Clamp(progress, 0, 1));

    return {
      x: width * 0.5,
      y,
    };
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

    this.celebrationEmitter.explode(38, this.scale.width * 0.5, this.scale.height * 0.56);
  }

  private burstSparkIntoCrystal() {
    const startX = this.leo.x;
    const startY = this.leo.y - 28;

    this.sparkEmitter.setConfig({
      lifespan: 760,
      speed: { min: 40, max: 120 },
      moveToX: this.crystal.x,
      moveToY: this.crystal.y,
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: "ADD",
      emitting: false,
    });
    this.sparkEmitter.explode(22, startX, startY);
  }

  private updatePhysicsZones() {
    if (!this.leoZone) return;

    this.leoZone.setPosition(this.leo.x, this.leo.y + 8);
    this.podZones.forEach((zone, index) => {
      const pod = this.pods[index];
      zone.setPosition(pod.base.x, pod.base.y);
      zone.setSize(86 * pod.base.scaleX, 62 * pod.base.scaleY);
    });
    this.mirrorZone?.setPosition(this.mirror.x, this.mirror.y + 58);
  }

  private playWrongAnswerFeedback() {
    const pod = this.pods[this.state.currentPuzzleIndex];
    if (pod) {
      this.tweens.add({
        targets: [pod.base, pod.rim, pod.label, pod.glow],
        x: `+=${Phaser.Math.Between(-8, 8)}`,
        duration: 55,
        yoyo: true,
        repeat: 5,
        ease: "Sine.easeInOut",
      });
    }

    this.cameras.main.shake(130, 0.006);
    this.tweens.add({
      targets: this.crystal,
      alpha: 0.35,
      duration: 90,
      yoyo: true,
      repeat: 1,
    });
  }

  private playObjectiveEntranceTween() {
    this.entranceTween?.stop();

    const targets = this.state.stage === GameStage.CLAIM_FINAL_LIGHT
      ? [this.mirror]
      : this.pods[this.state.currentPuzzleIndex]
        ? [
            this.pods[this.state.currentPuzzleIndex].base,
            this.pods[this.state.currentPuzzleIndex].rim,
            this.pods[this.state.currentPuzzleIndex].label,
            this.pods[this.state.currentPuzzleIndex].glow,
          ]
        : [];

    if (targets.length === 0) return;

    targets.forEach((target) => target.setAlpha(0));
    this.entranceTween = this.tweens.add({
      targets,
      alpha: 1,
      duration: 380,
      ease: "Sine.easeOut",
    });
  }

  private syncCallbackListeners() {
    if (!this.isSceneReady || !this.events) return;

    this.events.off("question-pod-reached");
    this.events.off("mirror-reached");
    this.events.on("question-pod-reached", this.callbacks.onQuestionPodReached);
    this.events.on("mirror-reached", this.callbacks.onMirrorReached);
  }
}
