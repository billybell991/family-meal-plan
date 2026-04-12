"use client";

import { useEffect, useRef, useCallback } from "react";
import { saveHighScore, getHighScore } from "../../lib/games";

// Canvas & Physics Constants
const CW = 360;
const CH = 190;
const GROUND_Y = 148;
const CEILING_Y = 22;
const PLAYER_X = 55;
const PLAYER_W = 22;
const PLAYER_H = 40;

const GRAVITY = 0.6;
const JUMP_VEL = -10;
const BASE_SPEED = 3.5;
const MAX_SPEED = 9;
const SCORE_RATE = 6;

// Palette
const C = {
  skyTop:    "#b8d8f0",
  skyBot:    "#c8f0d8",
  cloud:     "#e8f8ff",
  sun:       "#f8e040",
  sunShine:  "#fff8a0",
  grass:     "#4a8a28",
  grassD:    "#386018",
  dirt:      "#8b6040",
  dirtD:     "#6b4820",
  pebble:    "#a08060",
  bell:      "#8060b8",
  bellD:     "#5838a0",
  bellL:     "#c0a0e0",
  eye:       "#ffffff",
  pupil:     "#201040",
  leg:       "#5838a0",
  foot:      "#402870",
  donut:     "#d84848",
  donutL:    "#f07070",
  donutD:    "#a02828",
  donutHole: "#b8d8f0",
  can:       "#e07232",
  canL:      "#f0a060",
  canD:      "#a04010",
  canCap:    "#c05020",
  cookie:    "#b84040",
  cookieL:   "#d87060",
  cookieD:    "#802828",
  chip:      "#f8d060",
  gem:       "#d4a820",
  gemL:      "#f8e060",
  gemD:      "#a07010",
  text:      "#201040",
  overlay:   "rgba(240,235,255,0.82)",
  hudBg:     "rgba(240,235,255,0.80)",
};

// Helpers
function s2(n) { return Math.round(n / 2) * 2; }

function hit(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// Drawing: Sky & Clouds
function drawSky(ctx, scroll) {
  const gr = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  gr.addColorStop(0, C.skyTop);
  gr.addColorStop(1, C.skyBot);
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, CW, GROUND_Y);

  ctx.fillStyle = C.sun;
  ctx.beginPath();
  ctx.arc(296, 28, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.sunShine;
  ctx.beginPath();
  ctx.arc(291, 23, 5, 0, Math.PI * 2);
  ctx.fill();

  const defs = [
    { ox: 30,  y: 20, w: 64, h: 18 },
    { ox: 175, y: 40, w: 50, h: 14 },
    { ox: 295, y: 16, w: 78, h: 20 },
    { ox: 435, y: 36, w: 54, h: 16 },
    { ox: 565, y: 23, w: 46, h: 14 },
  ];
  ctx.fillStyle = C.cloud;
  for (const cl of defs) {
    const cx = s2(((cl.ox - scroll * 0.15) % (CW + 160) + CW + 160) % (CW + 160) - 60);
    ctx.fillRect(cx,      cl.y,      cl.w,      cl.h);
    ctx.fillRect(cx + 8,  cl.y - 8,  cl.w - 18, 10);
    ctx.fillRect(cx + 20, cl.y - 14, cl.w - 38, 8);
  }
}

// Drawing: Ground
function drawGround(ctx, scroll) {
  ctx.fillStyle = C.dirt;
  ctx.fillRect(0, GROUND_Y, CW, CH - GROUND_Y);
  ctx.fillStyle = C.dirtD;
  ctx.fillRect(0, GROUND_Y + 18, CW, CH - GROUND_Y - 18);

  ctx.fillStyle = C.pebble;
  for (let ox = 0; ox < CW + 60; ox += 60) {
    const px2 = s2(((ox - scroll * 0.5) % (CW + 60) + CW + 60) % (CW + 60));
    ctx.fillRect(px2,      GROUND_Y + 8,  6, 4);
    ctx.fillRect(px2 + 26, GROUND_Y + 14, 4, 3);
  }

  ctx.fillStyle = C.grass;
  ctx.fillRect(0, GROUND_Y, CW, 8);
  ctx.fillStyle = C.grassD;
  ctx.fillRect(0, GROUND_Y, CW, 2);

  ctx.fillStyle = C.grassD;
  const gap = 48;
  const off = s2(scroll % gap);
  for (let tx = -off; tx < CW + gap; tx += gap) {
    const gx = s2(tx);
    ctx.fillRect(gx,      GROUND_Y - 4, 2, 4);
    ctx.fillRect(gx + 7,  GROUND_Y - 7, 2, 7);
    ctx.fillRect(gx + 13, GROUND_Y - 3, 2, 3);
    ctx.fillRect(gx + 22, GROUND_Y - 6, 2, 6);
  }
}

// Drawing: Bello
function drawBello(ctx, py, frame) {
  const x = s2(PLAYER_X);
  const y = s2(py);
  const onGround = py >= GROUND_Y - PLAYER_H - 1;

  if (!onGround) {
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.beginPath();
    ctx.ellipse(x + 11, GROUND_Y + 3, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = C.bell;
  ctx.beginPath();
  ctx.arc(x + 11, y + 12, 11, Math.PI, 0, false);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x,      y + 12);
  ctx.lineTo(x + 22, y + 12);
  ctx.lineTo(x + 26, y + 26);
  ctx.lineTo(x - 4,  y + 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - 5, y + 24, 32, 8);

  ctx.fillStyle = C.bellD;
  ctx.beginPath();
  ctx.moveTo(x,     y + 12);
  ctx.lineTo(x + 7, y + 12);
  ctx.lineTo(x + 4, y + 26);
  ctx.lineTo(x - 4, y + 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - 5, y + 24, 8, 8);

  ctx.fillStyle = C.bellL;
  ctx.fillRect(x + 14, y + 4,  4, 10);
  ctx.fillRect(x + 9,  y + 16, 2, 8);

  ctx.fillStyle = C.bellD;
  ctx.beginPath();
  ctx.arc(x + 11, y + 31, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = C.eye;
  ctx.fillRect(x + 4,  y + 6, 4, 4);
  ctx.fillRect(x + 13, y + 6, 4, 4);
  ctx.fillStyle = C.pupil;
  ctx.fillRect(x + 5,  y + 7, 2, 2);
  ctx.fillRect(x + 14, y + 7, 2, 2);

  if (onGround) {
    const a = (frame >> 2) & 1;
    ctx.fillStyle = C.leg;
    ctx.fillRect(x + 2,  y + 32, 8, a ? 8 : 6);
    ctx.fillRect(x + 13, y + 32, 8, a ? 6 : 8);
    ctx.fillStyle = C.foot;
    ctx.fillRect(x + (a ? 1 : 2),   y + 32 + (a ? 8 : 6), 10, 3);
    ctx.fillRect(x + (a ? 12 : 13), y + 32 + (a ? 6 : 8), 10, 3);
  } else {
    ctx.fillStyle = C.leg;
    ctx.fillRect(x + 2,  y + 32, 8, 5);
    ctx.fillRect(x + 13, y + 32, 8, 5);
  }
}

// Game Component
export default function BellDash({ onClose }) {
  const canvasRef = useRef(null);
  const gs = useRef(null);
  const highScore = useRef(0);

  const init = useCallback(() => {
    gs.current = {
      phase: "idle",
      py: GROUND_Y - PLAYER_H,
      vy: 0,
      jumps: 2,
      obs: [],
      gems: [],
      score: 0,
      speed: BASE_SPEED,
      frame: 0,
      scroll: 0,
      nextObs: 0,
      nextGem: 0,
    };
    highScore.current = getHighScore("bell-dash");
  }, []);

  const jump = useCallback(() => {
    if (gs.current.phase === "dead") {
      init();
      gs.current.phase = "playing";
      return;
    }
    if (gs.current.phase === "idle") {
      gs.current.phase = "playing";
    }
    if (gs.current.jumps > 0) {
      gs.current.vy = JUMP_VEL;
      gs.current.jumps--;
    }
  }, [init]);

  const rafId = useRef(null);

  const gameLoop = useCallback((ctx) => {
    const g = gs.current;
    g.frame++;

    // Update
    if (g.phase === "playing") {
      g.vy += GRAVITY;
      g.py += g.vy;

      if (g.py >= GROUND_Y - PLAYER_H) {
        g.py = GROUND_Y - PLAYER_H;
        g.vy = 0;
        g.jumps = 2;
      }

      g.scroll += g.speed;
      if (g.frame % SCORE_RATE === 0) {
        g.score++;
      }
      g.speed = Math.min(MAX_SPEED, g.speed + 0.001);

      // Obstacles
      g.nextObs -= g.speed;
      if (g.nextObs < 0) {
        const t = Math.floor(Math.random() * 3);
        const h = t === 0 ? 30 : t === 1 ? 40 : 20;
        g.obs.push({ x: CW, w: 30, h, t });
        g.nextObs = 100 + Math.random() * 100;
      }
      g.obs = g.obs.filter(o => o.x > -o.w);
      for (const o of g.obs) {
        o.x -= g.speed;
        if (hit(PLAYER_X, g.py, PLAYER_W, PLAYER_H, o.x, GROUND_Y - o.h, o.w, o.h)) {
          g.phase = "dead";
          saveHighScore("bell-dash", g.score);
        }
      }
    }

    // Draw
    drawSky(ctx, g.scroll);
    drawGround(ctx, g.scroll);
    drawBello(ctx, g.py, g.frame);

    for (const o of g.obs) {
      const ox = s2(o.x);
      const oy = s2(GROUND_Y - o.h);
      if (o.t === 0) {
        // Donut
        ctx.fillStyle = C.donut;
        ctx.beginPath();
        ctx.arc(ox + 15, oy + 15, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.donutL;
        ctx.beginPath();
        ctx.arc(ox + 15, oy + 12, 10, Math.PI, 0, false);
        ctx.fill();
        ctx.fillStyle = C.donutHole;
        ctx.beginPath();
        ctx.arc(ox + 15, oy + 15, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.t === 1) {
        // Soda can
        ctx.fillStyle = C.can;
        ctx.fillRect(ox + 6, oy + 6, 18, 34);
        ctx.fillStyle = C.canL;
        ctx.fillRect(ox + 8, oy + 8, 6, 30);
        ctx.fillStyle = C.canD;
        ctx.fillRect(ox + 18, oy + 8, 4, 30);
        ctx.fillStyle = C.canCap;
        ctx.fillRect(ox + 8, oy, 14, 8);
        ctx.fillStyle = "#e0e0e0";
        ctx.fillRect(ox + 12, oy - 2, 6, 4);
      } else {
        // Cookie
        ctx.fillStyle = C.cookie;
        ctx.beginPath();
        ctx.arc(ox + 15, oy + 10, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.cookieL;
        ctx.beginPath();
        ctx.arc(ox + 13, oy + 7, 8, Math.PI, 0, false);
        ctx.fill();
        ctx.fillStyle = C.cookieD;
        ctx.fillRect(ox + 9, oy + 6, 3, 3);
        ctx.fillRect(ox + 16, oy + 10, 3, 3);
        ctx.fillRect(ox + 11, oy + 13, 3, 3);
      }
    }

    // HUD
    ctx.fillStyle = C.text;
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${g.score}`, 10, 20);
    ctx.textAlign = "right";
    ctx.fillText(`High: ${highScore.current}`, CW - 10, 20);

    if (g.phase === "idle") {
      ctx.fillStyle = C.overlay;
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = C.text;
      ctx.textAlign = "center";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("Bell Dash", CW / 2, CH / 2 - 20);
      ctx.font = "16px sans-serif";
      ctx.fillText("Tap to start", CW / 2, CH / 2 + 10);
    } else if (g.phase === "dead") {
      ctx.fillStyle = C.overlay;
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = C.text;
      ctx.textAlign = "center";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("Game Over", CW / 2, CH / 2 - 20);
      ctx.font = "16px sans-serif";
      ctx.fillText(`Score: ${g.score}`, CW / 2, CH / 2 + 10);
      ctx.font = "12px sans-serif";
      ctx.fillText("Tap to play again", CW / 2, CH / 2 + 40);
    }

    rafId.current = requestAnimationFrame(() => gameLoop(ctx));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    init();
    gameLoop(ctx);

    const handleKeyDown = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        jump();
      }
    };
    const handleTouchStart = () => jump();

    window.addEventListener("keydown", handleKeyDown);
    canvas.addEventListener("touchstart", handleTouchStart);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("touchstart", handleTouchStart);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [init, gameLoop, jump]);

  return <canvas ref={canvasRef} width={CW} height={CH} className="w-full" style={{ aspectRatio: `${CW}/${CH}` }} />;
}
