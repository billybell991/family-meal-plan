const fs = require('fs');
const path = require('path');
const achievements = require('../data/achievements.json');

const outDir = path.join(__dirname, 'public', 'stickers');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Ensure the map uses valid string definitions. Sometimes UTF-8 emojis truncate inside create_file depending on underlying node version, so using explicit code points:
const getEmoji = (id) => {
  if (id.includes('sous-chef')) return '\u{1F468}\u{200D}\u{1F373}'; // Chef
  if (id.includes('iron-chef')) return '\u{1F373}'; // Egg in pan
  if (id.includes('dust-bunny')) return '\u{1F9F9}'; // Broom
  if (id.includes('dish-dynasty')) return '\u{1F37D}\u{FE0F}'; // Plate
  if (id.includes('vacuum-voyager')) return '\u{1F6F8}'; // UFO
  if (id.includes('early-bird')) return '\u{1F304}'; // Sunrise
  if (id.includes('night-owl')) return '\u{1F989}'; // Owl
  if (id.includes('sunday-savior')) return '\u{1F9B8}'; // Superhero
  if (id.includes('flavor-profile')) return '\u{1F445}'; // Tongue
  if (id.includes('chore-streak')) return '\u{26A1}'; // Zap
  if (id.includes('team-player')) return '\u{1F91D}'; // Handshake
  if (id.includes('planner-pro')) return '\u{1F9E0}'; // Brain 
  if (id.includes('five-star-meal')) return '\u{2B50}'; // Star
  if (id.includes('variety-voyager')) return '\u{1F957}'; // Salad
  if (id.includes('game-time-champ')) return '\u{1F947}'; // 1st medal
  if (id.includes('first-game')) return '\u{1F579}\u{FE0F}'; // Joystick
  if (id.includes('high-scorer')) return '\u{1F3C6}'; // Trophy
  if (id.includes('completionist')) return '\u{1F451}'; // Crown
  return '\u{1F3C5}'; // Sports medal
};

const getColor = (tier) => {
  if (tier === 'Bronze') return ['#CD7F32', '#A0522D'];
  if (tier === 'Silver') return ['#E0E0E0', '#808080'];
  if (tier === 'Gold') return ['#FFD700', '#DAA520'];
  if (tier === 'Platinum') return ['#E5E4E2', '#696969'];
  return ['#FFD700', '#DAA520'];
};

achievements.forEach(ach => {
  const emoji = getEmoji(ach.id);
  const [colorA, colorB] = getColor(ach.tier);
  
  const svg = `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${ach.id}-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colorA}" />
          <stop offset="100%" stop-color="${colorB}" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="90" fill="url(#${ach.id}-grad)" style="filter:drop-shadow(0px 4px 5px rgba(0,0,0,0.3));" stroke="#fff" stroke-width="8"/>
      <circle cx="100" cy="100" r="75" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="4" stroke-dasharray="10 5"/>
      <text x="100" y="125" font-size="80" text-anchor="middle" dominant-baseline="central">${emoji}</text>
    </svg>`;
    
  fs.writeFileSync(path.join(outDir, `${ach.id}.svg`), svg, 'utf8'); 
});
console.log('Stickers generated correctly!');
