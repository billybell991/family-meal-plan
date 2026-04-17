const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || process.env.RENDER_DATA_DIR || path.join(__dirname, '../../data');
const SEED_DIR = path.join(__dirname, '../../data/seed');

// Startup diagnostics
console.log('[DataService] DATA_DIR:', DATA_DIR);
console.log('[DataService] SEED_DIR:', SEED_DIR);
console.log('[DataService] DATA_DIR env:', process.env.DATA_DIR || '(not set)');
console.log('[DataService] DATA_DIR exists:', fs.existsSync(DATA_DIR));
if (fs.existsSync(DATA_DIR)) {
  console.log('[DataService] DATA_DIR contents:', fs.readdirSync(DATA_DIR));
}

const PLAN_FILE = path.join(DATA_DIR, 'current-plan.json');
const HISTORY_FILE = path.join(DATA_DIR, 'plan-history.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const RATINGS_FILE = path.join(DATA_DIR, 'ratings.json');
const MEALS_FILE = path.join(DATA_DIR, 'meals.json');
const BUGS_FILE = path.join(DATA_DIR, 'bugs.json');
const CHORES_FILE = path.join(DATA_DIR, 'chores.json');
const CHORE_PLAN_FILE = path.join(DATA_DIR, 'current-chore-plan.json');
const CHORE_HISTORY_FILE = path.join(DATA_DIR, 'chore-history.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Copy seed data files to data dir if they don't exist or are empty/corrupt
function seedIfNeeded() {
  ensureDataDir();
  if (!fs.existsSync(SEED_DIR)) return;
  const seedFiles = fs.readdirSync(SEED_DIR).filter(f => f.endsWith('.json'));
  for (const file of seedFiles) {
    const target = path.join(DATA_DIR, file);
    let needsSeed = !fs.existsSync(target);
    // Also re-seed if the file is empty or has no meaningful data
    if (!needsSeed && file === 'meals.json') {
      try {
        const data = JSON.parse(fs.readFileSync(target, 'utf8'));
        if (!data.meals || data.meals.length === 0) needsSeed = true;
      } catch { needsSeed = true; }
    }
    if (!needsSeed && file === 'chores.json') {
      try {
        const data = JSON.parse(fs.readFileSync(target, 'utf8'));
        if (!data.choreDefinitions || data.choreDefinitions.length === 0) needsSeed = true;
      } catch { needsSeed = true; }
    }
    if (needsSeed) {
      fs.copyFileSync(path.join(SEED_DIR, file), target);
      console.log(`Seeded ${file} from seed data`);
    }
  }
}

seedIfNeeded();
console.log('[DataService] After seed, DATA_DIR contents:', fs.readdirSync(DATA_DIR));
console.log('[DataService] SEED_DIR exists:', fs.existsSync(SEED_DIR));
if (fs.existsSync(SEED_DIR)) console.log('[DataService] SEED_DIR contents:', fs.readdirSync(SEED_DIR));

function readJSON(filePath, defaultVal = null) {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    // Strip BOM if present (common when files are edited on Windows)
    const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function writeJSON(filePath, data) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ── Meal Plan ─────────────────────────────────────────────────────────────────

function getCurrentPlan() {
  return readJSON(PLAN_FILE, null);
}

function savePlan(plan) {
  writeJSON(PLAN_FILE, plan);
  // Also append to history
  const history = readJSON(HISTORY_FILE, []);
  history.unshift({ savedAt: new Date().toISOString(), weekOf: plan.weekOf, plan });
  // Keep last 12 weeks
  history.splice(12);
  writeJSON(HISTORY_FILE, history);
}

function updateDayInPlan(dayName, updates) {
  const plan = getCurrentPlan();
  if (!plan) throw new Error('No plan found');
  const day = plan.days.find(d => d.day === dayName);
  if (!day) throw new Error(`Day "${dayName}" not found`);
  Object.assign(day, updates);

  // Clear removed-grocery tracking when a meal changes so new ingredients show up
  if (updates.meal || updates.sides !== undefined) {
    plan.removedGroceryItems = (plan.removedGroceryItems || []).filter(item => {
      // Only clear removals that were for the changed day's old ingredients
      // Keep removals for other days intact — simplest: clear all for this day
      const oldItems = (plan.groceryItems || []).filter(gi => gi.forDay === dayName);
      return !oldItems.some(gi => gi.item.toLowerCase() === item.toLowerCase());
    });
  }

  writePlanDirect(plan);
  return plan;
}

function deletePlan() {
  if (fs.existsSync(PLAN_FILE)) fs.unlinkSync(PLAN_FILE);
}

function clearHistory() {
  writeJSON(HISTORY_FILE, []);
}

function writePlanDirect(plan) {
  writeJSON(PLAN_FILE, plan);
}

function getPlanHistory() {
  return readJSON(HISTORY_FILE, []);
}

// ── Settings ──────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  familyMembers: ['Mom', 'Dad', 'Maya', 'Maddy'],
  allergies: {
    Mom: [],
    Dad: [],
    Maya: [],
    Maddy: [],
  },
  scheduleDay: 'Saturday',
  scheduleHour: 12,
  scheduleMinute: 0,
  takeoutDay: 'Wednesday',
  defaultPortions: 4,
  dailyEmailEnabled: false,
  dailyEmailHour: 16,
  dailyEmailMinute: 0,
  notificationEmails: [],
  memberEmails: { Mom: '', Dad: '', Maya: '', Maddy: '' },
  choresPerPerson: 2,
};

function getSettings() {
  return readJSON(SETTINGS_FILE, DEFAULT_SETTINGS);
}

function saveSettings(settings) {
  writeJSON(SETTINGS_FILE, settings);
  return settings;
}

// ── Ratings ───────────────────────────────────────────────────────────────────

function getRatings() {
  return readJSON(RATINGS_FILE, []);
}

function addRating(mealName, memberName, stars) {
  if (stars < 1 || stars > 5) throw new Error('Stars must be 1–5');
  const ratings = getRatings();
  ratings.push({
    meal: mealName,
    member: memberName,
    stars,
    ratedAt: new Date().toISOString(),
  });
  writeJSON(RATINGS_FILE, ratings);
  return ratings;
}

function getAverageRatings() {
  const ratings = getRatings();
  const map = {};
  for (const r of ratings) {
    if (!map[r.meal]) map[r.meal] = { total: 0, count: 0 };
    map[r.meal].total += r.stars;
    map[r.meal].count++;
  }
  return Object.entries(map).map(([meal, { total, count }]) => ({
    meal,
    avgRating: total / count,
    ratingCount: count,
  })).sort((a, b) => b.avgRating - a.avgRating);
}

// ── Known Meals (from CSV upload or manual) ───────────────────────────────────

function getKnownMeals() {
  const data = readJSON(MEALS_FILE, { meals: [], sides: [] });
  // If the data file is empty/corrupt, fall back to seed data
  if ((!data.meals || data.meals.length === 0) && fs.existsSync(path.join(SEED_DIR, 'meals.json'))) {
    const seed = readJSON(path.join(SEED_DIR, 'meals.json'), { meals: [], sides: [] });
    if (seed.meals && seed.meals.length > 0) {
      // Persist the seed data so this only happens once
      writeJSON(MEALS_FILE, seed);
      return seed;
    }
  }
  return data;
}

function saveKnownMeals(data) {
  writeJSON(MEALS_FILE, data);
  return data;
}

// ── Recent meals (from last 2 plan weeks) ─────────────────────────────────────

function getRecentMealNames() {
  const history = readJSON(HISTORY_FILE, []);
  const recent = history.slice(0, 2); // Last 2 weeks
  const names = new Set();
  for (const entry of recent) {
    for (const day of (entry.plan?.days || [])) {
      if (day.meal?.name) names.add(day.meal.name);
    }
  }
  return [...names];
}

// ── Chores ────────────────────────────────────────────────────────────────────

function getChoreDefinitions() {
  return readJSON(CHORES_FILE, { choreDefinitions: [], familyMembers: [], chorePreferences: {}, notes: {} });
}

function saveChoreDefinitions(data) {
  writeJSON(CHORES_FILE, data);
  return data;
}

function getCurrentChorePlan() {
  return readJSON(CHORE_PLAN_FILE, null);
}

function saveChorePlan(plan) {
  writeJSON(CHORE_PLAN_FILE, plan);
  // Append to history
  const history = readJSON(CHORE_HISTORY_FILE, []);
  history.unshift({ savedAt: new Date().toISOString(), weekOf: plan.weekOf, plan });
  history.splice(12);
  writeJSON(CHORE_HISTORY_FILE, history);
}

function writeChorePlanDirect(plan) {
  writeJSON(CHORE_PLAN_FILE, plan);
}

function getChoreHistory() {
  return readJSON(CHORE_HISTORY_FILE, []);
}

function deleteChorePlan() {
  if (fs.existsSync(CHORE_PLAN_FILE)) fs.unlinkSync(CHORE_PLAN_FILE);
}

function getRecentChoreAssignments() {
  const history = readJSON(CHORE_HISTORY_FILE, []);
  const recent = history.slice(0, 4);
  const assignments = [];
  for (const entry of recent) {
    for (const day of (entry.plan?.days || [])) {
      for (const assignment of (day.assignments || [])) {
        assignments.push({ ...assignment, day: day.day });
      }
    }
  }
  return assignments;
}

function getBugs() {
  if (fs.existsSync(BUGS_FILE)) {
    return JSON.parse(fs.readFileSync(BUGS_FILE, 'utf8'));
  }
  return [];
}

function addBug(text) {
  const bugs = getBugs();
  bugs.push({ id: Date.now(), text, date: new Date().toISOString(), status: 'open' });
  fs.writeFileSync(BUGS_FILE, JSON.stringify(bugs, null, 2));
}

// ── Users / Stickers ──────────────────────────────────────────────────────────
function getUsers() {
  return readJSON(USERS_FILE, []);
}

function resetStickers() {
  const users = getUsers();
  for (const user of users) {
    user.stickers = [];
  }
  writeJSON(USERS_FILE, users);
  return users;
}

module.exports = {
  getUsers,
  resetStickers,
  getBugs,
  addBug,
  getCurrentPlan,
  savePlan,
  updateDayInPlan,
  writePlanDirect,
  getPlanHistory,
  getSettings,
  saveSettings,
  getRatings,
  addRating,
  getAverageRatings,
  getKnownMeals,
  saveKnownMeals,
  getRecentMealNames,
  deletePlan,
  clearHistory,
  getChoreDefinitions,
  saveChoreDefinitions,
  getCurrentChorePlan,
  saveChorePlan,
  writeChorePlanDirect,
  getChoreHistory,
  deleteChorePlan,
  getRecentChoreAssignments,
};
