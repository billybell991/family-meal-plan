"use client";

import { useEffect, useRef, useCallback } from "react";
import { saveHighScore, getHighScore } from "../../lib/games";

// ─── Constants ────────────────────────────────────────────────────────────────
const CW = 360;
const CH = 480;
const GRAVITY = 0.35;
const FLAP_VEL = -7;
const PIPE_GAP = 140;
const PIPE_SPEED = 2.2;
const PIPE_INTERVAL = 90; // frames between pipes
const BIRD_X = 70;
const BIRD_R = 16;

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  skyTop: "#87ceeb",
  skyBot: "#c8f0ff",
  ground: "#4a8a28",
  groundD: "#386018",
  pipe: "#5a9a38",
  pipeD: "#3a7020",
  pipeCap: "#3a7020",
  pipeCapD: "#2a5010",
  bird: "#f8d060",
  birdD: "#d8a820",
  birdL: "#fff8c0",
  beak: "#e07020",
  eye: "#fff",
  pupil: "#201040",
  wing: "#f0b820",
  overlay: "rgba(18,8,44,0.60)",
  hudBg: "rgba(18,8,44,0.35)",
  text: "#fff8e8",
  score: "#f8e060",
  star1: "#fffde0",
  star2: "#ffd080",
  cloud: "#e8f8ff",
};

// ─── Draw helpers ─────────────────────────────────────────────────────────────
function drawSky(ctx, cloudOff) {
  const gr = ctx.createLinearGradient(0, 0, 0, CH - 40);
  gr.addColorStop(0, C.skyTop);
  gr.addColorStop(1, C.skyBot);
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, CW, CH - 40);

  // Stars (only visible when bird is high up — always add them for visual variety)
  [
    { x: 30, y: 18 }, { x: 90, y: 35 }, { x: 200, y: 12 }, { x: 300, y: 28 }, { x: 340, y: 10 },
  ].forEach(({ x, y }) => {
    ctx.fillStyle = C.star1;
    ctx.fillRect(x, y, 2, 2);
  });

  // Clouds
  const clouds = [{ ox: 40, y: 60, w: 70 }, { ox: 180, y: 90, w: 55 }, { ox: 280, y: 50, w: 80 }];
  ctx.fillStyle = C.cloud;
  for (const cl of clouds) {
    const cx = ((cl.ox - cloudOff * 0.4) % (CW + 120) + CW + 120) % (CW + 120) - 60;
    ctx.fillRect(cx, cl.y, cl.w, 20);
    ctx.fillRect(cx + 8, cl.y - 12, cl.w - 20, 14);
    ctx.fillRect(cx + 18, cl.y - 20, cl.w - 36, 10);
  }
}

function drawGround(ctx) {
  ctx.fillStyle = C.ground;
  ctx.fillRect(0, CH - 40, CW, 40);
  ctx.fillStyle = C.groundD;
  ctx.fillRect(0, CH - 40, CW, 4);
}

function drawPipe(ctx, pipe) {
  const gapY = pipe.topH;
  const botY = gapY + PIPE_GAP;
  const pw = 44;
  const capH = 14;
  const capW = 52;
  const x = pipe.x;

  // Top pipe body
  ctx.fillStyle = C.pipe;
  ctx.fillRect(x, 0, pw, gapY - capH);
  ctx.fillStyle = C.pipeD;
  ctx.fillRect(x, 0, 6, gapY - capH);
  ctx.fillRect(x + pw - 6, 0, 6, gapY - capH);
  // Top pipe cap
  ctx.fillStyle = C.pipeCap;
  ctx.fillRect(x - (capW - pw) / 2, gapY - capH, capW, capH);
  ctx.fillStyle = C.pipeCapD;
  ctx.fillRect(x - (capW - pw) / 2, gapY - capH, capW, 4);

  // Bottom pipe body
  const botBodyH = CH - 40 - botY - capH;
  ctx.fillStyle = C.pipe;
  ctx.fillRect(x, botY + capH, pw, botBodyH);
  ctx.fillStyle = C.pipeD;
  ctx.fillRect(x, botY + capH, 6, botBodyH);
  ctx.fillRect(x + pw - 6, botY + capH, 6, botBodyH);
  // Bottom pipe cap
  ctx.fillStyle = C.pipeCap;
  ctx.fillRect(x - (capW - pw) / 2, botY, capW, capH);
  ctx.fillStyle = C.pipeCapD;
  ctx.fillRect(x - (capW - pw) / 2, botY, capW, 4);
}

function drawBird(ctx, by, wing) {
  const x = BIRD_X;
  const y = Math.round(by);
  const flap = Math.floor(wing / 5) % 3; // 0=up, 1=mid, 2=down

  // Shadow when airborne
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.ellipse(x, CH - 40, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing (behind body)
  const wingY = y + (flap === 0 ? -10 : flap === 1 ? -4 : 4);
  ctx.fillStyle = C.wing;
  ctx.beginPath();
  ctx.ellipse(x - 6, wingY, 12, 8, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = C.bird;
  ctx.beginPath();
  ctx.arc(x, y, BIRD_R, 0, Math.PI * 2);
  ctx.fill();

  // Body highlight
  ctx.fillStyle = C.birdL;
  ctx.beginPath();
  ctx.arc(x - 5, y - 5, 7, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = C.beak;
  ctx.beginPath();
  ctx.moveTo(x + BIRD_R - 2, y - 2);
  ctx.lineTo(x + BIRD_R + 10, y + 2);
  ctx.lineTo(x + BIRD_R - 2, y + 6);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = C.eye;
  ctx.beginPath();
  ctx.arc(x + 5, y - 5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.pupil;
  ctx.beginPath();
  ctx.arc(x + 6, y - 5, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawHUD(ctx, score, hs) {
  ctx.fillStyle = C.hudBg;
  ctx.fillRect(0, 0, CW, 24);
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = C.score;
  ctx.fillText(`SCORE  ${String(score).padStart(4, "0")}`, 10, 16);
  ctx.fillStyle = "#a0e8ff";
  ctx.fillText(`BEST  ${String(hs).padStart(4, "0")}`, 220, 16);
}

function drawOverlay(ctx, phase, score) {
  if (phase === "playing") return;
  ctx.fillStyle = C.overlay;
  ctx.fillRect(0, 0, CW, CH);
  ctx.textAlign = "center";
  if (phase === "idle") {
    ctx.fillStyle = "#f8e060";
    ctx.font = "bold 28px monospace";
    ctx.fillText("ZEN FLAP", CW / 2, CH / 2 - 40);
    ctx.fillStyle = "#c0e8ff";
    ctx.font = "12px monospace";
    ctx.fillText("float  through  the  calm", CW / 2, CH / 2 - 10);
    ctx.fillStyle = "#e0f8ff";
    ctx.fillText("[ TAP  or  SPACE ]", CW / 2, CH / 2 + 16);
  } else {
    ctx.fillStyle = "#f84060";
    ctx.font = "bold 24px monospace";
    ctx.fillText("BONK!", CW / 2, CH / 2 - 36);
    ctx.fillStyle = "#f8e060";
    ctx.font = "bold 15px monospace";
    ctx.fillText(`Score: ${score}`, CW / 2, CH / 2 - 8);
    ctx.fillStyle = "#c0e8ff";
    ctx.font = "11px monospace";
    ctx.fillText("[ TAP  or  SPACE  to  retry ]", CW / 2, CH / 2 + 16);
  }
  ctx.textAlign = "left";
}

function randPipeTop() {
  return 60 + Math.random() * (CH - 40 - PIPE_GAP - 60 - 60);
}

function makeGS() {
  return {
    phase: "idle",
    by: CH / 2,
    bvy: 0,
    wing: 0,
    pipes: [],
    score: 0,
    frame: 0,
    nextPipe: PIPE_INTERVAL,
    stars: [],
    cloudOff: 0,
    speed: PIPE_SPEED,
  };
}

export default function ZenFlap() {
  const canvasRef = useRef(null);
  const gsRef = useRef(makeGS());
  const rafRef = useRef(0);
  const hsRef = useRef(0);

  const flap = useCallback(() => {
    const gs = gsRef.current;
    if (gs.phase === "dead") {
      gsRef.current = makeGS();
      gsRef.current.phase = "playing";
      return;
    }
    if (gs.phase === "idle") {
      gs.phase = "playing";
    }
    gs.bvy = FLAP_VEL;
  }, []);

  useEffect(() => {
    hsRef.current = getHighScore("zen-flap");
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function loop() {
      const gs = gsRef.current;
      const { phase } = gs;

      // Physics
      if (phase === "playing") {
        gs.bvy += GRAVITY;
        gs.by += gs.bvy;
        gs.wing++;
        gs.frame++;

        // Speed ramp: start increasing after 30s (~1800 frames), every 10s (~600 frames)
        if (gs.frame > 1800) {
          const rampLevel = Math.floor((gs.frame - 1800) / 600);
          gs.speed = Math.min(4.5, PIPE_SPEED + (rampLevel + 1) * 0.3);
        }

        gs.cloudOff += gs.speed;

        // Spawn pipes
        if (gs.frame >= gs.nextPipe) {
          gs.pipes.push({ x: CW, topH: randPipeTop() });
          gs.nextPipe = gs.frame + PIPE_INTERVAL;
        }

        // Move pipes + score
        for (const p of gs.pipes) {
          p.x -= gs.speed;
          if (Math.abs(p.x - BIRD_X) < 2) gs.score++;
        }
        gs.pipes = gs.pipes.filter((p) => p.x > -60);

        // Collision: ground / ceiling
        if (gs.by + BIRD_R >= CH - 40 || gs.by - BIRD_R <= 0) {
          gs.phase = "dead";
          saveHighScore("zen-flap", gs.score);
          hsRef.current = getHighScore("zen-flap");
        }

        // Collision: pipes
        for (const p of gs.pipes) {
          const pw = 44;
          const capOff = 7;
          if (
            BIRD_X + BIRD_R > p.x - capOff &&
            BIRD_X - BIRD_R < p.x + pw + capOff
          ) {
            if (gs.by - BIRD_R < p.topH || gs.by + BIRD_R > p.topH + PIPE_GAP) {
              gs.phase = "dead";
              saveHighScore("zen-flap", gs.score);
              hsRef.current = getHighScore("zen-flap");
            }
          }
        }
      } else if (phase === "idle") {
        // Idle hover
        gs.by = CH / 2 + Math.sin(Date.now() / 600) * 8;
        gs.wing++;
        gs.cloudOff += 0.5;
      }

      // Draw
      ctx.clearRect(0, 0, CW, CH);
      drawSky(ctx, gs.cloudOff);
      for (const p of gs.pipes) drawPipe(ctx, p);
      drawGround(ctx);
      drawBird(ctx, gs.by, gs.wing);
      drawHUD(ctx, gs.score, hsRef.current);
      drawOverlay(ctx, gs.phase, gs.score);

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    const onKey = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKey);
    };
  }, [flap]);

  return (
    <div
      className="flex flex-col items-center justify-center w-full h-full gap-2"
      style={{ touchAction: "none" }}
      onClick={flap}
      onTouchStart={(e) => { e.preventDefault(); flap(); }}
    >
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="rounded-2xl border-2 border-white/20 shadow-2xl max-w-full"
        style={{ imageRendering: "pixelated", touchAction: "none" }}
      />
      <p className="text-xs text-white/50">Tap anywhere or press Space to flap</p>
    </div>
  );
}
