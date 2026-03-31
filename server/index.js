const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const mealPlanRoutes = require('./routes/mealPlan');
const groceryRoutes = require('./routes/grocery');
const settingsRoutes = require('./routes/settings');
const recipesRoutes = require('./routes/recipes');
const choreRoutes = require('./routes/chores');
const pushRoutes = require('./routes/push');
const scheduler = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Serve built React app in production
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/meal-plan', mealPlanRoutes);
app.use('/api/grocery', groceryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/chores', choreRoutes);
app.use('/api/push', pushRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const fs = require('fs');
  const pathMod = require('path');
  const dataDir = process.env.DATA_DIR || process.env.RENDER_DATA_DIR || 'unknown';
  const seedDir = pathMod.join(__dirname, '../data/seed');
  let files = [];
  try { files = fs.readdirSync(dataDir); } catch (e) { files = [e.message]; }
  let seedFiles = [];
  try { seedFiles = fs.readdirSync(seedDir); } catch (e) { seedFiles = [e.message]; }
  let mealsCheck = null;
  try {
    const mealsData = JSON.parse(fs.readFileSync(pathMod.join(dataDir, 'meals.json'), 'utf8'));
    mealsCheck = { mealsCount: (mealsData.meals || []).length, sidesCount: (mealsData.sides || []).length };
  } catch (e) { mealsCheck = { error: e.message }; }
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    dataDir,
    dataDirEnv: process.env.DATA_DIR || '(not set)',
    filesOnVolume: files,
    seedDir,
    seedDirExists: fs.existsSync(seedDir),
    seedFiles,
    mealsCheck,
  });
});

// Fallback: serve React app for all non-API routes
app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bell Meal Planner server running on port ${PORT}`);
  scheduler.init();
});

module.exports = app;
