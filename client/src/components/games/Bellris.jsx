"use client";

import { useEffect, useRef } from "react";
import { saveHighScore, getHighScore } from "../../lib/games";

// ─── Bellris — Tetris clone ────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const CELL = 26;
const CW = COLS * CELL + 100; // board + sidebar
const CH = ROWS * CELL;

// Piece colors: I, O, T, S, Z, J, L
const COLORS = [
  "#00c8f8", // I — cyan
  "#f8d800", // O — yellow
  "#a020f0", // T — purple
  "#00f048", // S — green
  "#f80020", // Z — red
  "#0028f8", // J — blue
  "#f88000", // L — orange
];

const PIECES = [
  [[1, 1, 1, 1]],                            // I
  [[1, 1], [1, 1]],                          // O
  [[0, 1, 0], [1, 1, 1]],                    // T
  [[0, 1, 1], [1, 1, 0]],                    // S
  [[1, 1, 0], [0, 1, 1]],                    // Z
  [[1, 0, 0], [1, 1, 1]],                    // J
  [[0, 0, 1], [1, 1, 1]],                    // L
];

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
  const i = Math.floor(Math.random() * PIECES.length);
  return {
    shape: PIECES[i].map((r) => [...r]),
    color: COLORS[i],
    x: Math.floor(COLS / 2) - Math.floor(PIECES[i][0].length / 2),
    y: 0,
  };
}

function rotate(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (__, r) => shape[rows - 1 - r][c])
  );
}

function collides(board, piece, dx = 0, dy = 0, shape = piece.shape) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx] !== null) return true;
    }
  }
  return false;
}

function place(board, piece) {
  const b = board.map((row) => [...row]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const ny = piece.y + r;
      const nx = piece.x + c;
      if (ny >= 0) b[ny][nx] = COLORS.indexOf(piece.color);
    }
  }
  return b;
}

function clearLines(board) {
  const newBoard = board.filter((row) => row.some((c) => c === null));
  const lines = ROWS - newBoard.length;
  while (newBoard.length < ROWS) newBoard.unshift(Array(COLS).fill(null));
  return { board: newBoard, lines };
}

// ─── Canvas drawing ───────────────────────────────────────────────────────────
const BW = COLS * CELL;

function drawBoard(ctx, board) {
  ctx.fillStyle = "#0a0620";
  ctx.fillRect(0, 0, BW, CH);
  // Grid lines
  ctx.strokeStyle = "#1a1040";
  ctx.lineWidth = 0.5;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(BW, r * CELL); ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, CH); ctx.stroke();
  }
  // Cells
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = board[r][c];
      if (idx === null) continue;
      const col = COLORS[idx];
      ctx.fillStyle = col;
      ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, 5);
      ctx.fillStyle = "rgba(0,0,0,0.20)";
      ctx.fillRect(c * CELL + 1, r * CELL + CELL - 6, CELL - 2, 5);
    }
  }
}

function drawPieceOnBoard(ctx, piece, alpha = 1) {
  ctx.globalAlpha = alpha;
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const px = (piece.x + c) * CELL;
      const py = (piece.y + r) * CELL;
      if (py < 0) continue;
      ctx.fillStyle = piece.color;
      ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(px + 1, py + 1, CELL - 2, 5);
    }
  }
  ctx.globalAlpha = 1;
}

function drawGhost(ctx, board, piece) {
  const ghost = { ...piece };
  while (!collides(board, ghost, 0, 1)) ghost.y++;
  drawPieceOnBoard(ctx, ghost, 0.18);
}

function drawSidebar(ctx, score, level, lines, next, hs) {
  const sx = BW + 4;
  const sw = CW - BW - 4;
  ctx.fillStyle = "#12082c";
  ctx.fillRect(BW, 0, CW - BW, CH);

  ctx.font = "bold 9px monospace";
  ctx.fillStyle = "#8060b8";
  ctx.textAlign = "left";

  const label = (text, y) => { ctx.fillStyle = "#8060b8"; ctx.font = "bold 8px monospace"; ctx.fillText(text, sx + 4, y); };
  const value = (text, y) => { ctx.fillStyle = "#f8e060"; ctx.font = "bold 12px monospace"; ctx.fillText(text, sx + 4, y); };

  label("SCORE", 24); value(String(score), 36);
  label("BEST", 56); value(String(hs), 68);
  label("LEVEL", 88); value(String(level), 100);
  label("LINES", 120); value(String(lines), 132);

  // Next piece
  label("NEXT", 160);
  ctx.fillStyle = "#0a0620";
  ctx.fillRect(sx + 2, 166, sw - 6, 64);
  const ns = next.shape;
  const startX = sx + Math.floor((sw - ns[0].length * CELL / 2) / 2) - 4;
  const startY = 170 + Math.floor((64 - ns.length * CELL / 2) / 2);
  for (let r = 0; r < ns.length; r++) {
    for (let c = 0; c < ns[r].length; c++) {
      if (!ns[r][c]) continue;
      ctx.fillStyle = next.color;
      ctx.fillRect(startX + c * (CELL / 2), startY + r * (CELL / 2), CELL / 2 - 1, CELL / 2 - 1);
    }
  }
}

function drawOverlay(ctx, phase, score) {
  if (phase === "playing") return;
  ctx.fillStyle = "rgba(10,6,32,0.80)";
  ctx.fillRect(0, 0, BW, CH);
  ctx.textAlign = "center";
  if (phase === "idle") {
    ctx.fillStyle = "#f8e060";
    ctx.font = "bold 22px monospace";
    ctx.fillText("DROPRIS", BW / 2, CH / 2 - 40);
    ctx.fillStyle = "#c0a8e8";
    ctx.font = "10px monospace";
    ctx.fillText("← → move  ↑ rotate", BW / 2, CH / 2 - 14);
    ctx.fillText("↓ drop  Space hardrop", BW / 2, CH / 2);
    ctx.fillStyle = "#e0d8ff";
    ctx.fillText("[ TAP TO START ]", BW / 2, CH / 2 + 24);
  } else {
    ctx.fillStyle = "#f84060";
    ctx.font = "bold 20px monospace";
    ctx.fillText("GAME OVER", BW / 2, CH / 2 - 36);
    ctx.fillStyle = "#f8e060";
    ctx.font = "bold 13px monospace";
    ctx.fillText(`Score: ${score}`, BW / 2, CH / 2 - 10);
    ctx.fillStyle = "#c0a8e8";
    ctx.font = "10px monospace";
    ctx.fillText("[ TAP TO RESTART ]", BW / 2, CH / 2 + 14);
  }
  ctx.textAlign = "left";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Bellris() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");

    // Scale canvas to fill wrapper while preserving aspect ratio
    function fitCanvas() {
      if (!wrap || !canvas) return;
      const ratio = CW / CH;
      const ww = wrap.clientWidth;
      const wh = wrap.clientHeight;
      let w = ww;
      let h = w / ratio;
      if (h > wh) { h = wh; w = h * ratio; }
      canvas.style.width  = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    fitCanvas();
    const ro = new ResizeObserver(fitCanvas);
    ro.observe(wrap);

    let phase = "idle";
    let board = emptyBoard();
    let current = randomPiece();
    let next = randomPiece();
    let score = 0;
    let totalLines = 0;
    let level = 1;
    let hs = getHighScore("bellris");
    let dropInterval = 800;
    let lastDrop = performance.now();
    let raf = 0;

    function startGame() {
      board = emptyBoard(); current = randomPiece(); next = randomPiece();
      score = 0; totalLines = 0; level = 1; dropInterval = 800;
      lastDrop = performance.now(); phase = "playing";
    }

    function lockAndNext() {
      board = place(board, current);
      const { board: cleared, lines } = clearLines(board);
      board = cleared; totalLines += lines;
      const pts = [0, 100, 300, 500, 800][lines] ?? 0;
      score += pts * level;
      level = 1 + Math.floor(totalLines / 10);
      dropInterval = Math.max(100, 800 - (level - 1) * 70);
      current = next; next = randomPiece();
      if (collides(board, current)) {
        phase = "over";
        if (score > hs) { saveHighScore("bellris", score); hs = score; }
      }
    }

    function doMoveLeft()  { if (!collides(board, current, -1)) current.x--; }
    function doMoveRight() { if (!collides(board, current,  1)) current.x++; }
    function doRotate()    { const r = rotate(current.shape); if (!collides(board, current, 0, 0, r)) current.shape = r; }
    function doSoftDrop()  { if (!collides(board, current, 0, 1)) { current.y++; score++; } else lockAndNext(); lastDrop = performance.now(); }
    function doHardDrop()  { while (!collides(board, current, 0, 1)) { current.y++; score += 2; } lockAndNext(); lastDrop = performance.now(); }

    function loop(now) {
      if (phase === "playing" && now - lastDrop > dropInterval) {
        if (!collides(board, current, 0, 1)) current.y++; else lockAndNext();
        lastDrop = now;
      }
      drawBoard(ctx, board);
      if (phase === "playing") { drawGhost(ctx, board, current); drawPieceOnBoard(ctx, current); }
      drawSidebar(ctx, score, level, totalLines, next, hs);
      drawOverlay(ctx, phase, score);
      raf = requestAnimationFrame(loop);
    }

    const onKey = (e) => {
      if (phase === "idle" || phase === "over") {
        if (e.code === "Enter" || e.code === "Space") startGame();
        return;
      }
      if (phase !== "playing") return;
      switch (e.code) {
        case "ArrowLeft":  doMoveLeft();  break;
        case "ArrowRight": doMoveRight(); break;
        case "ArrowDown":  doSoftDrop();  break;
        case "ArrowUp":    doRotate();    break;
        case "Space":      e.preventDefault(); doHardDrop(); break;
      }
    };

    // ── Gesture detection ────────────────────────────────────────────────────
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let lastTapTime = 0;
    const SWIPE_THRESHOLD = 25; // px
    const TAP_MAX_DIST    = 12; // px
    const TAP_MAX_MS      = 220;
    const DOUBLE_TAP_MS   = 300;

    const onTouchStart = (e) => {
      e.preventDefault();
      // Start/restart immediately on first touch — don't wait for touchend
      if (phase === "idle" || phase === "over") { startGame(); return; }
      touchStartX    = e.touches[0].clientX;
      touchStartY    = e.touches[0].clientY;
      touchStartTime = performance.now();
    };

    const onTouchEnd = (e) => {
      e.preventDefault();
      if (phase !== "playing") return;

      const dx   = e.changedTouches[0].clientX - touchStartX;
      const dy   = e.changedTouches[0].clientY - touchStartY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dt   = performance.now() - touchStartTime;
      const now  = performance.now();

      // Tap (small movement, quick)
      if (dist < TAP_MAX_DIST && dt < TAP_MAX_MS) {
        if (now - lastTapTime < DOUBLE_TAP_MS) {
          // Double tap → rotate
          doRotate();
          lastTapTime = 0;
        } else {
          lastTapTime = now;
          // Single tap — wait briefly to see if double follows; if not, soft drop
          setTimeout(() => {
            if (performance.now() - lastTapTime >= DOUBLE_TAP_MS - 20) doSoftDrop();
          }, DOUBLE_TAP_MS);
        }
        return;
      }

      // Swipe — dominant axis
      if (Math.abs(dx) >= Math.abs(dy)) {
        // Horizontal
        if (dx < -SWIPE_THRESHOLD) doMoveLeft();
        else if (dx > SWIPE_THRESHOLD) doMoveRight();
      } else {
        // Vertical
        if (dy > SWIPE_THRESHOLD) doHardDrop();
      }
    };
    
    const onTap = (e) => {
        if (phase === "idle" || phase === "over") {
            startGame();
        }
    }

    canvas.addEventListener("click", onTap);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchend",   onTouchEnd,   { passive: false });
    raf = requestAnimationFrame(loop);
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("click", onTap);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend",   onTouchEnd);
    };
  }, []);

  return (
    <div ref={wrapRef} className="w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="rounded-2xl border-2 border-white/20 shadow-2xl"
        style={{ imageRendering: "pixelated", touchAction: "none", display: "block" }}
      />
    </div>
  );
}
