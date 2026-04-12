"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { Lock, X, ChevronRight } from "lucide-react";

// Lazy-load game components
const BellDash   = lazy(() => import("./BellDash"));
const ZenFlap    = lazy(() => import("./ZenFlap"));
const Bellris    = lazy(() => import("./Bellris"));
const BellSnake  = lazy(() => import("./BellSnake"));
const CrossyBell = lazy(() => import("./CrossyBell"));
const MemoryMatch = lazy(() => import("./MemoryMatch"));
const BrickBuster = lazy(() => import("./BrickBuster"));
const AsteroidBelt = lazy(() => import("./AsteroidBelt"));
const WhackAJunk  = lazy(() => import("./WhackAJunk"));
const BubblePop   = lazy(() => import("./BubblePop"));
const Bells2048   = lazy(() => import("./Bells2048"));
const BellPong    = lazy(() => import("./BellPong"));
const CraveCracker = lazy(() => import("./CraveCracker"));

const GAME_COMPONENTS = {
  "bell-dash":    BellDash,
  "zen-flap":     ZenFlap,
  "bellris":      Bellris,
  "bell-snake":   BellSnake,
  "crossy-bell":  CrossyBell,
  "memory-match": MemoryMatch,
  "brick-buster": BrickBuster,
  "asteroid-belt": AsteroidBelt,
  "whack-a-junk": WhackAJunk,
  "bubble-pop":   BubblePop,
  "bells-2048":   Bells2048,
  "bell-pong":    BellPong,
  "crave-cracker": CraveCracker,
};

// Game Card
function GameCard({ game, unlocked, highScore, onPlay }) {
  return (
    <button
      onClick={unlocked ? onPlay : undefined}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-200 text-left ${
        game.image && unlocked ? "flex flex-col" : "flex flex-col gap-1 p-3"
      } ${
        unlocked
          ? "border-slate-200 hover:scale-[1.02] hover:border-blue-300/30 active:scale-[0.98] cursor-pointer bg-white shadow-sm"
          : "border-slate-200/50 opacity-50 cursor-default bg-slate-100"
      }`}
    >
      {/* Content */}
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{game.emoji}</span>
          <div>
            <p className="font-bold text-sm text-slate-800 leading-tight">
              {game.name}
            </p>
          </div>
        </div>
        {unlocked ? (
          <ChevronRight size={14} className="text-slate-500 mt-1 flex-shrink-0" />
        ) : (
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <Lock size={12} className="text-slate-500" />
          </div>
        )}
      </div>

      <p className="relative text-xs text-slate-500 leading-tight">{game.tagline}</p>

      {unlocked && (
        <div className="relative flex items-center gap-2 mt-0.5">
          <span className="text-xs font-mono text-amber-600">
            {highScore > 0 ? `🏆 ${highScore}` : "No score yet"}
          </span>
        </div>
      )}

      {!unlocked && (
        <p className="relative text-xs text-slate-500 font-mono">
          Collect {game.stickerThreshold} stickers to unlock
        </p>
      )}
    </button>
  );
}

// Game Modal
function GameModal({ game, onClose }) {
  const GameComponent = GAME_COMPONENTS[game.id];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50" style={{ touchAction: "none" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0" style={{ touchAction: "auto" }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{game.emoji}</span>
          <div>
            <p className="font-bold text-slate-800 text-sm">{game.name}</p>
            <p className="text-xs text-slate-500 font-mono">{game.controls}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 transition-colors"
        >
          <X size={16} className="text-slate-800" />
        </button>
      </div>

      {/* Game area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <Suspense
          fallback={
            <div className="flex items-center justify-center w-full h-full">
              <div className="text-slate-500 font-mono text-sm">Loading {game.name}…</div>
            </div>
          }
        >
          {GameComponent && <GameComponent onClose={onClose} />}
        </Suspense>
      </div>
    </div>
  );
}

// Main Client
export default function ArcadeClient({ stickerCount, adminMode, GAME_REGISTRY, getHighScore, isGameUnlocked }) {
  const [highScores, setHighScores] = useState({});
  const [activeGame, setActiveGame] = useState(null);

  // Hide bottom nav while a game is open
  useEffect(() => {
    if (activeGame) {
      document.body.classList.add("game-open");
    } else {
      document.body.classList.remove("game-open");
    }
    return () => { document.body.classList.remove("game-open"); };
  }, [activeGame]);

  // Load high scores client-side
  useEffect(() => {
    const scores = {};
    for (const game of GAME_REGISTRY) {
      scores[game.id] = getHighScore(game.id);
    }
    setHighScores(scores);
  }, [activeGame, GAME_REGISTRY, getHighScore]); // refresh after closing a game

  const unlockedGames = GAME_REGISTRY.filter((g) => isGameUnlocked(g, stickerCount, adminMode));
  const lockedGames = GAME_REGISTRY.filter((g) => !isGameUnlocked(g, stickerCount, adminMode));
  const nextUnlock = lockedGames[0];

  return (
    <>
      {/* Arcade lobby */}
      <div className="px-4 pt-2 pb-8 flex flex-col gap-4">
        {/* Unlocked games */}
        <div>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">
            🎮 Playable Now
          </p>
          <div className="grid grid-cols-1 gap-2">
            {unlockedGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                unlocked
                highScore={highScores[game.id] ?? 0}
                onPlay={() => setActiveGame(game)}
              />
            ))}
          </div>
        </div>

        {/* Locked games */}
        {lockedGames.length > 0 && !adminMode && (
          <div>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">
              🔒 Locked — Earn Stickers to Unlock
            </p>
            <div className="grid grid-cols-1 gap-2">
              {lockedGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  unlocked={false}
                  highScore={0}
                  onPlay={() => { }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Game modal */}
      {activeGame && (
        <GameModal
          game={activeGame}
          onClose={() => setActiveGame(null)}
        />
      )}
    </>
  );
}
