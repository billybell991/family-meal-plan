"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { saveHighScore, getHighScore } from "../../lib/games";

// ─── Bells 2048 — 2048 clone ──────────────────────────────────────────────────
const SIZE = 4;

// Each power of 2 maps to a bell-themed label & color
const TILE_META = {
  0:    { label: "",     bg: "bg-white/5",           text: "" },
  2:    { label: "🔔",   bg: "bg-amber-900/60",      text: "text-amber-200" },
  4:    { label: "🔔🔔", bg: "bg-amber-800/70",      text: "text-amber-100" },
  8:    { label: "💧",   bg: "bg-blue-800/70",       text: "text-blue-100" },
  16:   { label: "🌿",   bg: "bg-green-800/70",      text: "text-green-100" },
  32:   { label: "🍎",   bg: "bg-red-700/80",        text: "text-red-100" },
  64:   { label: "😊",   bg: "bg-yellow-600/80",     text: "text-yellow-100" },
  128:  { label: "💪",   bg: "bg-orange-600/80",     text: "text-orange-100" },
  256:  { label: "🧘",   bg: "bg-purple-700/80",     text: "text-purple-100" },
  512:  { label: "🌙",   bg: "bg-indigo-700/80",     text: "text-indigo-100" },
  1024: { label: "🏆",   bg: "bg-yellow-500/90",     text: "text-yellow-900 font-black" },
  2048: { label: "🔔✨", bg: "bg-gradient-to-br from-yellow-400 to-amber-600", text: "text-white font-black" },
};

function getMeta(val) {
  return TILE_META[val] ?? { label: `${val}`, bg: "bg-violet-700/90", text: "text-white font-black" };
}

function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function addRandom(grid) {
  const empty = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (grid[r][c] === 0) empty.push([r, c]);
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = grid.map((row) => [...row]);
  next[r][c] = Math.random() < 0.85 ? 2 : 4;
  return next;
}

function slideRow(row) {
  const filtered = row.filter((v) => v !== 0);
  let score = 0;
  const merged = [];
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const val = filtered[i] * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i++;
    }
  }
  while (merged.length < SIZE) merged.push(0);
  return { row: merged, score };
}

function moveGrid(grid, dir) {
  let totalScore = 0;
  let moved = false;
  const g = grid.map((r) => [...r]);

  function process(rows) {
    return rows.map((row) => {
      const { row: newRow, score } = slideRow(row);
      totalScore += score;
      if (newRow.join(",") !== row.join(",")) moved = true;
      return newRow;
    });
  }

  let rows;
  let result;

  if (dir === "left") {
    rows = g;
    result = process(rows);
  } else if (dir === "right") {
    rows = g.map((r) => [...r].reverse());
    result = process(rows).map((r) => r.reverse());
  } else if (dir === "up") {
    rows = Array.from({ length: SIZE }, (_, c) => g.map((r) => r[c]));
    const slid = process(rows);
    result = Array.from({ length: SIZE }, (_, r) => slid.map((col) => col[r]));
  } else { // down
    rows = Array.from({ length: SIZE }, (_, c) => g.map((r) => r[c]).reverse());
    const slid = process(rows);
    result = Array.from({ length: SIZE }, (_, r) => slid.map((col) => col[SIZE - 1 - r]));
  }

  return { grid: result, score: totalScore, moved };
}

function hasMovesLeft(grid) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return true;
      if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
      if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
    }
  }
  return false;
}

export default function Bells2048() {
  const [grid, setGrid] = useState(() => addRandom(addRandom(emptyGrid())));
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const touchRef = useRef(null);

  useEffect(() => {
    setBestScore(getHighScore("bells-2048"));
  }, []);

  const move = useCallback((dir) => {
    setGrid((g) => {
      const { grid: newGrid, score: gained, moved } = moveGrid(g, dir);
      if (!moved) return g;
      const withNew = addRandom(newGrid);
      setScore((s) => {
        const ns = s + gained;
        if (ns > getHighScore("bells-2048")) { saveHighScore("bells-2048", ns); setBestScore(ns); }
        return ns;
      });
      if (withNew.some((r) => r.some((v) => v === 2048))) setWon(true);
      if (!hasMovesLeft(withNew)) setGameOver(true);
      return withNew;
    });
  }, []);

  const restart = useCallback(() => {
    setGrid(addRandom(addRandom(emptyGrid())));
    setScore(0);
    setGameOver(false);
    setWon(false);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "ArrowUp") { e.preventDefault(); move("up"); }
      if (e.code === "ArrowDown") { e.preventDefault(); move("down"); }
      if (e.code === "ArrowLeft") { e.preventDefault(); move("left"); }
      if (e.code === "ArrowRight") { e.preventDefault(); move("right"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const onTouchStart = (e) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
    touchRef.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="flex gap-4 w-full max-w-xs justify-between px-2">
        <div className="text-center">
          <p className="text-xs text-white/50 font-mono uppercase">Score</p>
          <p className="text-xl font-bold text-yellow-300 font-mono">{score}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-white/50 font-mono uppercase">Best</p>
          <p className="text-xl font-bold text-amber-400 font-mono">{bestScore}</p>
        </div>
        <button onClick={restart} className="self-center px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-white transition-all">
          New Game
        </button>
      </div>

      <div
        className="grid gap-2 bg-white/5 rounded-2xl p-2"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, width: "min(300px, 90vw)", touchAction: "none" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {grid.flat().map((val, i) => {
          const meta = getMeta(val);
          return (
            <div
              key={i}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-100 ${meta.bg}`}
            >
              <span className="text-2xl leading-none">{meta.label}</span>
              {val > 0 && (
                <span className={`text-[10px] font-bold leading-tight ${meta.text}`}>
                  {val}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {(gameOver || won) && (
        <div className="text-center flex flex-col items-center gap-2">
          {won && !gameOver && (
            <p className="text-xl font-bold text-yellow-400">🔔✨ You rang 2048!</p>
          )}
          {gameOver && (
            <p className="text-xl font-bold text-red-400">No more moves!</p>
          )}
          <button onClick={restart} className="px-6 py-2 bg-amber-500 hover:bg-amber-400 rounded-2xl font-bold text-white transition-all active:scale-95">
            Play Again
          </button>
        </div>
      )}
      <p className="text-xs text-white/40">Arrow keys or swipe to merge tiles · reach 2048!</p>
    </div>
  );
}
