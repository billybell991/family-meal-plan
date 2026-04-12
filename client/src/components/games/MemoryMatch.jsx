"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { saveHighScore, getHighScore } from "../../lib/games";

// ─── Memory Match — Concentration card flip ───────────────────────────────────
const ICONS = [
  "💧", "🥦", "😊", "🌙", "🏃", "🧘", "❤️", "🌿",
  "🔋", "🏆", "🌟", "🎯", "🍎", "💪", "🌈", "🕊️",
];

const GRID = 4; // 4×4 = 16 cards = 8 pairs

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeCards() {
  const pairs = ICONS.slice(0, GRID * GRID / 2);
  return shuffle([...pairs, ...pairs]).map((icon, i) => ({
    id: i,
    icon,
    flipped: false,
    matched: false,
  }));
}

export default function MemoryMatch({ onClose }) {
  const [cards, setCards] = useState(makeCards);
  const [phase, setPhase] = useState("idle");
  const [flipped, setFlipped] = useState([]);
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [bestMoves, setBestMoves] = useState(0);
  const lockRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setBestMoves(getHighScore("memory-match"));
  }, []);

  const startGame = useCallback(() => {
    setCards(makeCards());
    setFlipped([]);
    setMoves(0);
    setElapsed(0);
    setStartTime(Date.now());
    setPhase("playing");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - Date.now()) / 1000)), 1000);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);
    const t0 = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, startTime]);

  const tap = useCallback((id) => {
    if (phase === "idle") { startGame(); return; }
    if (phase !== "playing") return;
    if (lockRef.current) return;

    setCards((prev) => {
      const card = prev[id];
      if (card.flipped || card.matched) return prev;
      return prev.map((c) => c.id === id ? { ...c, flipped: true } : c);
    });

    setFlipped((prev) => {
      const next = [...prev, id];
      if (next.length === 2) {
        lockRef.current = true;
        setMoves((m) => {
          const newMoves = m + 1;
          setTimeout(() => {
            setCards((cards2) => {
              const [a, b] = next.map((i) => cards2[i]);
              if (a.icon === b.icon) {
                const updated = cards2.map((c) =>
                  c.id === a.id || c.id === b.id ? { ...c, matched: true, flipped: true } : c
                );
                const allDone = updated.every((c) => c.matched);
                if (allDone) {
                  setPhase("win");
                  if (timerRef.current) clearInterval(timerRef.current);
                  // Score = fewer moves = better; invert for high-score (1000 / moves)
                  const sc = Math.max(1, Math.round(1000 / newMoves));
                  saveHighScore("memory-match", sc);
                  setBestMoves(getHighScore("memory-match"));
                }
                return updated;
              } else {
                return cards2.map((c) =>
                  c.id === a.id || c.id === b.id ? { ...c, flipped: false } : c
                );
              }
            });
            lockRef.current = false;
          }, 900);
          return newMoves;
        });
        return [];
      }
      return next;
    });
  }, [phase, startGame]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* HUD */}
      <div className="flex gap-6 text-sm font-mono text-white/80">
        <span>🎯 Moves: <strong className="text-yellow-300">{moves}</strong></span>
        <span>⏱ {elapsed}s</span>
        <span>🏆 Best: <strong className="text-yellow-300">{bestMoves}</strong></span>
      </div>

      {/* Card grid */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)`, width: "min(340px, 90vw)" }}
      >
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => tap(card.id)}
            className={[
              "aspect-square rounded-2xl text-3xl flex items-center justify-center",
              "transition-all duration-200 border-2 active:scale-95",
              card.matched
                ? "border-green-400 bg-green-900/40 scale-105"
                : card.flipped
                ? "border-yellow-400 bg-yellow-900/30"
                : "border-white/10 bg-white/5 hover:bg-white/10",
            ].join(" ")}
          >
            {card.flipped || card.matched ? card.icon : "❓"}
          </button>
        ))}
      </div>

      {/* Overlay for idle/win */}
      {phase !== "playing" && (
        <div className="text-center">
          {phase === "idle" && (
            <button
              onClick={startGame}
              className="mt-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 rounded-2xl font-bold text-white text-lg transition-all active:scale-95"
            >
              🃏 Start Game
            </button>
          )}
          {phase === "win" && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-2xl font-bold text-green-400">🎉 You matched them all!</p>
              <p className="text-white/70">{moves} moves · {elapsed}s</p>
              <button
                onClick={startGame}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-400 rounded-2xl font-bold text-white transition-all active:scale-95"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      )}
      <p className="text-xs text-white/40">Flip cards and find all matching wellness pairs</p>
    </div>
  );
}
