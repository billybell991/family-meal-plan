export const GAME_REGISTRY = [
  {
    id: "bell-dash",
    name: "Bell Dash",
    emoji: "💨",
    tagline: "Jump and dash to avoid obstacles.",
    controls: "Tap to jump",
    stickerThreshold: 0,
    cost: 1,
  },
  {
    id: "zen-flap",
    name: "Zen Flap",
    emoji: "🧘",
    tagline: "Flap your way to zen.",
    controls: "Tap to flap",
    stickerThreshold: 5,
    cost: 1,
  },
  {
    id: "bellris",
    name: "Bellris",
    emoji: "🧱",
    tagline: "A classic falling block game.",
    controls: "Swipe to move, tap to rotate",
    stickerThreshold: 10,
    cost: 2,
  },
  {
    id: "bell-snake",
    name: "Bell Snake",
    emoji: "🐍",
    tagline: "Eat the bells, don't eat your tail.",
    controls: "Swipe to change direction",
    stickerThreshold: 15,
    cost: 2,
  },
  {
    id: "crossy-bell",
    name: "Crossy Bell",
    emoji: "🐔",
    tagline: "Why did the bell cross the road?",
    controls: "Tap to hop forward, swipe to move",
    stickerThreshold: 20,
    cost: 3,
  },
  {
    id: "memory-match",
    name: "Memory Match",
    emoji: "🧠",
    tagline: "Match the pairs.",
    controls: "Tap to reveal",
    stickerThreshold: 25,
    cost: 1,
  },
  {
    id: "brick-buster",
    name: "Brick Buster",
    emoji: "💥",
    tagline: "Break all the bricks.",
    controls: "Drag to move paddle",
    stickerThreshold: 30,
    cost: 2,
  },
  {
    id: "asteroid-belt",
    name: "Asteroid Belt",
    emoji: "☄️",
    tagline: "Dodge the asteroids.",
    controls: "Drag to move ship",
    stickerThreshold: 35,
    cost: 3,
  },
  {
    id: "whack-a-junk",
    name: "Whack-a-Junk",
    emoji: "🔨",
    tagline: "Whack the junk food.",
    controls: "Tap to whack",
    stickerThreshold: 40,
    cost: 1,
  },
  {
    id: "bubble-pop",
    name: "Bubble Pop",
    emoji: "💧",
    tagline: "Pop the bubbles.",
    controls: "Tap to pop",
    stickerThreshold: 45,
    cost: 1,
  },
  {
    id: "bells-2048",
    name: "Bells 2048",
    emoji: "🔢",
    tagline: "Combine the bells to get to 2048.",
    controls: "Swipe to move tiles",
    stickerThreshold: 50,
    cost: 3,
  },
  {
    id: "bell-pong",
    name: "Bell Pong",
    emoji: "🏓",
    tagline: "A classic game of pong.",
    controls: "Drag to move paddle",
    stickerThreshold: 55,
    cost: 2,
  },
];

export const getHighScore = (gameId) => {
  const scores = JSON.parse(localStorage.getItem('highScores')) || {};
  return scores[gameId] || 0;
};

export const saveHighScore = (gameId, score) => {
  const scores = JSON.parse(localStorage.getItem('highScores')) || {};
  const currentHighScore = scores[gameId] || 0;
  if (score > currentHighScore) {
    scores[gameId] = score;
    localStorage.setItem('highScores', JSON.stringify(scores));
  }
};

export function isGameUnlocked(game, stickerCount, adminMode) {
  if (adminMode) return true;
  return stickerCount >= game.stickerThreshold;
}
