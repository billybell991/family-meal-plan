const express = require('express');
const router = express.Router();
const { getCurrentPlan, getKnownMeals } = require('../services/dataService');

/**
 * Build grocery list dynamically from the current meal plan.
 * Looks up each day's meal and sides in the known-meals database
 * so the list always reflects the actual plan — even after edits.
 */
function categorize(item) {
  const i = item.toLowerCase();
  if (/chicken|beef|pork|hamburg|turkey|sausage|bacon|shrimp|fish|tuna|steak|ribs|lamb|venison/.test(i)) return 'Meat & Seafood';
  if (/milk|cheese|butter|cream|yogurt|egg|sour cream|cheddar|mozzarella|parmesan/.test(i)) return 'Dairy & Eggs';
  if (/carrot|lettuce|broccoli|celery|onion|garlic|tomato|pepper|zucchini|spinach|potato|cucumber|corn|veggie|vegetable|apple|banana|fruit|lemon|lime|avocado/.test(i)) return 'Produce';
  if (/pasta|noodle|rice|bread|flour|bun|wrap|tortilla|bagel|pita|naan|cracker/.test(i)) return 'Bread & Grains';
  if (/sauce|soup|broth|stock|oil|vinegar|ketchup|mustard|mayo|salsa|soy|seasoning|spice|herb|sugar|salt|pepper|powder/.test(i)) return 'Pantry & Condiments';
  if (/popcorn|chip|cookie|chocolate|candy|cereal/.test(i)) return 'Snacks';
  if (/juice|water|soda|drink|coffee|tea/.test(i)) return 'Beverages';
  return 'Other';
}

/**
 * Dynamically build grocery items by looking up each day's meal and sides
 * in the known meals/sides lists. Falls back to the stored groceryItems
 * for any meal not found in the database (e.g. Gemini one-offs).
 */
function buildGroceryItems(plan) {
  const { meals: knownMealsList, sides: knownSidesList } = getKnownMeals();
  const mealLookup = new Map(knownMealsList.map(m => [m.name.toLowerCase(), m]));
  const sideLookup = new Map(knownSidesList.map(s => [s.name.toLowerCase(), s]));

  const items = [];
  const coveredDays = new Set();

  for (const day of plan.days) {
    if (day.isTakeout || day.isLeftover || !day.meal?.name) continue;

    const knownMeal = mealLookup.get(day.meal.name.toLowerCase());
    if (knownMeal && knownMeal.groceries) {
      coveredDays.add(day.day);
      for (const grocery of knownMeal.groceries) {
        items.push({ item: grocery, forDay: day.day, forMeal: day.meal.name });
      }
    }

    for (const side of (day.sides || [])) {
      const knownSide = sideLookup.get(side.name.toLowerCase());
      if (knownSide && knownSide.groceries) {
        coveredDays.add(day.day);
        for (const grocery of knownSide.groceries) {
          items.push({ item: grocery, forDay: day.day, forMeal: side.name });
        }
      }
    }
  }

  // Fall back to stored groceryItems for days/meals not in the known DB
  // (e.g. surprise recipes from Gemini that aren't in meals.json)
  for (const gi of (plan.groceryItems || [])) {
    if (gi.forDay === 'Custom') {
      items.push(gi); // always keep custom items
    } else if (!coveredDays.has(gi.forDay)) {
      // This day wasn't covered by known meals — use the AI-generated items
      const day = plan.days.find(d => d.day === gi.forDay);
      if (!day?.isTakeout && !day?.isLeftover) {
        items.push(gi);
      }
    }
  }

  return items;
}

// GET /api/grocery — generate grocery list from current plan
router.get('/', (req, res) => {
  const plan = getCurrentPlan();
  if (!plan) return res.status(404).json({ error: 'No meal plan found.' });

  const rawItems = buildGroceryItems(plan);

  // Check for manually removed items
  const removedItems = new Set((plan.removedGroceryItems || []).map(i => i.toLowerCase().trim()));

  // Deduplicate by item name (case-insensitive)
  const seen = new Set();
  const deduplicated = rawItems.filter(gi => {
    const key = gi.item.toLowerCase().trim();
    if (seen.has(key)) return false;
    if (removedItems.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Categorize
  const categorized = {};
  for (const gi of deduplicated) {
    const cat = categorize(gi.item);
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push(gi);
  }

  res.json({
    sections: categorized,
    total: deduplicated.length,
    weekOf: plan.weekOf,
  });
});

// POST /api/grocery/custom — add a custom item to grocery list
router.post('/custom', (req, res) => {
  try {
    const { item } = req.body;
    if (!item || typeof item !== 'string' || item.trim().length === 0) {
      return res.status(400).json({ error: 'Item name is required' });
    }
    const plan = getCurrentPlan();
    if (!plan) return res.status(404).json({ error: 'No meal plan found.' });

    plan.groceryItems = plan.groceryItems || [];
    plan.groceryItems.push({
      item: item.trim(),
      forDay: 'Custom',
      forMeal: 'Custom Item',
    });

    // If previously removed, un-remove it
    plan.removedGroceryItems = (plan.removedGroceryItems || []).filter(
      i => i.toLowerCase() !== item.trim().toLowerCase()
    );

    const { writePlanDirect } = require('../services/dataService');
    writePlanDirect(plan);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/grocery/item — remove an item from grocery list
router.delete('/item', (req, res) => {
  try {
    const { item } = req.body;
    const plan = getCurrentPlan();
    if (!plan) return res.status(404).json({ error: 'No meal plan found.' });

    // Remove from custom/stored items
    plan.groceryItems = (plan.groceryItems || []).filter(
      gi => gi.item.toLowerCase() !== (item || '').toLowerCase()
    );

    // Track removal so dynamically-generated items stay hidden
    plan.removedGroceryItems = plan.removedGroceryItems || [];
    const key = (item || '').toLowerCase().trim();
    if (!plan.removedGroceryItems.some(i => i.toLowerCase() === key)) {
      plan.removedGroceryItems.push(item.trim());
    }

    const { writePlanDirect } = require('../services/dataService');
    writePlanDirect(plan);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
