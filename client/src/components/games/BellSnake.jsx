"use client";

import { useEffect, useRef, useCallback } from "react";
import { saveHighScore, getHighScore } from "../../lib/games";

// ─── Bell Snake ────────────────────────────────────────────────────────────────
const COLS = 18;
const ROWS = 18;
const CELL = 22;
const CW = COLS * CELL;
const CH = ROWS * CELL + 36; // + HUD

const FOOD_ICONS = ["🥦", "💧", "🍎", "🥕", "🥑", "🍇", "🫐", "🌿"];

const COLORS = {
  bg: "#0a1a0a",
  grid: "#0f220f",
  snakeHead: "#4ade80",
  snakeBody: "#22c55e",
  snakeOutline: "#166534",
  eye: "#fff",
  pupil: "#000",
  foodBg: "#1f2d1f",
  hud: "#0a1a0a",
  hudText: "#4ade80",
  hudBest: "#f8e060",
  wall: "#14532d",
};

function randFood(snake) {
  let pt;
  do {
    pt = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some((s) => s.x === pt.x && s.y === pt.y));
  return pt;
}

function makeGS() {
  const snake = [
    { x: 9, y: 9 },
    { x: 8, y: 9 },
    { x: 7, y: 9 },
  ];
  return {
    phase: "idle",
    snake,
    dir: "right",
    nextDir: "right",
    food: randFood(snake),
    foodIcon: FOOD_ICONS[Math.floor(Math.random() * FOOD_ICONS.length)],
    score: 0,
    frame: 0,
    tickInterval: 140,
    lastTick: 0,
  };
}

function drawHUD(ctx, score, hs) {
  ctx.fillStyle = COLORS.hud;
  ctx.fillRect(0, 0, CW, 36);
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.hudText;
  ctx.fillText(`SCORE  ${String(score).padStart(4, "0")}`, 10, 23);
  ctx.fillStyle = COLORS.hudBest;
  ctx.fillText(`BEST  ${String(hs).padStart(4, "0")}`, 200, 23);
}

function drawBoard(ctx, gs, foodAnim) {
  const oy = 36;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, oy, CW, ROWS * CELL);

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, oy + r * CELL); ctx.lineTo(CW, oy + r * CELL); ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * CELL, oy); ctx.lineTo(c * CELL, oy + ROWS * CELL); ctx.stroke();
  }

  const scale = 1 + Math.sin(foodAnim * 0.08) * 0.08;
  ctx.font = `${Math.round(CELL * 0.7 * scale)}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    gs.foodIcon,
    gs.food.x * CELL + CELL / 2,
    oy + gs.food.y * CELL + CELL / 2
  );
  ctx.textBaseline = "alphabetic";

  for (let i = gs.snake.length - 1; i >= 0; i--) {
    const seg = gs.snake[i];
    const isHead = i === 0;
    const px = seg.x * CELL;
    const py = oy + seg.y * CELL;
    const shade = isHead ? COLORS.snakeHead : COLORS.snakeBody;
    ctx.fillStyle = shade;
    ctx.strokeStyle = COLORS.snakeOutline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(px + 1, py + 1, CELL - 2, CELL - 2, isHead ? 6 : 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(px + 2, py + 2, CELL - 4, 4);
    if (isHead) {
      const dir = gs.dir;
      const ex1 = dir === "up" || dir === "down" ? -3 : dir === "right" ? 4 : -4;
      const ey1 = dir === "left" || dir === "right" ? -3 : dir === "down" ? 4 : -4;
      const ex2 = dir === "up" || dir === "down" ? 3 : ex1;
      const ey2 = dir === "left" || dir === "right" ? 3 : ey1;
      const cx1 = px + CELL / 2 + ex1;
      const cy1 = py + CELL / 2 + ey1;
      const cx2 = px + CELL / 2 + ex2;
      const cy2 = py + CELL / 2 + ey2;
      ctx.fillStyle = COLORS.eye;
      ctx.beginPath(); ctx.arc(cx1, cy1, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx2, cy2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.pupil;
      ctx.beginPath(); ctx.arc(cx1, cy1, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx2, cy2, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.textAlign = "left";
}

function drawOverlay(ctx, phase, score) {
  if (phase === "playing") return;
  const oy = 36;
  ctx.fillStyle = "rgba(5,12,5,0.80)";
  ctx.fillRect(0, oy, CW, ROWS * CELL);
  ctx.textAlign = "center";
  if (phase === "idle") {
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 24px monospace";
    ctx.fillText("BELL SNAKE", CW / 2, oy + ROWS * CELL / 2 - 30);
    ctx.fillStyle = "#a0e8b0";
    ctx.font = "11px monospace";
    ctx.fillText("eat healthy icons, grow longer", CW / 2, oy + ROWS * CELL / 2 - 6);
    ctx.fillStyle = "#e0ffe8";
    ctx.fillText("[ TAP  or  ARROW  KEYS ]", CW / 2, oy + ROWS * CELL / 2 + 18);
  } else {
    ctx.fillStyle = "#f84060";
    ctx.font = "bold 22px monospace";
    ctx.fillText("OOPS!", CW / 2, oy + ROWS * CELL / 2 - 32);
    ctx.fillStyle = "#f8e060";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`Score: ${score}`, CW / 2, oy + ROWS * CELL / 2 - 6);
    ctx.fillStyle = "#a0e8b0";
    ctx.font = "11px monospace";
    ctx.fillText("[ TAP  or  PRESS  KEY ]", CW / 2, oy + ROWS * CELL / 2 + 18);
  }
  ctx.textAlign = "left";
}

export default function BellSnake() {
  const canvasRef = useRef(null);
  const gsRef = useRef(makeGS());
  const hsRef = useRef(0);
  const foodAnimRef = useRef(0);
  const rafRef = useRef(0);

  const restart = useCallback(() => {
    gsRef.current = makeGS();
    gsRef.current.phase = "playing";
    gsRef.current.lastTick = performance.now();
  }, []);

  useEffect(() => {
    hsRef.current = getHighScore("bell-snake");
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function loop(now) {
      const gs = gsRef.current;
      foodAnimRef.current++;

      if (gs.phase === "playing") {
        if (now - gs.lastTick > gs.tickInterval) {
          gs.lastTick = now;
          gs.dir = gs.nextDir;
          const head = gs.snake[0];
          let nx = head.x, ny = head.y;
          if (gs.dir === "right") nx++;
          else if (gs.dir === "left") nx--;
          else if (gs.dir === "up") ny--;
          else ny++;

          if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
            gs.phase = "dead";
            saveHighScore("bell-snake", gs.score);
            hsRef.current = getHighScore("bell-snake");
          } else {
            const hit = gs.snake.some((s) => s.x === nx && s.y === ny);
            if (hit) {
              gs.phase = "dead";
              saveHighScore("bell-snake", gs.score);
              hsRef.current = getHighScore("bell-snake");
            } else {
              gs.snake.unshift({ x: nx, y: ny });
              if (nx === gs.food.x && ny === gs.food.y) {
                gs.score += 10;
                gs.food = randFood(gs.snake);
                gs.foodIcon = FOOD_ICONS[Math.floor(Math.random() * FOOD_ICONS.length)];
                gs.tickInterval = Math.max(60, gs.tickInterval - 3);
              } else {
                gs.snake.pop();
              }
            }
          }
        }
      }

      drawHUD(ctx, gs.score, hsRef.current);
      drawBoard(ctx, gs, foodAnimRef.current);
      drawOverlay(ctx, gs.phase, gs.score);

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    const onKey = (e) => {
      const gs = gsRef.current;
      if (gs.phase !== "playing") { restart(); return; }
      const { dir } = gs;
      if ((e.code === "ArrowUp" || e.code === "KeyW") && dir !== "down") gs.nextDir = "up";
      if ((e.code === "ArrowDown" || e.code === "KeyS") && dir !== "up") gs.nextDir = "down";
      if ((e.code === "ArrowLeft" || e.code === "KeyA") && dir !== "right") gs.nextDir = "left";
      if ((e.code === "ArrowRight" || e.code === "KeyD") && dir !== "left") gs.nextDir = "right";
    };

    let touchStartX = 0, touchStartY = 0;
    const onTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    const onTouchEnd = (e) => {
      const gs = gsRef.current;
      if (gs.phase !== "playing") { restart(); return; }
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 20 && gs.dir !== "left") gs.nextDir = "right";
        if (dx < -20 && gs.dir !== "right") gs.nextDir = "left";
      } else {
        if (dy > 20 && gs.dir !== "up") gs.nextDir = "down";
        if (dy < -20 && gs.dir !== "down") gs.nextDir = "up";
      }
    };

    window.addEventListener("keydown", onKey);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    canvas.addEventListener("pointerdown", () => {
      if (gsRef.current.phase !== "playing") restart();
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [restart]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="rounded-2xl border-2 border-white/20 shadow-2xl max-w-full"
        style={{ imageRendering: "pixelated", touchAction: "none" }}
      />
      <p className="text-xs text-white/50">Arrow keys or swipe to steer • tap to start</p>
    </div>
  );
}
