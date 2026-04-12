const cron = require('node-cron');
const { generateWeeklyPlan } = require('./services/geminiService');
const { generateWeeklyChores } = require('./services/choreService');
const { getRandomSundayCandidates } = require('./services/recipeService');
const { sendWeeklyNotification, sendDailyNotification, sendDailyNotificationForMembers } = require('./services/notificationService');
const { sendPushToAll } = require('./services/pushService');
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
let dailyTasks = [];

async function retryWithBackoff(fn, { maxRetries = 5, baseDelay = 30000, label = 'operation' } = {}) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.status || err.statusCode;
      const isRetryable = status === 503 || status === 429 || status === 500;
      if (!isRetryable || attempt === maxRetries) {
        console.error(`[Retry] ${label} failed after ${attempt} attempt(s): ${err.message}`);
        throw err;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1); // 30s, 60s, 120s, 240s, 480s
      console.warn(`[Retry] ${label} attempt ${attempt}/${maxRetries} failed (${status}). Retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

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

    const plan = await retryWithBackoff(
      () => generateWeeklyPlan({
        meals,
        sides,
        allergies: settings.allergies || {},
        ratings,
        recentMeals,
        randomRecipes,
      }),
      { label: 'Meal plan generation' }
    );

    savePlan(plan);
    console.log('[Scheduler] Meal plan generated and saved successfully.');

    // Also generate chore plan
    let chorePlan = null;
    try {
      const choreData = getChoreDefinitions();
      const recentAssignments = getRecentChoreAssignments();
      chorePlan = await retryWithBackoff(
        () => generateWeeklyChores({
          choreDefinitions: choreData.choreDefinitions || [],
          familyMembers: choreData.familyMembers || [],
          preferences: choreData.chorePreferences || {},
          recentAssignments,
          notes: choreData.notes || {},
          choresPerPerson: settings.choresPerPerson || 2,
        }),
        { label: 'Chore plan generation' }
      );
      saveChorePlan(chorePlan);
      console.log('[Scheduler] Chore plan generated and saved successfully.');
    } catch (err) {
      console.error('[Scheduler] Chore generation failed:', err.message);
    }

    sendWeeklyNotification(plan, chorePlan, settings).catch(err =>
      console.error('[Notify] Weekly email failed:', err.message)
    );

    // Push notification for new plan
    sendPushToAll(
      '📋 New Weekly Plan!',
      'Your meal plan and chore assignments for this week are ready.',
      { url: '/', tag: 'weekly-plan' }
    ).catch(err => console.error('[Notify] Weekly push failed:', err.message));

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

  if (scheduledTask) scheduledTask.destroy();

  scheduledTask = cron.schedule(cronExpr, () => {
    runGeneration().catch(err => console.error('[Scheduler] Cron error:', err));
  }, { timezone: 'America/Toronto' });

  // ── Daily email cron(s) — one per unique send time ────────────────────────
  dailyTasks.forEach(t => t.destroy());
  dailyTasks = [];

  if (settings.dailyEmailEnabled) {
    const memberEmails = settings.memberEmails || {};
    const memberEmailHours = settings.memberEmailHours || {};
    const memberEmailMinutes = settings.memberEmailMinutes || {};
    const defaultHour = settings.dailyEmailHour ?? 16;
    const defaultMinute = settings.dailyEmailMinute ?? 0;

    // Group members-with-emails by their send time
    const timeGroups = {}; // "H:M" -> { hour, minute, members[] }
    for (const [member, email] of Object.entries(memberEmails)) {
      if (!email?.trim()) continue;
      const h = memberEmailHours[member] ?? defaultHour;
      const m = memberEmailMinutes[member] ?? defaultMinute;
      const key = `${h}:${m}`;
      if (!timeGroups[key]) timeGroups[key] = { hour: h, minute: m, members: [] };
      timeGroups[key].members.push(member);
    }

    const groups = Object.values(timeGroups);

    if (groups.length > 0) {
      for (const { hour, minute, members } of groups) {
        const cronExpr = `${minute} ${hour} * * *`;
        console.log(`[Scheduler] Daily email for [${members.join(', ')}] at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} → ${cronExpr}`);
        const task = cron.schedule(cronExpr, () => {
          const s = getSettings();
          if (!s.dailyEmailEnabled) return;
          const mealPlan = getCurrentPlan();
          const chorePlan = getCurrentChorePlan();
          sendDailyNotificationForMembers(members, mealPlan, chorePlan, s).catch(err =>
            console.error('[Notify] Daily email failed:', err.message)
          );
          sendPushToAll(
            '🍽️ Today\'s Plan',
            'Check today\'s meals and chores!',
            { url: '/', tag: 'daily-plan' }
          ).catch(err => console.error('[Notify] Daily push failed:', err.message));
        }, { timezone: 'America/Toronto' });
        dailyTasks.push(task);
      }
    } else {
      // No per-person emails — fall back to combined email at global time
      const hasRecipients = settings.notificationEmails?.length > 0;
      if (!hasRecipients) {
        console.log('[Scheduler] Daily email disabled — no member emails or notification emails configured.');
      } else {
        const cronExpr = `${defaultMinute} ${defaultHour} * * *`;
        console.log(`[Scheduler] Scheduling daily email (combined fallback): ${cronExpr}`);
        const task = cron.schedule(cronExpr, () => {
          const s = getSettings();
          if (!s.dailyEmailEnabled) return;
          const mealPlan = getCurrentPlan();
          const chorePlan = getCurrentChorePlan();
          sendDailyNotification(mealPlan, chorePlan, s).catch(err =>
            console.error('[Notify] Daily email failed:', err.message)
          );
          sendPushToAll(
            '🍽️ Today\'s Plan',
            'Check today\'s meals and chores!',
            { url: '/', tag: 'daily-plan' }
          ).catch(err => console.error('[Notify] Daily push failed:', err.message));
        }, { timezone: 'America/Toronto' });
        dailyTasks.push(task);
      }
    }
  } else {
    console.log('[Scheduler] Daily email disabled.');
  }
}

function reschedule() {
  init();
}

module.exports = { init, reschedule, runGeneration };
