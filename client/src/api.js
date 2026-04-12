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
export const toggleLeftover = (day, isLeftover) => api.post(`/plan/leftover`, { day, isLeftover });
export const getPlanHistory = () => api.get('/meal-plan/history');
export const clearHistory = () => api.delete('/meal-plan/history');

export const deletePlan = () => api.delete('/meal-plan');

export const getGroceryList = () => api.get('/grocery');
export const addCustomGroceryItem = (item) => api.post('/grocery/custom', { item });
export const removeGroceryItem = (item) => api.delete('/grocery/item', { data: { item } });
export const refreshGroceryList = () => api.post('/grocery/refresh');

export const getSettings = () => api.get('/settings');
export const saveSettings = (settings) => api.put('/settings', settings);
export const getRatings = () => api.get('/settings/ratings');
export const addRating = (meal, member, stars) => api.post('/settings/ratings', { meal, member, stars });
export const getKnownMeals = () => api.get('/settings/meals');
export const addMeal = (entry) => api.post('/settings/meals', entry);

export const rerollSurprise = (day) => api.patch(`/meal-plan/day/${encodeURIComponent(day)}/reroll`);
export const sendNotificationEmail = () => api.post('/settings/send-notification');
export const sendDailyNotificationEmail = () => api.post('/settings/send-daily-notification');

// Chores
export const getChoreDefinitions = () => api.get('/chores/definitions');
export const saveChoreDefinitions = (data) => api.put('/chores/definitions', data);
export const addChoreDefinition = (chore) => api.post('/chores/definitions/chore', chore);
export const updateChoreDefinition = (id, chore) => api.put(`/chores/definitions/chore/${encodeURIComponent(id)}`, chore);
export const deleteChoreDefinition = (id) => api.delete(`/chores/definitions/chore/${encodeURIComponent(id)}`);
export const getChorePlan = () => api.get('/chores/plan');
export const generateChorePlan = () => api.post('/chores/plan/generate');
export const deleteChorePlan = () => api.delete('/chores/plan');
export const toggleChoreComplete = (day, choreId, assignedTo, isCompleted) =>
  api.patch(`/chores/plan/day/${encodeURIComponent(day)}/complete`, { choreId, assignedTo, isCompleted });
export const updateDayAssignments = (day, assignments) =>
  api.patch(`/chores/plan/day/${encodeURIComponent(day)}/assignments`, { assignments });
export const getChoreHistory = () => api.get('/chores/history');
export const sendChoreNotificationEmail = () => api.post('/chores/send-notification');

export const getRecipes = () => api.get('/recipes');

// Push notifications
export const getVapidPublicKey = () => api.get('/push/vapid-public-key');
export const subscribePush = (subscription) => api.post('/push/subscribe', subscription);
export const unsubscribePush = (endpoint) => api.post('/push/unsubscribe', { endpoint });
export const sendTestPush = () => api.post('/push/test');

export const helpWithMeal = (day, who) => api.post(`/meals/help`, { day, who });
