import React, { useEffect, useRef, useState } from "react";
import { GameStage } from "../types";

interface GameCanvasProps {
  stage: GameStage;
  grassColorLevel: number; // 0 to 1
  skyColorLevel: number; // 0 to 1
  sunColorLevel: number; // 0 to 1
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  decay: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  stage,
  grassColorLevel,
  skyColorLevel,
  sunColorLevel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const animationFrameRef = useRef<number | null>(null);

  // Time-based animation tick tracker
  const tickRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  // Track the resize of container
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Keep a minimum size to prevent crash
        setDimensions({
          width: Math.max(width, 320),
          height: Math.max(height, 300),
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Set physical canvas pixels to prevent blurriness
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
  }, [dimensions]);

  // Main game animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      tickRef.current += 1;
      const t = tickRef.current;
      const w = dimensions.width;
      const h = dimensions.height;

      // Clear Canvas
      ctx.clearRect(0, 0, w, h);

      // 1. SKY GRADIENT
      // Starts as dark gray twilight, brightens dynamically with skyColorLevel and sunColorLevel
      // Interpolate colors based on level
      const hueStart = 200 + skyColorLevel * 20; // 200 (slate) to 220 (azure)
      const satStart = skyColorLevel * 80;       // 0% (gray) to 80% (rich blue)
      const lightStart = 15 + skyColorLevel * 25 + sunColorLevel * 20; // 15% (dark night) to 60% (bright sky)

      ctx.fillStyle = `hsl(${hueStart}, ${satStart}%, ${lightStart}%)`;
      ctx.fillRect(0, 0, w, h);

      // Sky glow from dawn sun
      if (skyColorLevel > 0 || sunColorLevel > 0) {
        const sunGlow = ctx.createRadialGradient(w * 0.5, h * 0.35, 10, w * 0.5, h * 0.35, w * 0.6);
        const sunSat = Math.floor(sunColorLevel * 100);
        sunGlow.addColorStop(0, `hsla(45, ${sunSat}%, 70%, ${0.1 + sunColorLevel * 0.5})`);
        sunGlow.addColorStop(0.5, `hsla(20, ${sunSat}%, 50%, ${sunColorLevel * 0.2})`);
        sunGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = sunGlow;
        ctx.fillRect(0, 0, w, h);
      }

      // Add stars that fade as the sky brightens
      ctx.fillStyle = "rgba(255, 255, 255, " + (0.5 * (1 - skyColorLevel)) + ")";
      for (let i = 0; i < 25; i++) {
        const starX = (Math.sin(i * 99) * 0.5 + 0.5) * w;
        const starY = (Math.cos(i * 33) * 0.5 + 0.5) * (h * 0.5);
        const starSize = (Math.sin(t * 0.05 + i) * 0.5 + 0.5) * 1.5 + 0.5;
        ctx.fillRect(starX, starY, starSize, starSize);
      }

      // 2. CELESTIAL SUN ORBIT LINES (Tropic of Cancer / Solstice Visualizations)
      if (sunColorLevel > 0) {
        ctx.strokeStyle = `hsla(40, 90%, 65%, ${sunColorLevel * 0.35})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 12]);
        
        // Tropic line representation
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.5, h * 0.32, Math.PI, 2 * Math.PI);
        ctx.stroke();

        ctx.setLineDash([]);
        // Orbit sparkles
        const sunX = w * 0.5;
        const sunY = h * 0.32 + Math.sin(t * 0.008) * 12;
        
        // Solar Core
        const solarCoreGrad = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 32);
        solarCoreGrad.addColorStop(0, `hsla(50, 100%, 95%, ${sunColorLevel})`);
        solarCoreGrad.addColorStop(0.2, `hsla(45, 100%, 75%, ${sunColorLevel * 0.9})`);
        solarCoreGrad.addColorStop(0.8, `hsla(15, 100%, 55%, ${sunColorLevel * 0.3})`);
        solarCoreGrad.addColorStop(1, `rgba(0,0,0,0)`);
        
        ctx.fillStyle = solarCoreGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
        ctx.fill();

        // Rays
        ctx.strokeStyle = `hsla(45, 100%, 70%, ${sunColorLevel * 0.3})`;
        ctx.lineWidth = 2;
        for (let r = 0; r < 8; r++) {
          const angle = (r * Math.PI) / 4 + t * 0.003;
          const sx = sunX + Math.cos(angle) * 20;
          const sy = sunY + Math.sin(angle) * 20;
          const ex = sunX + Math.cos(angle) * (38 + Math.sin(t * 0.05 + r) * 6);
          const ey = sunY + Math.sin(angle) * (38 + Math.sin(t * 0.05 + r) * 6);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }
      }

      // 3. MOUNTAINS / MIDGROUND HILLS
      const hills = [
        { heightMult: 0.35, colorBase: 12, speed: 0.1, sat: 18, wave: 0 },
        { heightMult: 0.22, colorBase: 25, speed: 0.2, sat: 22, wave: 1 },
      ];

      hills.forEach((hill, hIdx) => {
        // Draw layers
        const hillGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
        const hillSat = hIdx === 0 
          ? grassColorLevel * 25 + skyColorLevel * 10
          : grassColorLevel * 50 + skyColorLevel * 15;
        const colorH = hIdx === 0 ? 140 : 120; // transitions to green
        const l1 = Math.max(12, 10 + grassColorLevel * 12 + skyColorLevel * 8);
        const l2 = Math.max(6, 4 + grassColorLevel * 14 + skyColorLevel * 5);

        hillGrad.addColorStop(0, `hsl(${colorH}, ${hillSat}%, ${l1}%)`);
        hillGrad.addColorStop(1, `hsl(${colorH - 10}, ${hillSat}%, ${l2}%)`);

        ctx.fillStyle = hillGrad;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 15) {
          const sineCalc = Math.sin(x * 0.005 + t * 0.001 - hIdx * 9) * 20;
          const y = h * (0.65 - hill.heightMult) + sineCalc;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      });

      // 4. THE PATH
      const pathGrad = ctx.createLinearGradient(w * 0.5, h * 0.55, w * 0.5, h);
      const pathSat = Math.max(grassColorLevel * 25, 5);
      pathGrad.addColorStop(0, `hsl(30, ${pathSat}%, 15%)`);
      pathGrad.addColorStop(1, `hsl(35, ${pathSat}%, 24%)`);
      ctx.fillStyle = pathGrad;

      ctx.beginPath();
      ctx.moveTo(w * 0.45, h * 0.55);
      ctx.lineTo(w * 0.55, h * 0.55);
      ctx.lineTo(w * 0.72, h);
      ctx.lineTo(w * 0.28, h);
      ctx.closePath();
      ctx.fill();

      // Path border lines
      ctx.strokeStyle = `hsl(40, ${pathSat}%, 30%)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.45, h * 0.55);
      ctx.lineTo(w * 0.28, h);
      ctx.moveTo(w * 0.55, h * 0.55);
      ctx.lineTo(w * 0.72, h);
      ctx.stroke();

      // 5. FOREGROUND GRASS & SHRUBBERY
      // Blades of grass waving in wind
      const numBlades = 45;
      const grassGreenLevel = Math.floor(grassColorLevel * 100);
      ctx.strokeStyle = `hsl(110, ${grassGreenLevel}%, ${16 + grassColorLevel * 18}%)`;
      ctx.lineWidth = 2;

      for (let g = 0; g < numBlades; g++) {
        // Distribute grass randomly along footer and sides
        const gx = (Math.sin(g * 111) * 0.47 + 0.5) * w;
        // Avoid directly on the center path
        if (g % 4 === 0 && gx > w * 0.4 && gx < w * 0.6) continue;
        
        const gy = h - (Math.cos(g * 77) * 0.5 + 0.5) * (h * 0.12);
        const gHeight = 15 + (Math.sin(g * 5) * 0.5 + 0.5) * 20;
        const windSway = Math.sin(t * 0.04 + g) * (4 + grassColorLevel * 6);

        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.quadraticCurveTo(gx - windSway * 0.3, gy - gHeight * 0.5, gx - windSway, gy - gHeight);
        ctx.stroke();
      }

      // 6. LEO (The Runner Character)
      // Leo is placed on the path. In INTRO, he is running towards the center.
      // In PUZZLE screens, he stands near the crystal.
      // In ending, he stands facing a mirror.
      const isRunning = stage === GameStage.TITLE || stage === GameStage.INTRO;
      
      // Leo Position coordinates
      let characterX = w * 0.5;
      let characterY = h * 0.72;
      let scale = 0.85;

      if (isRunning) {
        // Runs in place, bobbing up and down
        characterX = w * 0.35 + Math.sin(t * 0.005) * 15;
        characterY = h * 0.75 + Math.abs(Math.sin(t * 0.12)) * -6;
        scale = 0.88;
      } else if (stage === GameStage.ENDING) {
        // Standing on the right side looking toward mirror (left)
        characterX = w * 0.6;
        characterY = h * 0.76;
        scale = 0.9;
      } else {
        // Standing near the crystal on the left
        characterX = w * 0.38;
        characterY = h * 0.75;
        scale = 0.88;
      }

      // Draw stylized Leo
      ctx.save();
      ctx.translate(characterX, characterY);
      ctx.scale(scale, scale);

      // Saturated character shading - starts black silhouette, becomes warmer skin/clothes as sun/sky values rise
      const characterSat = Math.max(sunColorLevel * 80, skyColorLevel * 40);
      const skinColor = `hsl(25, ${characterSat}%, ${22 + sunColorLevel * 45}%)`;
      const clothesColor1 = `hsl(190, ${characterSat}%, ${12 + skyColorLevel * 40}%)`; // Shirt
      const clothesColor2 = `hsl(340, ${characterSat}%, ${15 + sunColorLevel * 35}%)`; // Shorts/Scarf

      // Body Parts Drawing
      // Running bob details
      const limbAngle = isRunning ? Math.sin(t * 0.15) * 0.6 : 0;

      // Leg 2 (Back leg)
      ctx.strokeStyle = isRunning ? "rgba(0, 0, 0, 0.7)" : "#1c1917";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-1, 22);
      if (isRunning) {
        ctx.lineTo(-6 + limbAngle * 10, 32);
        ctx.lineTo(-4 + limbAngle * 14, 44);
      } else {
        ctx.lineTo(-5, 34);
        ctx.lineTo(-4, 45); // Standing straight
      }
      ctx.stroke();

      // Torso / Jacket
      ctx.fillStyle = clothesColor1;
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 5, 8, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Scarf flow (waving wind detail)
      ctx.fillStyle = clothesColor2;
      ctx.beginPath();
      ctx.moveTo(-4, -6);
      const scarfWave1 = Math.sin(t * 0.15) * 5 - 12;
      const scarfWave2 = Math.cos(t * 0.1) * 3 - 6;
      ctx.quadraticCurveTo(-15, -12 + scarfWave2, -22 + scarfWave1, -10 + scarfWave2);
      ctx.lineTo(-18, 0);
      ctx.quadraticCurveTo(-10, -3, -1, -3);
      ctx.closePath();
      ctx.fill();

      // Leg 1 (Front leg)
      ctx.strokeStyle = isRunning ? clothesColor2 : "#1d1916";
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(3, 22);
      if (isRunning) {
        ctx.lineTo(8 - limbAngle * 10, 31);
        ctx.lineTo(12 - limbAngle * 14, 43);
      } else {
        ctx.lineTo(4, 34);
        ctx.lineTo(5, 45);
      }
      ctx.stroke();

      // Arms
      ctx.strokeStyle = skinColor;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(2, -2);
      if (isRunning) {
        ctx.lineTo(10 + limbAngle * 6, 8);
        ctx.lineTo(6 - limbAngle * 6, 16);
      } else {
        // Holding hand up slightly towards crystal
        if (stage !== GameStage.ENDING) {
          ctx.lineTo(12, -4);
          ctx.lineTo(20, -12);
        } else {
          // Standing looking at the mirror
          ctx.lineTo(-6, 8);
          ctx.lineTo(-2, 18);
        }
      }
      ctx.stroke();

      // Head
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.arc(0, -17, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Hair
      ctx.fillStyle = "#110f0e";
      ctx.beginPath();
      ctx.arc(-2, -20, 5, 0, Math.PI * 2);
      ctx.arc(1, -21, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 7. THE FLOATING GLOWING CRYSTAL
      // Present in Intro and Quiz panels
      if (stage !== GameStage.TITLE && stage !== GameStage.ENDING) {
        const cryX = w * 0.62;
        const cryY = h * 0.44 + Math.sin(t * 0.04) * 12; // Floating bounce

        // Emit glowing particles
        if (t % 6 === 0) {
          particlesRef.current.push({
            x: cryX + (Math.random() - 0.5) * 15,
            y: cryY + 10,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -1.2 - Math.random() * 2,
            size: 2 + Math.random() * 4,
            alpha: 1,
            color: grassColorLevel > 0 
                ? (skyColorLevel > 0 ? "hsla(42, 100%, 75%, 1)" : "hsla(180, 100%, 70%, 1)") 
                : "hsla(280, 90%, 75%, 0.8)",
            decay: 0.015 + Math.random() * 0.02,
          });
        }

        // Draw crystal outer aura glow
        const auraSize = 45 + Math.sin(t * 0.06) * 12;
        const auraGrad = ctx.createRadialGradient(cryX, cryY, 2, cryX, cryY, auraSize);
        // Becomes more cyan/golden as puzzles are solved
        const themeHue = grassColorLevel > 0 
          ? (skyColorLevel > 0 ? 45 : 180) 
          : 275; // Purple -> Cyan -> Gold
        
        auraGrad.addColorStop(0, `hsla(${themeHue}, 100%, 70%, 0.4)`);
        auraGrad.addColorStop(0.5, `hsla(${themeHue}, 90%, 60%, 0.15)`);
        auraGrad.addColorStop(1, "rgba(0,0,0,0)");
        
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cryX, cryY, auraSize, 0, Math.PI * 2);
        ctx.fill();

        // Draw crystal geometric facets (Octahedron / Prism)
        const renderFacet = (p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number, col: string) => {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.lineTo(p3x, p3y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + sunColorLevel * 0.5})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        };

        const topY = cryY - 32;
        const botY = cryY + 32;
        const midY = cryY;
        const mX = cryX;
        const lX = cryX - 16;
        const rX = cryX + 16;

        const fillL1 = `hsl(${themeHue}, 75%, ${45 + sunColorLevel * 15}%)`;
        const fillL2 = `hsl(${themeHue}, 85%, ${35 + sunColorLevel * 12}%)`;
        const fillR1 = `hsl(${themeHue}, 95%, ${55 + sunColorLevel * 20}%)`;
        const fillR2 = `hsl(${themeHue}, 65%, ${40 + sunColorLevel * 15}%)`;

        // Front top facets
        renderFacet(mX, topY, lX, midY, mX, midY, fillL1);
        renderFacet(mX, topY, mX, midY, rX, midY, fillR1);
        // Front bottom facets
        renderFacet(mX, botY, lX, midY, mX, midY, fillL2);
        renderFacet(mX, botY, mX, midY, rX, midY, fillR2);
      }

      // 8. THE COSMIC MIRROR (Ending stage)
      if (stage === GameStage.ENDING) {
        const mirrorX = w * 0.38;
        const mirrorY = h * 0.5;
        const mirrorW = 54;
        const mirrorH = 110;

        // Draw mirror glow portal
        const ptGlow = ctx.createRadialGradient(mirrorX, mirrorY, 20, mirrorX, mirrorY, 70);
        ptGlow.addColorStop(0, "rgba(255, 235, 170, 0.45)");
        ptGlow.addColorStop(0.5, "rgba(168, 85, 247, 0.2)");
        ptGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = ptGlow;
        ctx.beginPath();
        ctx.arc(mirrorX, mirrorY, 80, 0, Math.PI * 2);
        ctx.fill();

        // Draw Mirror frame
        ctx.lineWidth = 6;
        ctx.strokeStyle = "rgba(234, 179, 8, 0.9)"; // Golden frame
        ctx.shadowColor = "rgba(234, 179, 8, 0.6)";
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        // Rounded arch mirror design
        ctx.moveTo(mirrorX - mirrorW / 2, mirrorY + mirrorH / 2);
        ctx.lineTo(mirrorX - mirrorW / 2, mirrorY - mirrorH / 2 + mirrorW / 2);
        ctx.arc(mirrorX, mirrorY - mirrorH / 2 + mirrorW / 2, mirrorW / 2, Math.PI, 2 * Math.PI);
        ctx.lineTo(mirrorX + mirrorW / 2, mirrorY + mirrorH / 2);
        ctx.closePath();
        ctx.stroke();

        // Clear shadow effects
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";

        // Mirror surface - shiny, showing a saturated silhouette reflection of Leo standing right
        const surfGrad = ctx.createLinearGradient(0, mirrorY - mirrorH/2, 0, mirrorY + mirrorH/2);
        surfGrad.addColorStop(0, "hsl(210, 85%, 65%)"); // sky reflection
        surfGrad.addColorStop(0.5, "hsl(140, 80%, 45%)"); // vibrant grass reflection
        surfGrad.addColorStop(1, "hsl(40, 95%, 55%)"); // golden warmth

        ctx.fillStyle = surfGrad;
        ctx.beginPath();
        ctx.moveTo(mirrorX - mirrorW / 2 + 3, mirrorY + mirrorH / 2 - 3);
        ctx.lineTo(mirrorX - mirrorW / 2 + 3, mirrorY - mirrorH / 2 + mirrorW / 2);
        ctx.arc(mirrorX, mirrorY - mirrorH / 2 + mirrorW / 2, mirrorW / 2 - 3, Math.PI, 2 * Math.PI);
        ctx.lineTo(mirrorX + mirrorW / 2 - 3, mirrorY + mirrorH / 2 - 3);
        ctx.closePath();
        ctx.fill();

        // Reflective sparkles inside the mirror
        ctx.fillStyle = "#ffffff";
        for (let s = 0; s < 5; s++) {
          const spX = mirrorX + (Math.sin(t * 0.04 + s * 23) * 0.35) * mirrorW;
          const spY = mirrorY + (Math.cos(t * 0.05 + s * 11) * 0.4) * mirrorH;
          const spSize = 1.5 + Math.sin(t * 0.1 + s) * 1;
          ctx.fillRect(spX, spY, spSize, spSize);
        }

        // DRAW LEO'S VIBRANT COLORED REFLECTION
        ctx.save();
        // Position reflection inside mirror, facing outward
        ctx.translate(mirrorX + 2, mirrorY + 12);
        ctx.scale(-0.48, 0.48); // scale down and flip horizontally to represent true reflection

        // Fully saturated golden reflective look
        const rSkin = "hsl(35, 100%, 75%)";
        const rJacket = "hsl(195, 100%, 55%)";
        const rScarf = "hsl(350, 100%, 60%)";

        // Draw shadow/silhouette body reflection
        ctx.fillStyle = rJacket;
        ctx.beginPath();
        ctx.ellipse(0, 5, 10, 19, 0, 0, Math.PI * 2);
        ctx.fill();

        // Scarf
        ctx.fillStyle = rScarf;
        ctx.beginPath();
        ctx.moveTo(-4, -6);
        ctx.quadraticCurveTo(-15, -12, -25, -5);
        ctx.lineTo(-18, 2);
        ctx.closePath();
        ctx.fill();

        // Head
        ctx.fillStyle = rSkin;
        ctx.beginPath();
        ctx.arc(0, -18, 7.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 9. ANIMATE AND DRAW PARTICLES
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1; // RESET ALPHA

      // Remove faded particles
      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0);

      // Request next frame
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dimensions, stage, grassColorLevel, skyColorLevel, sunColorLevel]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-stone-900 border border-stone-800"
      id="visual-environment-container"
    >
      <canvas
        ref={canvasRef}
        id="game-universe-canvas"
        className="block w-full h-full"
        style={{
          // Apply a gentle overall styling filter to emphasize the start-of-game desaturation
          filter: `saturate(${0.45 + (grassColorLevel + skyColorLevel + sunColorLevel) * 0.55})`,
          transition: "filter 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
      {/* Dynamic Status Badges over canvas */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5 pointer-events-none font-mono">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 text-white/80 px-2.5 py-1 text-[10px] rounded-md tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
          <span 
            className={`w-1.5 h-1.5 rounded-full inline-block ${
              stage === GameStage.TITLE ? "bg-red-500 animate-pulse" : "bg-emerald-400 animate-pulse"
            }`}
          />
          LOC: GREENWOOD RUN
        </div>
        <div className="bg-black/40 backdrop-blur-md border border-white/10 text-white/80 px-2.5 py-1 text-[10px] rounded-md tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
          <span>WORLD SATURATION:</span>
          <span className="font-semibold text-cyan-400">
            {Math.floor((grassColorLevel + skyColorLevel + sunColorLevel) * 33.33)}%
          </span>
        </div>
      </div>
    </div>
  );
};
