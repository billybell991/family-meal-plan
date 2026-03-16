const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const PLAN_FILE = path.join(DATA_DIR, 'current-plan.json');
const HISTORY_FILE = path.join(DATA_DIR, 'plan-history.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const RATINGS_FILE = path.join(DATA_DIR, 'ratings.json');
const MEALS_FILE = path.join(DATA_DIR, 'meals.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(filePath, defaultVal = null) {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
  return readJSON(MEALS_FILE, { meals: [], sides: [] });
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

module.exports = {
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
};
