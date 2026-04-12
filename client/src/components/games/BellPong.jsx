"use client";

import { useEffect, useRef, useCallback } from "react";
import { saveHighScore, getHighScore } from "../../lib/games";

// ─── Bell Pong — Pong clone (player vs AI) ────────────────────────────────────
const CW = 360;
const CH = 480;
const PADDLE_W = 12;
const PADDLE_H = 64;
const PADDLE_MARGIN = 18;
const BALL_R = 8;
const BALL_SPEED_INIT = 4;
const AI_SPEED = 3.2;
const WIN_SCORE = 7;

function makeBall(dir = 1) {
  const angle = (Math.random() * 0.5 - 0.25) + (Math.random() > 0.5 ? 0 : Math.PI);
  return {
    x: CW / 2,
    y: CH / 2,
    vx: Math.cos(angle) * BALL_SPEED_INIT * dir,
    vy: Math.sin(angle) * BALL_SPEED_INIT,
  };
}

function makeGS() {
  return {
    phase: "idle",
    player: { y: CH / 2 - PADDLE_H / 2 },
    ai: { y: CH / 2 - PADDLE_H / 2 },
    ball: makeBall(),
    playerScore: 0,
    aiScore: 0,
    rally: 0,
  };
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function drawAll(ctx, gs, hs) {
  ctx.fillStyle = "#05051a";
  ctx.fillRect(0, 0, CW, CH);

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 12]);
  ctx.beginPath(); ctx.moveTo(CW / 2, 0); ctx.lineTo(CW / 2, CH); ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = "bold 36px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillText(String(gs.playerScore), CW / 4, 56);
  ctx.fillText(String(gs.aiScore), (CW * 3) / 4, 56);

  ctx.font = "9px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillText("YOU", CW / 4, 72);
  ctx.fillText("CPU", (CW * 3) / 4, 72);

  ctx.fillStyle = "rgba(248,224,96,0.6)";
  ctx.font = "9px monospace";
  ctx.fillText(`Best: ${hs}`, CW / 2, 20);

  if (gs.phase === "playing" && gs.rally > 2) {
    ctx.fillStyle = `rgba(248,160,64,${Math.min(1, gs.rally * 0.1)})`;
    ctx.font = "bold 11px monospace";
    ctx.fillText(`${gs.rally}x RALLY`, CW / 2, 90);
  }

  const playerGrad = ctx.createLinearGradient(PADDLE_MARGIN, 0, PADDLE_MARGIN + PADDLE_W, 0);
  playerGrad.addColorStop(0, "#8060f8");
  playerGrad.addColorStop(1, "#c0a0ff");
  ctx.fillStyle = playerGrad;
  ctx.beginPath();
  ctx.roundRect(PADDLE_MARGIN, gs.player.y, PADDLE_W, PADDLE_H, 6);
  ctx.fill();

  const aiGrad = ctx.createLinearGradient(CW - PADDLE_MARGIN - PADDLE_W, 0, CW - PADDLE_MARGIN, 0);
  aiGrad.addColorStop(0, "#f84060");
  aiGrad.addColorStop(1, "#f08080");
  ctx.fillStyle = aiGrad;
  ctx.beginPath();
  ctx.roundRect(CW - PADDLE_MARGIN - PADDLE_W, gs.ai.y, PADDLE_W, PADDLE_H, 6);
  ctx.fill();

  if (gs.phase === "playing") {
    const gr = ctx.createRadialGradient(gs.ball.x, gs.ball.y, 0, gs.ball.x, gs.ball.y, BALL_R * 2);
    gr.addColorStop(0, "rgba(248,224,96,0.5)");
    gr.addColorStop(1, "rgba(248,224,96,0)");
    ctx.fillStyle = gr;
    ctx.fillRect(gs.ball.x - BALL_R * 2, gs.ball.y - BALL_R * 2, BALL_R * 4, BALL_R * 4);
    ctx.fillStyle = "#f8e060";
    ctx.beginPath(); ctx.arc(gs.ball.x, gs.ball.y, BALL_R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff8c0";
    ctx.beginPath(); ctx.arc(gs.ball.x - 2, gs.ball.y - 2, 3, 0, Math.PI * 2); ctx.fill();
  }

  if (gs.phase !== "playing") {
    ctx.fillStyle = "rgba(5,5,26,0.82)";
    ctx.fillRect(0, 0, CW, CH);
    ctx.textAlign = "center";
    if (gs.phase === "idle") {
      ctx.fillStyle = "#c0a0ff";
      ctx.font = "bold 26px monospace";
      ctx.fillText("BELL PONG", CW / 2, CH / 2 - 40);
      ctx.fillStyle = "#a080e0";
      ctx.font = "11px monospace";
      ctx.fillText("first to 7 wins", CW / 2, CH / 2 - 12);
      ctx.fillStyle = "#e0d8ff";
      ctx.fillText("[ DRAG  PADDLE  or  ↑↓  KEYS ]", CW / 2, CH / 2 + 14);
    } else if (gs.phase === "won") {
      ctx.fillStyle = "#40f0a0";
      ctx.font = "bold 26px monospace";
      ctx.fillText("YOU WIN! 🏆", CW / 2, CH / 2 - 30);
      ctx.fillStyle = "#f8e060";
      ctx.font = "14px monospace";
      ctx.fillText(`${gs.playerScore} — ${gs.aiScore}`, CW / 2, CH / 2 - 2);
      ctx.fillStyle = "#c0a0ff";
      ctx.font = "11px monospace";
      ctx.fillText("[ TAP  to  play  again ]", CW / 2, CH / 2 + 22);
    } else {
      ctx.fillStyle = "#f84060";
      ctx.font = "bold 26px monospace";
      ctx.fillText("CPU WINS!", CW / 2, CH / 2 - 30);
      ctx.fillStyle = "#f8e060";
      ctx.font = "14px monospace";
      ctx.fillText(`${gs.playerScore} — ${gs.aiScore}`, CW / 2, CH / 2 - 2);
      ctx.fillStyle = "#c0a0ff";
      ctx.font = "11px monospace";
      ctx.fillText("[ TAP  to  retry ]", CW / 2, CH / 2 + 22);
    }
    ctx.textAlign = "left";
  }
}

export default function BellPong() {
  const canvasRef = useRef(null);
  const gsRef = useRef(makeGS());
  const hsRef = useRef(0);
  const rafRef = useRef(0);
  const keysRef = useRef(new Set());

  const restart = useCallback(() => {
    gsRef.current = makeGS();
    gsRef.current.phase = "playing";
  }, []);

  useEffect(() => {
    hsRef.current = getHighScore("bell-pong");
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function resetBall(scoredSide) {
      const gs = gsRef.current;
      gs.rally = 0;
      gs.ball = makeBall(scoredSide === "player" ? -1 : 1);
    }

    function loop() {
      const gs = gsRef.current;
      const keys = keysRef.current;

      if (gs.phase === "playing") {
        if (keys.has("ArrowUp") || keys.has("KeyW")) gs.player.y = Math.max(0, gs.player.y - 5);
        if (keys.has("ArrowDown") || keys.has("KeyS")) gs.player.y = Math.min(CH - PADDLE_H, gs.player.y + 5);

        const aiCenter = gs.ai.y + PADDLE_H / 2;
        if (gs.ball.vx > 0) {
          const diff = gs.ball.y - aiCenter;
          gs.ai.y += Math.sign(diff) * Math.min(AI_SPEED, Math.abs(diff));
        } else {
          const diff = CH / 2 - aiCenter;
          gs.ai.y += Math.sign(diff) * Math.min(AI_SPEED * 0.5, Math.abs(diff));
        }
        gs.ai.y = Math.max(0, Math.min(CH - PADDLE_H, gs.ai.y));

        const speed = Math.hypot(gs.ball.vx, gs.ball.vy);
        const maxSpeed = BALL_SPEED_INIT + gs.rally * 0.15;
        if (speed < maxSpeed) {
          gs.ball.vx *= 1.001;
          gs.ball.vy *= 1.001;
        }
        gs.ball.x += gs.ball.vx;
        gs.ball.y += gs.ball.vy;

        if (gs.ball.y - BALL_R < 0) { gs.ball.y = BALL_R; gs.ball.vy = Math.abs(gs.ball.vy); }
        if (gs.ball.y + BALL_R > CH) { gs.ball.y = CH - BALL_R; gs.ball.vy = -Math.abs(gs.ball.vy); }

        const px = PADDLE_MARGIN + PADDLE_W;
        if (
          gs.ball.vx < 0 &&
          gs.ball.x - BALL_R <= px &&
          gs.ball.x - BALL_R > px - 8 &&
          gs.ball.y >= gs.player.y - BALL_R &&
          gs.ball.y <= gs.player.y + PADDLE_H + BALL_R
        ) {
          gs.ball.vx = Math.abs(gs.ball.vx);
          const hit = (gs.ball.y - (gs.player.y + PADDLE_H / 2)) / (PADDLE_H / 2);
          gs.ball.vy = hit * BALL_SPEED_INIT * 1.2;
          gs.rally++;
        }

        const ax = CW - PADDLE_MARGIN - PADDLE_W;
        if (
          gs.ball.vx > 0 &&
          gs.ball.x + BALL_R >= ax &&
          gs.ball.x + BALL_R < ax + 8 &&
          gs.ball.y >= gs.ai.y - BALL_R &&
          gs.ball.y <= gs.ai.y + PADDLE_H + BALL_R
        ) {
          gs.ball.vx = -Math.abs(gs.ball.vx);
          const hit = (gs.ball.y - (gs.ai.y + PADDLE_H / 2)) / (PADDLE_H / 2);
          gs.ball.vy = hit * BALL_SPEED_INIT * 1.2;
          gs.rally++;
        }

        if (gs.ball.x < 0) { gs.aiScore++; resetBall("ai"); }
        if (gs.ball.x > CW) {
          gs.playerScore++;
          const points = gs.playerScore;
          if (points > hsRef.current) { saveHighScore("bell-pong", points); hsRef.current = points; }
          resetBall("player");
        }

        if (gs.playerScore >= WIN_SCORE) gs.phase = "won";
        if (gs.aiScore >= WIN_SCORE) gs.phase = "lost";
      }

      drawAll(ctx, gs, hsRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    const onKey = (e) => {
      keysRef.current.add(e.code);
      const gs = gsRef.current;
      if (gs.phase !== "playing") restart();
    };
    const onKeyUp = (e) => keysRef.current.delete(e.code);

    let dragging = false;
    const onPointerDown = (e) => {
      dragging = true;
      const gs = gsRef.current;
      if (gs.phase !== "playing") { restart(); return; }
    };
    const onPointerMove = (e) => {
      if (!dragging) return;
      const gs = gsRef.current;
      if (gs.phase !== "playing") return;
      const rect = canvas.getBoundingClientRect();
      const y = (e.clientY - rect.top) * (CH / rect.height);
      gs.player.y = Math.max(0, Math.min(CH - PADDLE_H, y - PADDLE_H / 2));
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
  }, [restart]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="rounded-2xl border-2 border-white/20 shadow-2xl max-w-full"
        style={{ touchAction: "none" }}
      />
      <p className="text-xs text-white/50">Drag or ↑↓ keys to move your paddle · first to 7 wins</p>
    </div>
  );
}
