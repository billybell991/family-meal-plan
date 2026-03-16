const cron = require('node-cron');
const { generateWeeklyPlan } = require('./services/geminiService');
const { getRandomSundayCandidates } = require('./services/recipeService');
const {
  savePlan,
  getSettings,
  getKnownMeals,
  getAverageRatings,
  getRecentMealNames,
} = require('./services/dataService');

let scheduledTask = null;

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
    return plan;
  } catch (err) {
    console.error('[Scheduler] Failed to generate meal plan:', err.message);
    throw err;
  }
}

function init() {
  const settings = getSettings();
  const cronExpr = buildCronExpression(settings);
  console.log(`[Scheduler] Scheduling meal plan generation: ${cronExpr} (${settings.scheduleDay} at ${settings.scheduleHour}:${String(settings.scheduleMinute).padStart(2, '0')})`);

  if (scheduledTask) scheduledTask.stop();

  scheduledTask = cron.schedule(cronExpr, () => {
    runGeneration().catch(err => console.error('[Scheduler] Cron error:', err));
  });
}

function reschedule() {
  init();
}

module.exports = { init, reschedule, runGeneration };
