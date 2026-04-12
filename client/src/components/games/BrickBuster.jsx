"use client";

import { useEffect, useRef, useCallback } from "react";
import { saveHighScore, getHighScore } from "../../lib/games";

// ─── Brick Buster — Breakout clone ────────────────────────────────────────────
const CW = 360;
const CH = 480;
const PADDLE_W = 64;
const PADDLE_H = 10;
const PADDLE_Y = CH - 36;
const BALL_R = 8;
const BRICK_COLS = 8;
const BRICK_ROWS = 6;
const BRICK_W = 40;
const BRICK_H = 18;
const BRICK_GAP = 2;
const BRICK_OFFSET_X = (CW - BRICK_COLS * (BRICK_W + BRICK_GAP) + BRICK_GAP) / 2;
const BRICK_OFFSET_Y = 48;
const BALL_SPEED = 4.5;

const ROW_COLORS = [
  "#f84060", "#f87020", "#f8d020",
  "#40d060", "#20a0e8", "#8040f8",
];
const ROW_HITS = [2, 2, 1, 1, 1, 1]; // some rows need 2 hits

function makeBricks() {
  const bricks = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: BRICK_OFFSET_X + c * (BRICK_W + BRICK_GAP),
        y: BRICK_OFFSET_Y + r * (BRICK_H + BRICK_GAP),
        hp: ROW_HITS[r],
        maxHp: ROW_HITS[r],
        color: ROW_COLORS[r],
        alive: true,
      });
    }
  }
  return bricks;
}

function makeGS() {
  return {
    phase: "idle",
    bricks: makeBricks(),
    ball: { x: CW / 2, y: PADDLE_Y - BALL_R - 2, vx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1), vy: -BALL_SPEED },
    paddle: { x: CW / 2 - PADDLE_W / 2 },
    score: 0,
    lives: 3,
  };
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function drawBg(ctx) {
  const gr = ctx.createLinearGradient(0, 0, 0, CH);
  gr.addColorStop(0, "#100830");
  gr.addColorStop(1, "#0a1a28");
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, CW, CH);
}

function drawBricks(ctx, bricks) {
  for (const b of bricks) {
    if (!b.alive) continue;
    const alpha = b.hp < b.maxHp ? 0.55 : 1;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, BRICK_W, BRICK_H, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(b.x + 2, b.y + 2, BRICK_W - 4, 4);
    if (b.hp > 1) {
      ctx.fillStyle = "rgba(0,0,0,0.30)";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("✦", b.x + BRICK_W / 2, b.y + BRICK_H - 3);
      ctx.textAlign = "left";
    }
    ctx.globalAlpha = 1;
  }
}

function drawPaddle(ctx, paddle) {
  const gr = ctx.createLinearGradient(paddle.x, 0, paddle.x + PADDLE_W, 0);
  gr.addColorStop(0, "#c060f0");
  gr.addColorStop(0.5, "#e0a0ff");
  gr.addColorStop(1, "#c060f0");
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.roundRect(paddle.x, PADDLE_Y, PADDLE_W, PADDLE_H, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(paddle.x + 4, PADDLE_Y + 2, PADDLE_W - 8, 3);
}

function drawBall(ctx, ball) {
  // Glow
  const gr = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, BALL_R * 2);
  gr.addColorStop(0, "rgba(248,224,100,0.4)");
  gr.addColorStop(1, "rgba(248,224,100,0)");
  ctx.fillStyle = gr;
  ctx.fillRect(ball.x - BALL_R * 2, ball.y - BALL_R * 2, BALL_R * 4, BALL_R * 4);
  // Ball
  ctx.fillStyle = "#f8e060";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff8c0";
  ctx.beginPath();
  ctx.arc(ball.x - 2, ball.y - 2, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawHUD(ctx, score, lives, hs) {
  ctx.fillStyle = "rgba(10,6,32,0.6)";
  ctx.fillRect(0, 0, CW, 32);
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "#f8e060";
  ctx.fillText(`SCORE  ${score}`, 8, 21);
  ctx.fillStyle = "#f08080";
  ctx.fillText(`❤️ ${lives}`, 180, 21);
  ctx.fillStyle = "#a0c8f0";
  ctx.fillText(`BEST  ${hs}`, 240, 21);
}

function drawOverlay(ctx, phase, score) {
  if (phase === "playing") return;
  ctx.fillStyle = "rgba(10,6,30,0.80)";
  ctx.fillRect(0, 0, CW, CH);
  ctx.textAlign = "center";
  if (phase === "idle") {
    ctx.fillStyle = "#f8e060";
    ctx.font = "bold 24px monospace";
    ctx.fillText("BRICK BUSTER", CW / 2, CH / 2 - 36);
    ctx.fillStyle = "#c0a8ff";
    ctx.font = "11px monospace";
    ctx.fillText("drag paddle  ·  break all bricks", CW / 2, CH / 2 - 6);
    ctx.fillStyle = "#e0d8ff";
    ctx.fillText("[ TAP / DRAG  to  start ]", CW / 2, CH / 2 + 18);
  } else if (phase === "dead") {
    ctx.fillStyle = "#f84060";
    ctx.font = "bold 22px monospace";
    ctx.fillText("BUSTED!", CW / 2, CH / 2 - 36);
    ctx.fillStyle = "#f8e060";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`Score: ${score}`, CW / 2, CH / 2 - 8);
    ctx.fillStyle = "#c0a8ff";
    ctx.font = "11px monospace";
    ctx.fillText("[ TAP  to  retry ]", CW / 2, CH / 2 + 16);
  } else if (phase === "win") {
    ctx.fillStyle = "#40f0a0";
    ctx.font = "bold 22px monospace";
    ctx.fillText("CLEARED!", CW / 2, CH / 2 - 36);
    ctx.fillStyle = "#f8e060";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`Score: ${score}`, CW / 2, CH / 2 - 8);
    ctx.fillStyle = "#c0a8ff";
    ctx.font = "11px monospace";
    ctx.fillText("[ TAP  for  next  level ]", CW / 2, CH / 2 + 16);
  }
  ctx.textAlign = "left";
}

export default function BrickBuster({ onClose }) {
  const canvasRef = useRef(null);
  const gsRef = useRef(makeGS());
  const hsRef = useRef(0);
  const rafRef = useRef(0);
  const keysRef = useRef(new Set());

  const reset = useCallback(() => {
    gsRef.current = makeGS();
    gsRef.current.phase = "playing";
  }, []);

  useEffect(() => {
    hsRef.current = getHighScore("brick-buster");
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function loop() {
      const gs = gsRef.current;

      if (gs.phase === "playing") {
        // Keyboard paddle
        if (keysRef.current.has("ArrowLeft") || keysRef.current.has("KeyA")) {
          gs.paddle.x = Math.max(0, gs.paddle.x - 5);
        }
        if (keysRef.current.has("ArrowRight") || keysRef.current.has("KeyD")) {
          gs.paddle.x = Math.min(CW - PADDLE_W, gs.paddle.x + 5);
        }

        // Move ball
        gs.ball.x += gs.ball.vx;
        gs.ball.y += gs.ball.vy;

        // Wall bounces
        if (gs.ball.x - BALL_R < 0) { gs.ball.x = BALL_R; gs.ball.vx *= -1; }
        if (gs.ball.x + BALL_R > CW) { gs.ball.x = CW - BALL_R; gs.ball.vx *= -1; }
        if (gs.ball.y - BALL_R < 32) { gs.ball.y = 32 + BALL_R; gs.ball.vy *= -1; }

        // Paddle bounce
        if (
          gs.ball.vy > 0 &&
          gs.ball.y + BALL_R >= PADDLE_Y &&
          gs.ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 4 &&
          gs.ball.x >= gs.paddle.x - 4 &&
          gs.ball.x <= gs.paddle.x + PADDLE_W + 4
        ) {
          gs.ball.vy = -Math.abs(gs.ball.vy);
          // Angle based on hit pos
          const hit = (gs.ball.x - (gs.paddle.x + PADDLE_W / 2)) / (PADDLE_W / 2);
          gs.ball.vx = hit * BALL_SPEED * 1.2;
        }

        // Bottom = lost life
        if (gs.ball.y - BALL_R > CH) {
          gs.lives--;
          if (gs.lives <= 0) {
            gs.phase = "dead";
            saveHighScore("brick-buster", gs.score);
            hsRef.current = getHighScore("brick-buster");
          } else {
            gs.ball = { x: gs.paddle.x + PADDLE_W / 2, y: PADDLE_Y - BALL_R - 2, vx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1), vy: -BALL_SPEED };
          }
        }

        // Brick collision
        for (const b of gs.bricks) {
          if (!b.alive) continue;
          if (
            gs.ball.x + BALL_R > b.x &&
            gs.ball.x - BALL_R < b.x + BRICK_W &&
            gs.ball.y + BALL_R > b.y &&
            gs.ball.y - BALL_R < b.y + BRICK_H
          ) {
            b.hp--;
            if (b.hp <= 0) { b.alive = false; gs.score += 10; }
            else gs.score += 5;
            // Bounce
            const ballLeft = gs.ball.x - BALL_R;
            const ballRight = gs.ball.x + BALL_R;
            const ballTop = gs.ball.y - BALL_R;
            const ballBot = gs.ball.y + BALL_R;
            const overlapX = Math.min(ballRight - b.x, b.x + BRICK_W - ballLeft);
            const overlapY = Math.min(ballBot - b.y, b.y + BRICK_H - ballTop);
            if (overlapX < overlapY) gs.ball.vx *= -1;
            else gs.ball.vy *= -1;
            break;
          }
        }

        // Win?
        if (gs.bricks.every((b) => !b.alive)) {
          gs.phase = "win";
          saveHighScore("brick-buster", gs.score);
          hsRef.current = getHighScore("brick-buster");
        }
      }

      drawBg(ctx);
      drawBricks(ctx, gs.bricks);
      drawPaddle(ctx, gs.paddle);
      if (gs.phase === "playing") drawBall(ctx, gs.ball);
      drawHUD(ctx, gs.score, gs.lives, hsRef.current);
      drawOverlay(ctx, gs.phase, gs.score);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    const onKey = (e) => {
      keysRef.current.add(e.code);
      if (e.code === "Escape") onClose?.();
    };
    const onKeyUp = (e) => keysRef.current.delete(e.code);

    // Touch drag
    let dragging = false;
    const onPointerMove = (e) => {
      if (!dragging) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CW / rect.width;
      const px = (e.clientX - rect.left) * scaleX;
      gsRef.current.paddle.x = Math.max(0, Math.min(CW - PADDLE_W, px - PADDLE_W / 2));
    };
    const onPointerDown = (e) => {
      dragging = true;
      const gs = gsRef.current;
      if (gs.phase !== "playing") { reset(); return; }
      const rect = canvas.getBoundingClientRect();
      const scaleX = CW / rect.width;
      const px = (e.clientX - rect.left) * scaleX;
      gs.paddle.x = Math.max(0, Math.min(CW - PADDLE_W, px - PADDLE_W / 2));
    };
    const onPointerUp = () => { dragging = false; };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
    };
  }, [reset, onClose]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="rounded-2xl border-2 border-white/20 shadow-2xl max-w-full"
        style={{ imageRendering: "pixelated", touchAction: "none" }}
      />
      <p className="text-xs text-white/50">Drag paddle · ← → keys to move</p>
    </div>
  );
}
