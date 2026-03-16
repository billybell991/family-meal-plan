const express = require('express');
const router = express.Router();
const { getCurrentPlan } = require('../services/dataService');

/**
 * Build grocery list from the current meal plan.
 * Groups items by category (Produce, Meat, Dairy, Dry Goods, Other).
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

// GET /api/grocery — generate grocery list from current plan
router.get('/', (req, res) => {
  const plan = getCurrentPlan();
  if (!plan) return res.status(404).json({ error: 'No meal plan found.' });

  const rawItems = (plan.groceryItems || []).filter(gi => {
    // Exclude items for takeout and leftover days
    const day = plan.days.find(d => d.day === gi.forDay);
    return !day?.isTakeout && !day?.isLeftover;
  });

  // Deduplicate by item name (case-insensitive)
  const seen = new Set();
  const deduplicated = rawItems.filter(gi => {
    const key = gi.item.toLowerCase().trim();
    if (seen.has(key)) return false;
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

    plan.groceryItems = (plan.groceryItems || []).filter(
      gi => gi.item.toLowerCase() !== (item || '').toLowerCase()
    );

    const { writePlanDirect } = require('../services/dataService');
    writePlanDirect(plan);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
