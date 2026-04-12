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

// POST /api/chores/definitions/chore — add a single chore to the library
router.post('/definitions/chore', (req, res) => {
  try {
    const { name, category, difficulty, estimatedMinutes, frequency, ageMin, specificDay } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Chore name is required.' });
    const data = getChoreDefinitions();
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (data.choreDefinitions.some(c => c.id === id)) {
      return res.status(409).json({ error: 'A chore with that name already exists.' });
    }
    const chore = {
      id,
      name: name.trim(),
      category: category || 'rooms',
      difficulty: difficulty || 'easy',
      estimatedMinutes: Number(estimatedMinutes) || 15,
      frequency: frequency || 'weekly',
      ageMin: Number(ageMin) || 10,
      ...(specificDay ? { specificDay } : {}),
    };
    data.choreDefinitions.push(chore);
    saveChoreDefinitions(data);
    res.json(chore);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/chores/definitions/chore/:id — update a chore definition
router.put('/definitions/chore/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = getChoreDefinitions();
    const idx = data.choreDefinitions.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Chore not found.' });
    const { name, category, difficulty, estimatedMinutes, frequency, ageMin, specificDay } = req.body;
    if (name !== undefined) data.choreDefinitions[idx].name = name.trim();
    if (category !== undefined) data.choreDefinitions[idx].category = category;
    if (difficulty !== undefined) data.choreDefinitions[idx].difficulty = difficulty;
    if (estimatedMinutes !== undefined) data.choreDefinitions[idx].estimatedMinutes = Number(estimatedMinutes);
    if (frequency !== undefined) data.choreDefinitions[idx].frequency = frequency;
    if (ageMin !== undefined) data.choreDefinitions[idx].ageMin = Number(ageMin);
    if (specificDay !== undefined) {
      if (specificDay) {
        data.choreDefinitions[idx].specificDay = specificDay;
      } else {
        delete data.choreDefinitions[idx].specificDay;
      }
    }
    saveChoreDefinitions(data);
    res.json(data.choreDefinitions[idx]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/chores/definitions/chore/:id — remove a chore from the library
router.delete('/definitions/chore/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = getChoreDefinitions();
    const idx = data.choreDefinitions.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Chore not found.' });
    data.choreDefinitions.splice(idx, 1);
    saveChoreDefinitions(data);
    res.json({ success: true });
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
    const settings = getSettings();

    const plan = await generateWeeklyChores({
      choreDefinitions: choreData.choreDefinitions || [],
      familyMembers: choreData.familyMembers || [],
      preferences: choreData.chorePreferences || {},
      recentAssignments,
      notes: choreData.notes || {},
      choresPerPerson: settings.choresPerPerson || 2,
    });

    // Sync "Make supper" chore with meal plan cook assignments
    // Remove it entirely on takeout or leftover nights
    const mealPlan = getCurrentPlan();
    if (mealPlan?.days) {
      for (const choreDay of plan.days) {
        const mealDay = mealPlan.days.find(d => d.day === choreDay.day);
        const isMakeSupper = a => a.choreId === 'make-supper' || a.choreName?.toLowerCase().includes('make supper');

        if (mealDay?.isTakeout || mealDay?.isLeftover) {
          // No cooking needed — remove "Make supper" entirely
          choreDay.assignments = choreDay.assignments.filter(a => !isMakeSupper(a));
        } else if (mealDay?.cook) {
          for (const a of choreDay.assignments) {
            if (isMakeSupper(a)) {
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

// PATCH /api/chores/plan/day/:day/assignments — replace all assignments for a day
router.patch('/plan/day/:day/assignments', (req, res) => {
  try {
    const { day } = req.params;
    const { assignments } = req.body;
    if (!Array.isArray(assignments)) return res.status(400).json({ error: 'assignments must be an array.' });

    const plan = getCurrentChorePlan();
    if (!plan) return res.status(404).json({ error: 'No chore plan found.' });

    const dayEntry = plan.days.find(d => d.day === day);
    if (!dayEntry) return res.status(404).json({ error: `Day "${day}" not found.` });

    // Validate each assignment has required fields
    for (const a of assignments) {
      if (!a.choreId || !a.choreName || !a.assignedTo) {
        return res.status(400).json({ error: 'Each assignment must have choreId, choreName, and assignedTo.' });
      }
    }

    dayEntry.assignments = assignments.map(a => ({
      choreId: a.choreId,
      choreName: a.choreName,
      category: a.category || 'other',
      assignedTo: a.assignedTo,
      isCompleted: !!a.isCompleted,
      ...(a.completedAt ? { completedAt: a.completedAt } : {}),
    }));

    // Sort by person name
    dayEntry.assignments.sort((a, b) => a.assignedTo.localeCompare(b.assignedTo));

    writeChorePlanDirect(plan);
    res.json(plan);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
