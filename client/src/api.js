import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Global error interceptor — surface network/server errors clearly
api.interceptors.response.use(
  res => res,
  err => {
    if (!err.response) {
      err.message = 'Cannot reach the server. Is it running?';
    }
    return Promise.reject(err);
  }
);

export const getMealPlan = () => api.get('/meal-plan');
export const generatePlan = () => api.post('/meal-plan/generate');
export const updateDay = (day, updates) => api.patch(`/meal-plan/day/${encodeURIComponent(day)}`, updates);
export const updatePortions = (day, portions) => api.patch(`/meal-plan/day/${encodeURIComponent(day)}/portions`, { portions });
export const toggleTakeout = (day, isTakeout) => api.patch(`/meal-plan/day/${encodeURIComponent(day)}/takeout`, { isTakeout });
export const toggleLeftover = (day, isLeftover) => api.patch(`/meal-plan/day/${encodeURIComponent(day)}/leftover`, { isLeftover });
export const getPlanHistory = () => api.get('/meal-plan/history');
export const clearHistory = () => api.delete('/meal-plan/history');

export const deletePlan = () => api.delete('/meal-plan');

export const getGroceryList = () => api.get('/grocery');
export const addCustomGroceryItem = (item) => api.post('/grocery/custom', { item });
export const removeGroceryItem = (item) => api.delete('/grocery/item', { data: { item } });

export const getSettings = () => api.get('/settings');
export const saveSettings = (settings) => api.put('/settings', settings);
export const getRatings = () => api.get('/settings/ratings');
export const addRating = (meal, member, stars) => api.post('/settings/ratings', { meal, member, stars });
export const getKnownMeals = () => api.get('/settings/meals');
export const addMeal = (entry) => api.post('/settings/meals', entry);

export const rerollSurprise = (day) => api.patch(`/meal-plan/day/${encodeURIComponent(day)}/reroll`);
export const sendNotificationEmail = () => api.post('/settings/send-notification');

export const getRecipes = () => api.get('/recipes');
