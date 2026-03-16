const express = require('express');
const router = express.Router();
const { DINNER_RECIPES, getRandomSundayCandidates } = require('../services/recipeService');

// GET /api/recipes — all dinner-eligible recipes from Bell Favorite Recipes
router.get('/', (req, res) => {
  res.json(DINNER_RECIPES);
});

// GET /api/recipes/random-sunday — get random Sunday candidates
router.get('/random-sunday', (req, res) => {
  const candidates = getRandomSundayCandidates(5);
  res.json(candidates);
});

module.exports = router;
