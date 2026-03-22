const cron = require('node-cron');
const { generateWeeklyPlan } = require('./services/geminiService');
const { generateWeeklyChores } = require('./services/choreService');
const { getRandomSundayCandidates } = require('./services/recipeService');
const { sendWeeklyNotification, sendDailyNotification } = require('./services/notificationService');
const {
  savePlan,
  getSettings,
  getKnownMeals,
  getAverageRatings,
  getRecentMealNames,
  getChoreDefinitions,
  saveChorePlan,
  getRecentChoreAssignments,
  getCurrentPlan,
  getCurrentChorePlan,
} = require('./services/dataService');

let scheduledTask = null;
let dailyTask = null;

function buildCronExpression(settings) {
  // e.g. Saturday at 12:00 → "0 12 * * 6"
  const dayMap = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
  };
  const dow = dayMap[settings.scheduleDay] ?? 6;
  const hour = settings.scheduleHour ?? 12;
  const min = settings.scheduleMinute ?? 0;
  return `${min} ${hour} * * ${dow}`;
}

async function runGeneration() {
  console.log('[Scheduler] Starting meal plan generation...');
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
    console.log('[Scheduler] Meal plan generated and saved successfully.');

    // Also generate chore plan
    let chorePlan = null;
    try {
      const choreData = getChoreDefinitions();
      const recentAssignments = getRecentChoreAssignments();
      chorePlan = await generateWeeklyChores({
        choreDefinitions: choreData.choreDefinitions || [],
        familyMembers: choreData.familyMembers || [],
        preferences: choreData.chorePreferences || {},
        recentAssignments,
        notes: choreData.notes || {},
      });
      saveChorePlan(chorePlan);
      console.log('[Scheduler] Chore plan generated and saved successfully.');
    } catch (err) {
      console.error('[Scheduler] Chore generation failed:', err.message);
    }

    sendWeeklyNotification(plan, chorePlan, settings).catch(err =>
      console.error('[Notify] Weekly email failed:', err.message)
    );
    return plan;
  } catch (err) {
    console.error('[Scheduler] Failed to generate meal plan:', err.message);
    throw err;
  }
}

function init() {
  const settings = getSettings();

  // ── Weekly generation cron ────────────────────────────────────────────────
  const cronExpr = buildCronExpression(settings);
  console.log(`[Scheduler] Scheduling meal plan generation: ${cronExpr} (${settings.scheduleDay} at ${settings.scheduleHour}:${String(settings.scheduleMinute).padStart(2, '0')})`);

  if (scheduledTask) scheduledTask.stop();

  scheduledTask = cron.schedule(cronExpr, () => {
    runGeneration().catch(err => console.error('[Scheduler] Cron error:', err));
  });

  // ── Daily email cron ──────────────────────────────────────────────────────
  if (dailyTask) dailyTask.stop();
  dailyTask = null;

  if (settings.dailyEmailEnabled && settings.notificationEmails?.length > 0) {
    const dHour = settings.dailyEmailHour ?? 16;
    const dMin = settings.dailyEmailMinute ?? 0;
    const dailyCron = `${dMin} ${dHour} * * *`;
    console.log(`[Scheduler] Scheduling daily email: ${dailyCron} (every day at ${String(dHour).padStart(2, '0')}:${String(dMin).padStart(2, '0')})`);

    dailyTask = cron.schedule(dailyCron, () => {
      const s = getSettings();
      if (!s.dailyEmailEnabled) return;
      const mealPlan = getCurrentPlan();
      const chorePlan = getCurrentChorePlan();
      sendDailyNotification(mealPlan, chorePlan, s).catch(err =>
        console.error('[Notify] Daily email failed:', err.message)
      );
    });
  } else {
    console.log('[Scheduler] Daily email disabled or no recipients configured.');
  }
}

function reschedule() {
  init();
}

module.exports = { init, reschedule, runGeneration };
