const fs = require('fs');
const path = require('path');
const achievements = require('./data/achievements.json');

const outDir = path.join(__dirname, 'client', 'public', 'stickers');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const getEmoji = (id, category) => {
  if (id.includes('sous-chef')) return '?????';
  if (id.includes('iron-chef')) return '??';
  if (id.includes('dust-bunny')) return '??';
  if (id.includes('dish-dynasty')) return '???';
  if (id.includes('vacuum-voyager')) return '??';
  if (id.includes('early-bird')) return '??';
  if (id.includes('night-owl')) return '??';
  if (id.includes('sunday-savior')) return '??';
  if (id.includes('flavor-profile')) return '??';
  if (id.includes('chore-streak')) return '?';
  if (id.includes('team-player')) return '??';
  if (id.includes('planner-pro')) return '??';
  if (id.includes('five-star-meal')) return '?';
  if (id.includes('variety-voyager')) return '??';
  if (id.includes('game-time-champ')) return '??';
  if (id.includes('first-game')) return '???';
  if (id.includes('high-scorer')) return '??';
  if (id.includes('completionist')) return '??';
  return '??';
};

const getColor = (tier) => {
  if (tier === 'Bronze') return ['#CD7F32', '#A0522D'];
  if (tier === 'Silver') return ['#E0E0E0', '#808080'];
  if (tier === 'Gold') return ['#FFD700', '#DAA520'];
  if (tier === 'Platinum') return ['#E5E4E2', '#696969'];
  return ['#FFD700', '#DAA520'];
};

achievements.forEach(ach => {
  const emoji = getEmoji(ach.id, ach.category);
  const [colorA, colorB] = getColor(ach.tier);
  
  const svg = 
    \<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="\-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="\" />
          <stop offset="100%" stop-color="\" />
        </linearGradient>
        <filter id="\-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" flood-opacity="0.3"/>
        </filter>
      </defs>
      <circle cx="100" cy="100" r="90" fill="url(#\-grad)" filter="url(#\-shadow)" stroke="#fff" stroke-width="8"/>
      <circle cx="100" cy="100" r="75" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="4" stroke-dasharray="10 5"/>
      <text x="100" y="125" font-size="80" text-anchor="middle" dominant-baseline="central">\</text>
    </svg>\;
    
  fs.writeFileSync(path.join(outDir, \\.png\), svg, 'utf8'); // fake png extension but valid SVG content 
  // Wait! Browsers block .png extension containing SVG if it strictly checks mime in img tag. No, mostly Vite serves them as raw.
  // Better yet, I'll switch achievements.json back to .svg and write out actual svgs!
  
});
console.log('Stickers generated!');
