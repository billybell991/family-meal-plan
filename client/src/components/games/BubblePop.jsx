"use client";

import { useEffect, useRef, useCallback } from "react";
import { saveHighScore, getHighScore } from "../../lib/games";

// ─── Bubble Pop — Bubble Shooter clone ────────────────────────────────────────
const CW = 360;
const CH = 520;
const COLS = 9;
const ROWS = 10;
const R = 18; // bubble radius
const OFFSET_X = R + 2;
const OFFSET_Y = R + 24;
const ROW_H = R * 1.72;
const SHOOTER_Y = CH - 40;
const SHOOTER_X = CW / 2;
const BUBBLE_SPEED = 9;
const COLORS = ["#f84060", "#f8a020", "#f8e020", "#40d060", "#20a0f8", "#a040f8", "#f060c0"];

function bubbleCX(col, row) {
  const offset = row % 2 === 1 ? R : 0;
  return OFFSET_X + col * (R * 2 + 2) + offset;
}
function bubbleCY(row) {
  return OFFSET_Y + row * ROW_H;
}

function makeGrid(rows = 6) {
  const bubbles = [];
  for (let row = 0; row < rows; row++) {
    const cols = row % 2 === 0 ? COLS : COLS - 1;
    for (let col = 0; col < cols; col++) {
      bubbles.push({
        col, row,
        color: COLORS[Math.floor(Math.random() * 5)],
        alive: true,
      });
    }
  }
  return bubbles;
}

function dist(ax, ay, bx, by) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function makeGS() {
  return {
    phase: "idle",
    bubbles: makeGrid(6),
    shot: null,
    nextColor: COLORS[Math.floor(Math.random() * 5)],
    currentColor: COLORS[Math.floor(Math.random() * 5)],
    aimAngle: -Math.PI / 2,
    score: 0,
    shotsLeft: 30,
    particles: [],
  };
}

function snapGrid(x, y, bubbles) {
  // Find nearest row by y
  let row = Math.round((y - OFFSET_Y) / ROW_H);
  row = Math.max(0, Math.min(ROWS - 1, row));
  const offset = row % 2 === 1 ? R : 0;
  const col = Math.round((x - OFFSET_X - offset) / (R * 2 + 2));
  const cols = row % 2 === 0 ? COLS : COLS - 1;
  const clampedCol = Math.max(0, Math.min(cols - 1, col));
  // Check not occupied
  if (bubbles.some((b) => b.row === row && b.col === clampedCol && b.alive)) return null;
  return { col: clampedCol, row };
}

function findCluster(bubbles, startCol, startRow, color) {
  const visited = new Set();
  const cluster = [];
  const queue = [{ col: startCol, row: startRow }];
  while (queue.length > 0) {
    const { col, row } = queue.shift();
    const key = `${col},${row}`;
    if (visited.has(key)) continue;
    visited.add(key);
    const b = bubbles.find((b) => b.col === col && b.row === row && b.alive);
    if (!b || b.color !== color) continue;
    cluster.push(b);
    // Neighbors (hex grid)
    const neighbors = getNeighbors(col, row);
    for (const n of neighbors) queue.push(n);
  }
  return cluster;
}

function getNeighbors(col, row) {
  const isOffset = row % 2 === 1;
  return [
    { col: col - 1, row },
    { col: col + 1, row },
    { col, row: row - 1 },
    { col, row: row + 1 },
    { col: col + (isOffset ? 1 : -1), row: row - 1 },
    { col: col + (isOffset ? 1 : -1), row: row + 1 },
  ];
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function drawBubble(ctx, cx, cy, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(cx - 4, cy - 4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawAll(ctx, gs, hs) {
  // Background
  const gr = ctx.createLinearGradient(0, 0, 0, CH);
  gr.addColorStop(0, "#1a082c");
  gr.addColorStop(1, "#0a1420");
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, CW, CH);

  // Grid bubbles
  for (const b of gs.bubbles) {
    if (!b.alive) continue;
    const cx = bubbleCX(b.col, b.row);
    const cy = bubbleCY(b.row);
    drawBubble(ctx, cx, cy, b.color);
  }

  // Shot bubble
  if (gs.shot?.active) {
    drawBubble(ctx, gs.shot.x, gs.shot.y, gs.shot.color);
  }

  // Particles
  for (const p of gs.particles) {
    const alpha = p.life / 40;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Shooter
  const aimX = SHOOTER_X + Math.cos(gs.aimAngle) * 40;
  const aimY = SHOOTER_Y + Math.sin(gs.aimAngle) * 40;
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(SHOOTER_X, SHOOTER_Y); ctx.lineTo(aimX, aimY); ctx.stroke();
  ctx.setLineDash([]);
  if (!gs.shot?.active) {
    drawBubble(ctx, SHOOTER_X, SHOOTER_Y, gs.currentColor);
  }
  // Next bubble indicator
  ctx.font = "9px monospace";
  ctx.fillStyle = "#a080c0";
  ctx.textAlign = "center";
  ctx.fillText("NEXT", SHOOTER_X - 42, SHOOTER_Y + 4);
  drawBubble(ctx, SHOOTER_X - 42, SHOOTER_Y + 18, gs.nextColor, 0.8);

  // HUD
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(10,4,20,0.7)";
  ctx.fillRect(0, 0, CW, 22);
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "#f8e060";
  ctx.fillText(`SCORE  ${gs.score}`, 8, 15);
  ctx.fillStyle = "#c0a8ff";
  ctx.fillText(`SHOTS  ${gs.shotsLeft}`, 180, 15);
  ctx.fillStyle = "#80c0ff";
  ctx.fillText(`BEST  ${hs}`, 270, 15);

  // Danger line
  ctx.strokeStyle = "rgba(248,64,96,0.4)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(0, SHOOTER_Y - 60); ctx.lineTo(CW, SHOOTER_Y - 60); ctx.stroke();
  ctx.setLineDash([]);

  // Overlay
  if (gs.phase !== "playing") {
    ctx.fillStyle = "rgba(10,4,20,0.82)";
    ctx.fillRect(0, 0, CW, CH);
    ctx.textAlign = "center";
    if (gs.phase === "idle") {
      ctx.fillStyle = "#c060f0";
      ctx.font = "bold 24px monospace";
      ctx.fillText("BUBBLE POP", CW / 2, CH / 2 - 36);
      ctx.fillStyle = "#e0c0ff";
      ctx.font = "11px monospace";
      ctx.fillText("tap to aim & shoot", CW / 2, CH / 2 - 6);
      ctx.fillText("match 3+ to pop!", CW / 2, CH / 2 + 12);
      ctx.fillStyle = "#fff";
      ctx.fillText("[ TAP / SPACE ]", CW / 2, CH / 2 + 38);
    } else if (gs.phase === "dead") {
      ctx.fillStyle = "#f84060";
      ctx.font = "bold 22px monospace";
      ctx.fillText("SPLATTERED!", CW / 2, CH / 2 - 30);
      ctx.fillStyle = "#f8e060";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`Score: ${gs.score}`, CW / 2, CH / 2 - 4);
      ctx.fillStyle = "#c060f0";
      ctx.font = "11px monospace";
      ctx.fillText("[ TAP  to  retry ]", CW / 2, CH / 2 + 18);
    } else {
      ctx.fillStyle = "#40f0a0";
      ctx.font = "bold 22px monospace";
      ctx.fillText("POPPED'EM ALL!", CW / 2, CH / 2 - 30);
      ctx.fillStyle = "#f8e060";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`Score: ${gs.score}`, CW / 2, CH / 2 - 4);
      ctx.fillStyle = "#c060f0";
      ctx.font = "11px monospace";
      ctx.fillText("[ TAP  to  play  again ]", CW / 2, CH / 2 + 18);
    }
    ctx.textAlign = "left";
  }
}

export default function BubblePop({ onClose }) {
  const canvasRef = useRef(null);
  const gsRef = useRef(makeGS());
  const hsRef = useRef(0);
  const rafRef = useRef(0);

  const shoot = useCallback(() => {
    const gs = gsRef.current;
    if (gs.phase !== "playing" || gs.shot?.active) return;
    if (gs.shotsLeft <= 0) return;
    const angle = gs.aimAngle;
    gs.shot = {
      x: SHOOTER_X,
      y: SHOOTER_Y,
      vx: Math.cos(angle) * BUBBLE_SPEED,
      vy: Math.sin(angle) * BUBBLE_SPEED,
      color: gs.currentColor,
      active: true,
    };
    gs.currentColor = gs.nextColor;
    gs.nextColor = COLORS[Math.floor(Math.random() * 5)];
    gs.shotsLeft--;
  }, []);

  const restart = useCallback(() => {
    gsRef.current = makeGS();
    gsRef.current.phase = "playing";
  }, []);

  useEffect(() => {
    hsRef.current = getHighScore("bubble-pop");
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function loop() {
      const gs = gsRef.current;

      if (gs.phase === "playing") {
        // Update shot
        if (gs.shot?.active) {
          gs.shot.x += gs.shot.vx;
          gs.shot.y += gs.shot.vy;

          // Wall bounce
          if (gs.shot.x - R < 0) { gs.shot.x = R; gs.shot.vx *= -1; }
          if (gs.shot.x + R > CW) { gs.shot.x = CW - R; gs.shot.vx *= -1; }

          // Hit ceiling or bubble
          let landed = false;
          if (gs.shot.y - R <= OFFSET_Y - ROW_H) {
            // Snap to top row
            landed = true;
            gs.shot.y = OFFSET_Y;
          } else {
            // Check collision with bubbles
            for (const b of gs.bubbles) {
              if (!b.alive) continue;
              const cx = bubbleCX(b.col, b.row);
              const cy = bubbleCY(b.row);
              if (dist(gs.shot.x, gs.shot.y, cx, cy) < R * 1.9) {
                landed = true;
                break;
              }
            }
          }

          if (landed) {
            const snapped = snapGrid(gs.shot.x, gs.shot.y, gs.bubbles);
            if (snapped) {
              const newBubble = { col: snapped.col, row: snapped.row, color: gs.shot.color, alive: true };
              gs.bubbles.push(newBubble);
              // Find cluster
              const cluster = findCluster(gs.bubbles, snapped.col, snapped.row, gs.shot.color);
              if (cluster.length >= 3) {
                for (const b of cluster) b.alive = false;
                gs.score += cluster.length * 10;
                // Particles
                for (const b of cluster) {
                  const cx = bubbleCX(b.col, b.row);
                  const cy = bubbleCY(b.row);
                  for (let i = 0; i < 5; i++) {
                    const ang = Math.random() * Math.PI * 2;
                    gs.particles.push({ x: cx, y: cy, vx: Math.cos(ang) * 2, vy: Math.sin(ang) * 2, life: 40, color: b.color });
                  }
                }
                // Remove floating bubbles
                const connected = new Set();
                const queue = gs.bubbles.filter((b) => b.alive && b.row === 0).map((b) => ({ col: b.col, row: b.row }));
                for (const q of queue) {
                  const key = `${q.col},${q.row}`;
                  if (connected.has(key)) continue;
                  connected.add(key);
                  const nb = getNeighbors(q.col, q.row);
                  for (const n of nb) {
                    if (!connected.has(`${n.col},${n.row}`) && gs.bubbles.some((b) => b.col === n.col && b.row === n.row && b.alive)) {
                      queue.push(n);
                    }
                  }
                }
                for (const b of gs.bubbles) {
                  if (b.alive && !connected.has(`${b.col},${b.row}`)) {
                    b.alive = false;
                    gs.score += 5;
                  }
                }
              }
              // Win?
              if (gs.bubbles.every((b) => !b.alive)) {
                gs.phase = "win";
                saveHighScore("bubble-pop", gs.score);
                hsRef.current = getHighScore("bubble-pop");
              }
              // Danger: any bubble below threshold
              if (gs.bubbles.some((b) => b.alive && bubbleCY(b.row) > SHOOTER_Y - 60)) {
                gs.phase = "dead";
                saveHighScore("bubble-pop", gs.score);
                hsRef.current = getHighScore("bubble-pop");
              }
              // Out of shots
              if (gs.shotsLeft <= 0) {
                gs.phase = "dead";
                saveHighScore("bubble-pop", gs.score);
                hsRef.current = getHighScore("bubble-pop");
              }
            }
            gs.shot = null;
          }
        }

        // Particles
        gs.particles = gs.particles.filter((p) => p.life > 0);
        for (const p of gs.particles) { p.x += p.vx; p.y += p.vy; p.life--; }
      }

      drawAll(ctx, gs, hsRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    const onPointerMove = (e) => {
      const gs = gsRef.current;
      if (gs.phase !== "playing") return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (CW / rect.width);
      const y = (e.clientY - rect.top) * (CH / rect.height);
      const dx = x - SHOOTER_X;
      const dy = y - SHOOTER_Y;
      const angle = Math.atan2(dy, dx);
      // Clamp: don't shoot downward
      gs.aimAngle = Math.max(-Math.PI + 0.2, Math.min(-0.2, angle));
    };

    const onPointerDown = (e) => {
      const gs = gsRef.current;
      if (gs.phase !== "playing") { restart(); return; }
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (CW / rect.width);
      const y = (e.clientY - rect.top) * (CH / rect.height);
      const dx = x - SHOOTER_X;
      const dy = y - SHOOTER_Y;
      const angle = Math.atan2(dy, dx);
      gs.aimAngle = Math.max(-Math.PI + 0.2, Math.min(-0.2, angle));
      shoot();
    };

    const onKey = (e) => {
      const gs = gsRef.current;
      if (e.code === "Escape") { onClose?.(); return; }
      if (gs.phase !== "playing") { restart(); return; }
      if (e.code === "ArrowLeft") gs.aimAngle = Math.max(-Math.PI + 0.2, gs.aimAngle - 0.12);
      if (e.code === "ArrowRight") gs.aimAngle = Math.min(-0.2, gs.aimAngle + 0.12);
      if (e.code === "Space") { e.preventDefault(); shoot(); }
    };

    window.addEventListener("keydown", onKey);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, [shoot, restart, onClose]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="rounded-2xl border-2 border-white/20 shadow-2xl max-w-full"
        style={{ touchAction: "none" }}
      />
      <p className="text-xs text-white/50">Tap or move mouse to aim · Space / tap to shoot</p>
    </div>
  );
}
