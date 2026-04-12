const express = require('express');
const router = express.Router();
const { parse } = require('csv-parse/sync');
const {
  getSettings,
  saveSettings,
  getRatings,
  addRating,
  getAverageRatings,
  getKnownMeals,
  saveKnownMeals,
  getCurrentPlan,
  getCurrentChorePlan,
  getBugs,
  addBug,
  resetStickers,
} = require('../services/dataService');
const { sendWeeklyNotification, sendDailyNotification } = require('../services/notificationService');
const scheduler = require('../scheduler');

// GET /api/settings
router.get('/', (req, res) => {
  res.json(getSettings());
});

// PUT /api/settings
router.put('/', (req, res) => {
  try {
    const updated = saveSettings(req.body);
    // Reschedule cron if schedule changed
    scheduler.reschedule();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/settings/send-notification — send combined weekly email
router.post('/send-notification', async (req, res) => {
  try {
    const mealPlan = getCurrentPlan();
    const chorePlan = getCurrentChorePlan();
    if (!mealPlan && !chorePlan) return res.status(404).json({ error: 'No meal or chore plan exists to send.' });
    const settings = getSettings();
    if (!settings.notificationEmails || settings.notificationEmails.length === 0) {
      return res.status(400).json({ error: 'No notification emails configured.' });
    }
    await sendWeeklyNotification(mealPlan, chorePlan, settings);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email: ' + err.message });
  }
});

// POST /api/settings/send-daily-notification — send today's daily email
router.post('/send-daily-notification', async (req, res) => {
  try {
    const mealPlan = getCurrentPlan();
    const chorePlan = getCurrentChorePlan();
    if (!mealPlan && !chorePlan) return res.status(404).json({ error: 'No meal or chore plan exists to send.' });
    const settings = getSettings();
    if (!settings.notificationEmails || settings.notificationEmails.length === 0) {
      return res.status(400).json({ error: 'No notification emails configured.' });
    }
    await sendDailyNotification(mealPlan, chorePlan, settings);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send daily email: ' + err.message });
  }
});

// GET /api/settings/ratings
router.get('/ratings', (req, res) => {
  res.json(getAverageRatings());
});

// POST /api/settings/ratings — add a rating
router.post('/ratings', (req, res) => {
  try {
    const { meal, member, stars } = req.body;
    if (!meal || !member || !stars) {
      return res.status(400).json({ error: 'meal, member, and stars are required' });
    }
    addRating(meal, member, Number(stars));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/settings/meals — get the known meals list
router.get('/meals', (req, res) => {
  res.json(getKnownMeals());
});

// POST /api/settings/meals/csv — upload CSV to populate meals list
router.post('/meals/csv', express.text({ type: 'text/csv', limit: '1mb' }), (req, res) => {
  try {
    const csvText = req.body;
    if (!csvText) return res.status(400).json({ error: 'No CSV data provided' });

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Expect columns: name, type (meal|side), link (optional), notes (optional)
    const meals = records
      .filter(r => (r.type || 'meal').toLowerCase() !== 'side')
      .map(r => ({ name: r.name || r.Food || r.food || '', link: r.link || r.Link || null, notes: r.notes || r.Notes || null }))
      .filter(r => r.name);

    const sides = records
      .filter(r => (r.type || '').toLowerCase() === 'side')
      .map(r => ({ name: r.name || r.Food || r.food || '' }))
      .filter(r => r.name);

    saveKnownMeals({ meals, sides });
    res.json({ success: true, mealsCount: meals.length, sidesCount: sides.length });
  } catch (err) {
    res.status(400).json({ error: 'CSV parse error: ' + err.message });
  }
});

// POST /api/settings/meals — manually add a meal
router.post('/meals', (req, res) => {
  try {
    const { name, type = 'meal', link = null, notes = null } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const data = getKnownMeals();
    const entry = { name, link, notes };

    if (type === 'side') {
      data.sides = data.sides || [];
      data.sides.push(entry);
    } else {
      data.meals = data.meals || [];
      data.meals.push(entry);
    }

    saveKnownMeals(data);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/settings/bugs
router.get('/bugs', (req, res) => {
  try {
    res.json(getBugs());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/bugs
router.post('/bugs', (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Bug text is required' });
    }
    addBug(text);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/reset-stickers — nuclear reset of all stickers for all users
router.post('/reset-stickers', (req, res) => {
  try {
    const users = resetStickers();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
