const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const mealPlanRoutes = require('./routes/mealPlan');
const groceryRoutes = require('./routes/grocery');
const settingsRoutes = require('./routes/settings');
const recipesRoutes = require('./routes/recipes');
const choreRoutes = require('./routes/chores');
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

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Fallback: serve React app for all non-API routes
app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bell Meal Planner server running on port ${PORT}`);
  scheduler.init();
});

module.exports = app;
