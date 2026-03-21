const express = require('express');
const router = express.Router();
const {
  getChoreDefinitions,
  saveChoreDefinitions,
  getCurrentChorePlan,
  getCurrentPlan,
  saveChorePlan,
  writeChorePlanDirect,
  getChoreHistory,
  deleteChorePlan,
  getRecentChoreAssignments,
  getSettings,
} = require('../services/dataService');
const { generateWeeklyChores } = require('../services/choreService');
const { sendWeeklyNotification } = require('../services/notificationService');

// GET /api/chores/definitions — get chore library & preferences
router.get('/definitions', (req, res) => {
  res.json(getChoreDefinitions());
});

// PUT /api/chores/definitions — save chore library & preferences
router.put('/definitions', (req, res) => {
  try {
    const updated = saveChoreDefinitions(req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/chores/plan — get current week's chore plan
router.get('/plan', (req, res) => {
  const plan = getCurrentChorePlan();
  if (!plan) return res.status(404).json({ error: 'No chore plan generated yet.' });
  res.json(plan);
});

// POST /api/chores/plan/generate — generate chore assignments via Gemini
router.post('/plan/generate', async (req, res) => {
  try {
    const choreData = getChoreDefinitions();
    const recentAssignments = getRecentChoreAssignments();

    const plan = await generateWeeklyChores({
      choreDefinitions: choreData.choreDefinitions || [],
      familyMembers: choreData.familyMembers || [],
      preferences: choreData.chorePreferences || {},
      recentAssignments,
      notes: choreData.notes || {},
    });

    // Sync "Make supper" chore with meal plan cook assignments
    const mealPlan = getCurrentPlan();
    if (mealPlan?.days) {
      for (const choreDay of plan.days) {
        const mealDay = mealPlan.days.find(d => d.day === choreDay.day);
        if (mealDay?.cook) {
          for (const a of choreDay.assignments) {
            if (a.choreId === 'make-supper' || a.choreName?.toLowerCase().includes('make supper')) {
              a.assignedTo = mealDay.cook;
            }
          }
        }
      }
    }

    // Sort assignments by person name within each day
    for (const choreDay of plan.days) {
      if (choreDay.assignments) {
        choreDay.assignments.sort((a, b) => a.assignedTo.localeCompare(b.assignedTo));
      }
    }

    saveChorePlan(plan);
    res.json(plan);
  } catch (err) {
    console.error('[API] Chore generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/chores/plan — delete current chore plan
router.delete('/plan', (req, res) => {
  try {
    deleteChorePlan();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/chores/plan/day/:day/complete — toggle chore completion
router.patch('/plan/day/:day/complete', (req, res) => {
  try {
    const { day } = req.params;
    const { choreId, assignedTo, isCompleted } = req.body;
    const plan = getCurrentChorePlan();
    if (!plan) return res.status(404).json({ error: 'No chore plan found.' });

    const dayEntry = plan.days.find(d => d.day === day);
    if (!dayEntry) return res.status(404).json({ error: `Day "${day}" not found.` });

    const assignment = dayEntry.assignments.find(a => a.choreId === choreId && a.assignedTo === assignedTo);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });

    assignment.isCompleted = !!isCompleted;
    if (isCompleted) {
      assignment.completedAt = new Date().toISOString();
    } else {
      delete assignment.completedAt;
    }

    writeChorePlanDirect(plan);
    res.json(plan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/chores/history — past chore plans
router.get('/history', (req, res) => {
  res.json(getChoreHistory());
});

// POST /api/chores/send-notification — send combined weekly email
router.post('/send-notification', async (req, res) => {
  try {
    const chorePlan = getCurrentChorePlan();
    const mealPlan = getCurrentPlan();
    if (!chorePlan && !mealPlan) return res.status(404).json({ error: 'No plan exists to send.' });
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

module.exports = router;
