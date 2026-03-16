const fetch = require('node-fetch');

const RECIPES_BASE = 'https://billybell991.github.io/bell-favorite-recipes';

// Curated list of dinner-worthy recipes from the Bell Favorite Recipes site
// (filtered to exclude desserts, snacks, preserved foods, and baking-only items)
const DINNER_RECIPES = [
  { name: 'Instant Pot Chicken Pad Thai', url: `${RECIPES_BASE}/recipes/chicken-pad-thai/`, category: 'instant-pot' },
  { name: 'Holiday Baked Beans', url: `${RECIPES_BASE}/recipes/holiday-baked-beans/`, category: 'instant-pot' },
  { name: 'Air Fryer Chicken Thighs', url: `${RECIPES_BASE}/recipes/air-fryer-chicken-thighs/`, category: 'air-fryer' },
  { name: 'Air Fryer Panko Chicken Thighs', url: `${RECIPES_BASE}/recipes/air-fryer-panko-chicken-thighs/`, category: 'air-fryer' },
  { name: 'BBQ Pork Ribs (Instant Pot)', url: `${RECIPES_BASE}/recipes/bbq-pork-ribs/`, category: 'instant-pot' },
  { name: 'Beef Stew (Instant Pot)', url: `${RECIPES_BASE}/recipes/beef-stew/`, category: 'instant-pot' },
  { name: 'Chicken Broccoli and Rice', url: `${RECIPES_BASE}/recipes/chicken-broccoli-and-rice/`, category: 'instant-pot' },
  { name: 'Faux-tisserie Chicken', url: `${RECIPES_BASE}/recipes/faux-tisserie-chicken/`, category: 'instant-pot' },
  { name: 'Instant Pot Pulled Pork', url: `${RECIPES_BASE}/recipes/instant-pot-pulled-pork/`, category: 'instant-pot' },
  { name: 'Instant Pot Chicken and Dumplings', url: `${RECIPES_BASE}/recipes/instant-pot-chicken-and-dumplings/`, category: 'instant-pot' },
  { name: 'Stuffed Cabbage Casserole', url: `${RECIPES_BASE}/recipes/stuffed-cabbage-casserole/`, category: 'instant-pot' },
  { name: 'Mesquite Ribs', url: `${RECIPES_BASE}/recipes/mesquite-ribs/`, category: 'instant-pot' },
  { name: 'Chicken (from frozen), Rice, and Carrots', url: `${RECIPES_BASE}/recipes/chicken-from-frozen-rice-and-carrots/`, category: 'instant-pot' },
  { name: 'Turkey Noodle Soup', url: `${RECIPES_BASE}/recipes/turkey-noodle-soup/`, category: 'instant-pot' },
  { name: 'Low Fat Sweet and Sour Rice', url: `${RECIPES_BASE}/recipes/low-fat-sweet-and-sour-rice/`, category: 'family' },
  { name: 'Ratatouille (Instant Pot)', url: `${RECIPES_BASE}/recipes/ratatouille/`, category: 'instant-pot' },
  { name: 'Family Favourite Lasagna', url: `${RECIPES_BASE}/recipes/family-favourite-lasagna/`, category: 'family' },
  { name: 'Chicken Parmesan', url: `${RECIPES_BASE}/recipes/chicken-parmesan/`, category: 'family' },
  { name: 'Chicken Bacon Ranch Pasta', url: `${RECIPES_BASE}/recipes/chicken-bacon-ranch-pasta/`, category: 'maya' },
  { name: 'Chicken Taquitos', url: `${RECIPES_BASE}/recipes/chicken-taquitos/`, category: 'maya' },
  { name: 'Boursin One Dish Pasta', url: `${RECIPES_BASE}/recipes/boursin-one-dish-pasta/`, category: 'maya' },
  { name: 'Pan Seared Steak with Garlic Butter', url: `${RECIPES_BASE}/recipes/pan-seared-steak-with-garlic-butter/`, category: 'misc' },
  { name: 'Hearty Chicken and Vegetable Skillet', url: `${RECIPES_BASE}/recipes/hearty-chicken-and-vegetable-skillet/`, category: 'misc' },
  { name: 'The Perfect Basic Burger', url: `${RECIPES_BASE}/recipes/the-perfect-basic-burger/`, category: 'misc' },
  { name: 'Keto Pesto Chicken Casserole', url: `${RECIPES_BASE}/recipes/keto-pesto-chicken-casserole/`, category: 'keto' },
  { name: 'Buffalo Chicken Spaghetti Squash', url: `${RECIPES_BASE}/recipes/buffalo-chicken-spaghetti-squash/`, category: 'keto' },
  { name: 'Zucchini Lasagna', url: `${RECIPES_BASE}/recipes/zucchini-lasagna/`, category: 'keto' },
  { name: 'Penné with Italian Sausage, Tomato, and Herbs', url: `${RECIPES_BASE}/recipes/penn%C3%A9-with-italian-sausage-tomato-and-herbs/`, category: 'family' },
  { name: 'Sweet and Sour Meatballs', url: `${RECIPES_BASE}/recipes/sweet-and-sour-meatballs/`, category: 'family' },
  { name: 'Jollof Rice', url: `${RECIPES_BASE}/recipes/jollof-rice-yans/`, category: 'friends' },
];

/**
 * Return N random dinner-worthy recipes for Gemini to choose from as Random Sunday.
 * @param {number} count - How many candidates to return
 * @param {Array}  recentMeals - Names to exclude (already served recently)
 */
function getRandomSundayCandidates(count = 5, recentMeals = []) {
  const recentLower = recentMeals.map(m => m.toLowerCase());
  const eligible = DINNER_RECIPES.filter(r => !recentLower.includes(r.name.toLowerCase()));
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Fetch all recipe URLs from the Bell Favorite Recipes site (light scrape).
 * Returns an array of { name, url } objects.
 */
async function fetchAllRecipes() {
  return DINNER_RECIPES;
}

module.exports = { getRandomSundayCandidates, fetchAllRecipes, DINNER_RECIPES };
