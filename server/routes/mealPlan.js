const express = require('express');
const router = express.Router();
const {
  getCurrentPlan,
  getPlanHistory,
  updateDayInPlan,
  writePlanDirect,
  getKnownMeals,
  getAverageRatings,
  getRecentMealNames,
  getSettings,
  deletePlan,
  clearHistory,
} = require('../services/dataService');
const { generateWeeklyPlan } = require('../services/geminiService');
const { getRandomSundayCandidates } = require('../services/recipeService');
const { savePlan } = require('../services/dataService');

// GET /api/meal-plan — get current week's plan
router.get('/', (req, res) => {
  const plan = getCurrentPlan();
  if (!plan) return res.status(404).json({ error: 'No meal plan generated yet.' });
  res.json(plan);
});

// DELETE /api/meal-plan — wipe the current plan (admin/testing)
router.delete('/', (req, res) => {
  try {
    deletePlan();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/meal-plan/history — past plans
router.get('/history', (req, res) => {
  res.json(getPlanHistory());
});

// DELETE /api/meal-plan/history — clear all history
router.delete('/history', (req, res) => {
  try {
    clearHistory();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/meal-plan/day/:day/leftover — toggle leftover night for a day
router.patch('/day/:day/leftover', (req, res) => {
  try {
    const { day } = req.params;
    const { isLeftover } = req.body;
    const plan = updateDayInPlan(day, { isLeftover: !!isLeftover });
    res.json(plan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/meal-plan/generate — manually trigger AI generation
router.post('/generate', async (req, res) => {
  try {
    const settings = getSettings();
    const { meals, sides } = getKnownMeals();
    const ratings = getAverageRatings();
    const recentMeals = getRecentMealNames();
    const randomRecipes = getRandomSundayCandidates(6, recentMeals);

    const plan = await generateWeeklyPlan({
      meals,
      sides,
      allergies: settings.allergies || {},
      ratings,
      recentMeals,
      randomRecipes,
    });

    savePlan(plan);
    res.json(plan);
  } catch (err) {
    console.error('[API] Generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/meal-plan/day/:day — update a specific day
router.patch('/day/:day', (req, res) => {
  try {
    const { day } = req.params;
    const updates = req.body; // { isTakeout, meal, sides, cook, portions }
    const plan = updateDayInPlan(day, updates);
    res.json(plan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/meal-plan/day/:day/portions — adjust portions for a day
router.patch('/day/:day/portions', (req, res) => {
  try {
    const { day } = req.params;
    const { portions } = req.body;
    if (!portions || portions < 1 || portions > 20) {
      return res.status(400).json({ error: 'Portions must be between 1 and 20' });
    }
    const plan = updateDayInPlan(day, { portions });
    res.json(plan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/meal-plan/day/:day/takeout — toggle takeout for a day
router.patch('/day/:day/takeout', (req, res) => {
  try {
    const { day } = req.params;
    const { isTakeout } = req.body;
    const plan = updateDayInPlan(day, { isTakeout: !!isTakeout });
    res.json(plan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/meal-plan — replace entire plan (from frontend manual edits)
router.put('/', (req, res) => {
  try {
    const plan = req.body;
    if (!plan || !plan.days) return res.status(400).json({ error: 'Invalid plan format' });
    writePlanDirect(plan);
    res.json(plan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
