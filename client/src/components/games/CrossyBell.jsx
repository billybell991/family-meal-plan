"use client";

import { useEffect, useRef, useCallback } from "react";
import { saveHighScore, getHighScore } from "../../lib/games";

// ─── Crossy Bell — Frogger / Crossy Road clone ───────────────────────────────
const COLS = 11;
const ROWS = 12;
const CELL = 36;
const CW = COLS * CELL;
const CH = ROWS * CELL + 40;

function makeLanes() {
  const cars = [];
  const logs = [];

  // Rows 1-4 are road (cars)
  const roadRows = [1, 2, 3, 4];
  for (const lane of roadRows) {
    const dir = Math.random() > 0.5 ? 1 : -1;
    const speed = 0.8 + Math.random() * 1.2;
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      cars.push({
        lane,
        x: (i * (CW / count) + (dir === 1 ? -100 : CW + 100)) % (CW + 160) - 80,
        speed,
        dir: dir,
        w: 52 + Math.floor(Math.random() * 28),
        color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
      });
    }
  }

  // Rows 6-9 are river (logs)
  const riverRows = [6, 7, 8, 9];
  for (const lane of riverRows) {
    const dir = Math.random() > 0.5 ? 1 : -1;
    const speed = 0.5 + Math.random() * 0.8;
    const count = 2;
    for (let i = 0; i < count; i++) {
      logs.push({
        lane,
        x: (i * (CW / count)) % (CW + 100),
        speed,
        dir: dir,
        w: 80 + Math.floor(Math.random() * 40),
      });
    }
  }

  return { cars, logs };
}

function makeGS() {
  const { cars, logs } = makeLanes();
  return {
    phase: "idle",
    px: Math.floor(COLS / 2),
    py: ROWS - 1,
    score: 0,
    maxRow: ROWS - 1,
    cars,
    logs,
    onLog: false,
    logOffset: 0,
  };
}

// ─── Drawing ──────────────────────────────────────────────────────────────────
const CAR_COLORS = ["#e84040", "#f8a020", "#4080f8", "#e840c8", "#40c8e8", "#80e840"];

function getLaneColor(row) {
  if (row === 0) return "#4a8a28"; // safe zone top
  if (row === ROWS - 1) return "#4a8a28"; // safe zone bottom
  if (row === 5) return "#4a8a28"; // median
  if (row >= 6 && row <= 9) return "#2060c0"; // river
  return "#555"; // road
}

function drawWorld(ctx, gs) {
  const oy = 40;
  for (let r = 0; r < ROWS; r++) {
    ctx.fillStyle = getLaneColor(r);
    ctx.fillRect(0, oy + r * CELL, CW, CELL);
    // Road markings
    if (r >= 1 && r <= 4) {
      ctx.strokeStyle = "#777";
      ctx.lineWidth = 1;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.moveTo(0, oy + r * CELL + CELL - 1);
      ctx.lineTo(CW, oy + r * CELL + CELL - 1);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // River waves
    if (r >= 6 && r <= 9) {
      ctx.strokeStyle = "rgba(100,160,255,0.4)";
      ctx.lineWidth = 1;
      for (let wx = 8; wx < CW; wx += 24) {
        ctx.beginPath();
        ctx.moveTo(wx, oy + r * CELL + CELL / 2 - 4);
        ctx.quadraticCurveTo(wx + 8, oy + r * CELL + CELL / 2 - 8, wx + 16, oy + r * CELL + CELL / 2 - 4);
        ctx.stroke();
      }
    }
  }

  // Logs
  for (const log of gs.logs) {
    const y = oy + log.lane * CELL + 4;
    const h = CELL - 8;
    ctx.fillStyle = "#8b5e3c";
    ctx.beginPath();
    ctx.roundRect(log.x, y, log.w, h, 8);
    ctx.fill();
    ctx.fillStyle = "#a07040";
    ctx.fillRect(log.x + 6, y + 3, log.w - 12, 4);
  }

  // Cars
  for (const car of gs.cars) {
    const y = oy + car.lane * CELL + 4;
    const h = CELL - 8;
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(car.x, y, car.w, h, 6);
    ctx.fill();
    // Windows
    ctx.fillStyle = "rgba(180,220,255,0.7)";
    const ww = car.w > 60 ? 14 : 10;
    ctx.fillRect(car.x + 6, y + 4, ww, h - 8);
    ctx.fillRect(car.x + car.w - 6 - ww, y + 4, ww, h - 8);
    // Headlights
    ctx.fillStyle = "#ffe060";
    const hx = car.dir === 1 ? car.x + car.w - 4 : car.x;
    ctx.fillRect(hx, y + 4, 4, 6);
    ctx.fillRect(hx, y + h - 10, 4, 6);
  }

  // Player (bell character)
  const bx = gs.px * CELL + CELL / 2;
  const by = oy + gs.py * CELL + CELL / 2;
  ctx.fillStyle = "#8060b8";
  ctx.beginPath();
  ctx.arc(bx, by - 4, 12, Math.PI, 0); // dome
  ctx.fill();
  ctx.fillStyle = "#8060b8";
  ctx.beginPath();
  ctx.moveTo(bx - 12, by - 4);
  ctx.lineTo(bx + 12, by - 4);
  ctx.lineTo(bx + 14, by + 6);
  ctx.lineTo(bx - 14, by + 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#5838a0";
  ctx.beginPath();
  ctx.arc(bx, by + 8, 4, 0, Math.PI * 2);
  ctx.fill();
  // Face
  ctx.fillStyle = "#fff";
  ctx.fillRect(bx - 7, by - 9, 4, 4);
  ctx.fillRect(bx + 3, by - 9, 4, 4);
  ctx.fillStyle = "#000";
  ctx.fillRect(bx - 6, by - 8, 2, 2);
  ctx.fillRect(bx + 4, by - 8, 2, 2);
}

function drawHUD(ctx, score, hs) {
  ctx.fillStyle = "#12082c";
  ctx.fillRect(0, 0, CW, 40);
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "#4ade80";
  ctx.fillText(`SCORE  ${String(score).padStart(4, "0")}`, 10, 26);
  ctx.fillStyle = "#f8e060";
  ctx.fillText(`BEST  ${String(hs).padStart(4, "0")}`, 240, 26);
}

function drawOverlay(ctx, phase, score) {
  if (phase === "playing") return;
  ctx.fillStyle = "rgba(10,6,32,0.78)";
  ctx.fillRect(0, 40, CW, ROWS * CELL);
  ctx.textAlign = "center";
  const my = 40 + (ROWS * CELL) / 2;
  if (phase === "idle") {
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 22px monospace";
    ctx.fillText("CROSSY BELL", CW / 2, my - 32);
    ctx.fillStyle = "#a0ffe0";
    ctx.font = "10px monospace";
    ctx.fillText("hop across — avoid cars — ride logs", CW / 2, my - 6);
    ctx.fillStyle = "#e0fff0";
    ctx.fillText("[ ARROW KEYS / SWIPE ]", CW / 2, my + 18);
  } else {
    ctx.fillStyle = "#f04040";
    ctx.font = "bold 22px monospace";
    ctx.fillText("SPLAT!", CW / 2, my - 30);
    ctx.fillStyle = "#f8e060";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`Score: ${score}`, CW / 2, my - 4);
    ctx.fillStyle = "#a0ffe0";
    ctx.font = "10px monospace";
    ctx.fillText("[ TAP / ARROW KEY ]", CW / 2, my + 18);
  }
  ctx.textAlign = "left";
}

export default function CrossyBell({ onClose }) {
  const canvasRef = useRef(null);
  const gsRef = useRef(makeGS());
  const hsRef = useRef(0);
  const rafRef = useRef(0);

  const move = useCallback((dir) => {
    const gs = gsRef.current;
    if (gs.phase !== "playing") {
      gsRef.current = makeGS();
      gsRef.current.phase = "playing";
      return;
    }
    let nx = gs.px, ny = gs.py;
    if (dir === "up") ny--;
    if (dir === "down") ny++;
    if (dir === "left") nx--;
    if (dir === "right") nx++;
    nx = Math.max(0, Math.min(COLS - 1, nx));
    ny = Math.max(0, Math.min(ROWS - 1, ny));
    gs.px = nx;
    gs.py = ny;
    if (ny < gs.maxRow) {
      gs.score += (gs.maxRow - ny);
      gs.maxRow = ny;
    }
  }, []);

  useEffect(() => {
    hsRef.current = getHighScore("crossy-bell");
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function loop() {
      const gs = gsRef.current;
      if (gs.phase === "playing") {
        // Move cars & logs
        for (const car of gs.cars) {
          car.x += car.speed * car.dir;
          if (car.dir === 1 && car.x > CW + 20) car.x = -car.w - 20;
          if (car.dir === -1 && car.x < -car.w - 20) car.x = CW + 20;
        }
        for (const log of gs.logs) {
          log.x += log.speed * log.dir;
          if (log.dir === 1 && log.x > CW + 20) log.x = -log.w - 20;
          if (log.dir === -1 && log.x < -log.w - 20) log.x = CW + 20;
        }

        // Player in river?
        if (gs.py >= 6 && gs.py <= 9) {
          const playerCX = gs.px * CELL + CELL / 2;
          const onALog = gs.logs
            .filter((l) => l.lane === gs.py)
            .some((l) => playerCX >= l.x && playerCX <= l.x + l.w);
          if (onALog) {
            const log = gs.logs.find((l) => l.lane === gs.py && playerCX >= l.x && playerCX <= l.x + l.w);
            if (log) {
              const newPx = gs.px + (log.speed * log.dir) / CELL;
              gs.px = Math.round(Math.max(0, Math.min(COLS - 1, newPx)));
            }
          } else {
            // Fell in river
            gs.phase = "dead";
            saveHighScore("crossy-bell", gs.score);
            hsRef.current = getHighScore("crossy-bell");
          }
        }

        // Car collision
        if (gs.py >= 1 && gs.py <= 4) {
          const playerCX = gs.px * CELL + CELL / 2;
          const playerCY = gs.py;
          const hit = gs.cars.some(
            (c) => c.lane === playerCY && playerCX + 10 > c.x && playerCX - 10 < c.x + c.w
          );
          if (hit) {
            gs.phase = "dead";
            saveHighScore("crossy-bell", gs.score);
            hsRef.current = getHighScore("crossy-bell");
          }
        }

        // Reached top
        if (gs.py === 0) {
          gs.score += 50;
          gs.py = ROWS - 1;
          gs.maxRow = ROWS - 1;
        }
      }

      drawHUD(ctx, gs.score, hsRef.current);
      drawWorld(ctx, gs);
      drawOverlay(ctx, gs.phase, gs.score);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    const onKey = (e) => {
      if (e.code === "ArrowUp") { e.preventDefault(); move("up"); }
      if (e.code === "ArrowDown") { e.preventDefault(); move("down"); }
      if (e.code === "ArrowLeft") { e.preventDefault(); move("left"); }
      if (e.code === "ArrowRight") { e.preventDefault(); move("right"); }
      if (e.code === "Escape") onClose?.();
    };

    let touchStartX = 0, touchStartY = 0;
    const onTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    const onTouchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) { move("up"); return; }
      if (Math.abs(dx) > Math.abs(dy)) {
        move(dx > 0 ? "right" : "left");
      } else {
        move(dy > 0 ? "down" : "up");
      }
    };
    canvas.addEventListener("pointerdown", () => {
      if (gsRef.current.phase !== "playing") move("up");
    });
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [move, onClose]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="rounded-2xl border-2 border-white/20 shadow-2xl max-w-full"
        style={{ imageRendering: "pixelated", touchAction: "none" }}
      />
      <div className="flex gap-8 mt-1">
        {(["left", "up", "down", "right"]).map((d) => (
          <button
            key={d}
            onPointerDown={() => move(d)}
            className="w-10 h-10 rounded-xl bg-white/10 active:bg-white/20 flex items-center justify-center text-lg text-white select-none"
          >
            {d === "up" ? "↑" : d === "down" ? "↓" : d === "left" ? "←" : "→"}
          </button>
        ))}
      </div>
    </div>
  );
}
