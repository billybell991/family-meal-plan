import React, { useState } from 'react';
import achievements from '../../../data/achievements.json';
import users from '../../../data/users.json';
import ArcadeClient from '../components/games/ArcadeClient';

const GAME_REGISTRY = [
  {
    id: "bell-dash",
    name: "Craving Dash",
    tagline: "Dodge junk food, collect gems",
    emoji: "🏃",
    stickerThreshold: 0,
    controls: "Tap or Space to jump • double-jump available",
  },
  {
    id: "zen-flap",
    name: "Zen Flap",
    tagline: "Float serenely through the gaps",
    emoji: "🧘",
    stickerThreshold: 0,
    controls: "Tap or Space to flap",
  },
  {
    id: "bellris",
    name: "Dropris",
    tagline: "Stack, clear rows, breathe deep",
    emoji: "🟦",
    stickerThreshold: 5,
    controls: "← → move • ↑ rotate • ↓ soft-drop • Space hard-drop",
  },
  {
    id: "bell-snake",
    name: "Munch Snake",
    tagline: "Eat healthy icons, grow longer",
    emoji: "🐍",
    stickerThreshold: 10,
    controls: "Arrow keys or swipe to steer",
  },
  {
    id: "crossy-bell",
    name: "Hop Rush",
    tagline: "Hop across and don't get squished",
    emoji: "🐸",
    stickerThreshold: 15,
    controls: "Tap arrows or swipe to hop",
  },
  {
    id: "memory-match",
    name: "Memory Match",
    tagline: "Flip and match every wellness pair",
    emoji: "🃏",
    stickerThreshold: 20,
    controls: "Tap cards to flip them",
  },
  {
    id: "brick-buster",
    name: "Brick Buster",
    tagline: "Blast through the bricks",
    emoji: "🧱",
    stickerThreshold: 25,
    controls: "Drag or ← → to move paddle",
  },
  {
    id: "asteroid-belt",
    name: "Asteroid Belt",
    tagline: "Navigate the chaos and survive",
    emoji: "🚀",
    stickerThreshold: 30,
    controls: "← → rotate • ↑ thrust • Space shoot",
  },
  {
    id: "whack-a-junk",
    name: "Whack-a-Junk",
    tagline: "Smash the junk food, spare the fruit",
    emoji: "🔨",
    stickerThreshold: 35,
    controls: "Tap junk food to whack it",
  },
  {
    id: "bubble-pop",
    name: "Bubble Pop",
    tagline: "Aim, shoot, pop three in a row",
    emoji: "🫧",
    stickerThreshold: 40,
    controls: "Tap anywhere to aim and shoot",
  },
  {
    id: "bells-2048",
    name: "Merge 2048",
    tagline: "Slide and merge to reach 2048",
    emoji: "🔔",
    stickerThreshold: 45,
    controls: "Arrow keys or swipe to slide tiles",
  },
  {
    id: "bell-pong",
    name: "Rally",
    tagline: "Rally against the machine",
    emoji: "🏓",
    stickerThreshold: 50,
    controls: "← → or drag to move your paddle",
  },
  {
    id: "crave-cracker",
    name: "Crave Cracker",
    tagline: "Hold strong against the craving",
    emoji: "🧘",
    stickerThreshold: 2,
    controls: "Hold the button to resist",
  },
];

function isGameUnlocked(game, stickerCount, adminMode) {
  if (adminMode) return true;
  return stickerCount >= game.stickerThreshold;
}

function getHighScore(gameId) {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(`ai-meal-planner-hs-${gameId}`) ?? "0", 10);
}

const TrophyRoom = () => {
  const [selectedUser, setSelectedUser] = useState(users[0].name);
  const [view, setView] = useState('stickers'); // 'stickers' or 'arcade'

  const user = users.find(u => u.name === selectedUser);
  const earnedStickers = user ? user.stickers : [];
  const stickerCount = earnedStickers.length;
  const adminMode = user ? user.isAdmin : false;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100 gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>🏆</span> Trophy Room
        </h1>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="flex rounded-lg bg-slate-100 p-1 flex-1 sm:flex-none">
            <button
              onClick={() => setView('stickers')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${view === 'stickers' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Stickers
            </button>
            <button
              onClick={() => setView('arcade')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${view === 'arcade' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Arcade
            </button>
          </div>
          <select
            className="w-full sm:w-auto p-2 border border-slate-200 rounded-lg bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            {users.map(u => (
              <option key={u.name} value={u.name}>{u.name}'s Showcase</option>
            ))}
          </select>
        </div>
      </div>

      {view === 'stickers' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {achievements.map(achievement => {
            const isEarned = earnedStickers.includes(achievement.id);
            return (
              <div
                key={achievement.id}
                className={`relative flex flex-col items-center p-5 bg-white border border-slate-100 rounded-2xl shadow-sm transition-all duration-300 ${
                  isEarned ? 'opacity-100 hover:shadow-md hover:-translate-y-1' : 'opacity-40 grayscale sepia'
                }`}
              >
                {!isEarned && (
                  <div className="absolute top-2 right-2 text-xl opacity-50 text-slate-600">
                    🔒
                  </div>
                )}
                <div 
                  className="relative w-28 h-28 mb-4 rounded-full shadow-md border-[6px] border-white flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg, ${achievement.colorTheme?.from || '#CD7F32'}, ${achievement.colorTheme?.to || '#8B4513'})` }}
                >
                  <div className="absolute inset-1 rounded-full border-2 border-white/40 border-dashed pointer-events-none"></div>
                  <span className="text-5xl drop-shadow-md pb-1" role="img" aria-label={achievement.name}>
                    {achievement.icon || '🏆'}
                  </span>
                  {isEarned && (
                    <div className="absolute -bottom-3 bg-yellow-400 text-xs font-bold px-3 py-0.5 rounded-full border-2 border-white shadow-sm text-yellow-900 z-10 whitespace-nowrap truncate">
                      Earned!
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-slate-800 text-center mb-1 leading-tight">{achievement.name}</h3>
                <p className="text-xs text-slate-500 text-center leading-snug h-8 overflow-hidden line-clamp-2">{achievement.description}</p>
                <div className="mt-3 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded-md">
                   {achievement.tier}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'arcade' && (
        <ArcadeClient
          stickerCount={stickerCount}
          adminMode={adminMode}
          GAME_REGISTRY={GAME_REGISTRY}
          getHighScore={getHighScore}
          isGameUnlocked={isGameUnlocked}
        />
      )}
    </div>
  );
};

export default TrophyRoom;
