const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Ask Gemini to generate a weekly meal plan for the Bell family.
 * @param {Object} opts
 * @param {Array}  opts.meals      - Known meals from CSV/data
 * @param {Array}  opts.sides      - Known sides from CSV/data
 * @param {Object} opts.allergies  - { member: [allergen, ...] }
 * @param {Array}  opts.ratings    - Past meal ratings [ { meal, avgRating } ]
 * @param {Array}  opts.recentMeals - Meals served in last 2 weeks to avoid repeats
 * @param {Array}  opts.randomRecipes - Candidate recipes from bell-favorite-recipes
 * @returns {Object} Weekly plan keyed by day
 */
async function generateWeeklyPlan({ meals = [], sides = [], allergies = {}, ratings = [], recentMeals = [], randomRecipes = [] }) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });

  const cookingTimeRules = `
COOKING TIME CONSTRAINTS (strictly follow these):
- Sunday: Plenty of time. Can be elaborate (roasts, slow-cook, Instant Pot). Include a "Random Sunday" featuring a recipe from the Bell Favorite Recipes site.
- Saturday: Moderate time available.
- Monday, Tuesday, Wednesday, Thursday: QUICK meals only — max 30 minutes prep+cook. Families are busy on weeknights.
- Friday: Moderate time okay — start of weekend.
- Wednesday is "Takeout Night" by default — mark it as takeout: true. No meal or grocery items needed for that day.

FAMILY MEMBERS & COOKING ROTATION:
Family members: Mom, Dad, Maya, Maddy
Rotate who cooks each night equally across the week. Dad and Mom take Sunday/Saturday. Maya and Maddy take weeknight slots (excluding any "N/A" days).
Saturday is planning day — Dad handles Saturday supper if needed.
`;

  const allergyEntries = Object.entries(allergies).filter(([, a]) => a.length > 0);
  const allergySection = allergyEntries.length > 0
    ? `⚠️ ALLERGY ALERT — CRITICAL: The following family members have severe allergies. You MUST NOT include these ingredients in ANY meal, side dish, sauce, marinade, or ingredient list — not even as a minor component:\n${allergyEntries.map(([m, a]) => `- ${m}: NEVER use ${a.join(', ')}`).join('\n')}\nDouble-check every meal you suggest against this list before including it.`
    : 'No allergies on file.';

  const ratingsSection = ratings.length > 0
    ? `MEAL RATINGS (higher = more preferred):\n${ratings.map(r => `- ${r.meal}: ${r.avgRating.toFixed(1)}/5`).join('\n')}`
    : '';

  const recentSection = recentMeals.length > 0
    ? `MEALS SERVED IN THE LAST 2 WEEKS (avoid repeating):\n${recentMeals.join(', ')}`
    : '';

  const knownMealsSection = meals.length > 0
    ? `KNOWN FAMILY SUPPERS — YOU MUST ONLY CHOOSE FROM THIS LIST (do NOT invent or suggest meals not on this list). The ONLY exception is Sunday's "Random Sunday" recipe which comes from the Bell Favorite Recipes site candidates below:\n${meals.map(m => {
        const groceryHint = m.groceries?.length ? ` [needs: ${m.groceries.join(', ')}]` : '';
        const linkHint = m.link ? ` (${m.link})` : '';
        return `- ${m.name}${linkHint}${groceryHint}`;
      }).join('\n')}`
    : '';

  const knownSidesSection = sides.length > 0
    ? `KNOWN FAMILY SIDES — ONLY pick sides from this list:\n${sides.map(s => {
        const groceryHint = s.groceries?.length ? ` [needs: ${s.groceries.join(', ')}]` : '';
        return `- ${s.name}${groceryHint}`;
      }).join('\n')}`
    : '';

  const randomCandidates = randomRecipes.length > 0
    ? `RANDOM SUNDAY CANDIDATES from Bell Favorite Recipes site:\n${randomRecipes.map(r => `- ${r.name} (${r.url})`).join('\n')}\nPick ONE of these for Sunday's special recipe.`
    : '';

  const prompt = `You are a family meal planner AI for the Bell family (2 adults: Mom and Dad; 2 daughters: Maya and Maddy, teenagers).

${cookingTimeRules}

${allergySection}

${ratingsSection}

${recentSection}

${knownMealsSection}

${knownSidesSection}

${randomCandidates}

TASK: Generate a complete weekly meal plan for 7 days (Sunday through Saturday).
CRITICAL: Every meal MUST come from the KNOWN FAMILY SUPPERS list above. Do NOT invent, create, or suggest any meal that is not on that list. Use the exact meal names as written. The ONLY exception is Sunday, which should use one of the Random Sunday Candidates from the Bell Favorite Recipes site.
For each day, provide:
1. A main supper meal
2. 1-2 sides
3. Who is cooking
4. A "to-do" note if any prep is needed the day before (e.g., "Thaw chicken tomorrow")
5. A recipe link if one is available (from known meals list or from the Bell Favorite Recipes site)
6. Default portions = 4 servings
7. Wednesday must be takeout: true (no meal details needed)
8. Pick ONE other night (not Wednesday, not Sunday) as leftover night: isLeftover: true (no meal details needed — the family eats leftovers from earlier in the week)

RESPONSE FORMAT: Return ONLY valid JSON. No markdown, no explanation. Use this exact structure:
{
  "weekOf": "YYYY-MM-DD (the Sunday of this week)",
  "generatedAt": "ISO timestamp",
  "days": [
    {
      "day": "Sunday",
      "date": "YYYY-MM-DD",
      "isTakeout": false,
      "isLeftover": false,
      "cook": "Dad",
      "meal": {
        "name": "Meal Name",
        "description": "Brief 1-sentence description",
        "link": "https://... or null",
        "isRandomSunday": true,
        "prepNote": "Thaw X tonight" or null
      },
      "sides": [
        { "name": "Side name" }
      ],
      "portions": 4
    }
  ],
  "groceryItems": [
    { "item": "Ingredient name", "forDay": "Sunday", "forMeal": "Meal name" }
  ]
}

Generate the plan for the week starting this coming Sunday. Today is ${new Date().toDateString()}.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  let plan;
  try {
    plan = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Gemini returned invalid JSON: ${e.message}\n\nRaw:\n${text.substring(0, 500)}`);
  }

  return plan;
}

module.exports = { generateWeeklyPlan };
