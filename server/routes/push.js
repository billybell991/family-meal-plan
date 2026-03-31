const express = require('express');
const router = express.Router();
const { addSubscription, removeSubscription, getVapidPublicKey, getSubscriptionCount, sendPushToAll } = require('../services/pushService');

// GET /api/push/vapid-public-key
router.get('/vapid-public-key', (req, res) => {
  const key = getVapidPublicKey();
  if (!key) return res.status(500).json({ error: 'VAPID keys not configured on server.' });
  res.json({ publicKey: key });
});

// POST /api/push/subscribe — register a push subscription
router.post('/subscribe', (req, res) => {
  const subscription = req.body;
  if (!subscription?.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription object.' });
  }
  addSubscription(subscription);
  res.json({ success: true });
});

// POST /api/push/unsubscribe — remove a push subscription
router.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint is required.' });
  removeSubscription(endpoint);
  res.json({ success: true });
});

// POST /api/push/test — send a test push to all subscribers
router.post('/test', async (req, res) => {
  try {
    const count = getSubscriptionCount();
    if (count === 0) return res.status(400).json({ error: 'No push subscriptions registered.' });
    await sendPushToAll(
      '🔔 Bell Meal Planner',
      'Push notifications are working! You\'ll get meal & chore reminders here.',
      { url: '/' }
    );
    res.json({ success: true, subscriberCount: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send test push: ' + err.message });
  }
});

module.exports = router;
