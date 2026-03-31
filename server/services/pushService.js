'use strict';

const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || process.env.RENDER_DATA_DIR || path.join(__dirname, '../../data');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'push-subscriptions.json');

// VAPID config — set these via environment variables in production
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:bellplanner@example.com';

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[PushService] VAPID keys not set — push notifications disabled.');
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

function readSubscriptions() {
  try {
    if (!fs.existsSync(SUBSCRIPTIONS_FILE)) return [];
    const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeSubscriptions(subs) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2), 'utf8');
}

function addSubscription(subscription) {
  const subs = readSubscriptions();
  // Deduplicate by endpoint
  const exists = subs.find(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subs.push(subscription);
    writeSubscriptions(subs);
  }
  return subs;
}

function removeSubscription(endpoint) {
  let subs = readSubscriptions();
  subs = subs.filter(s => s.endpoint !== endpoint);
  writeSubscriptions(subs);
  return subs;
}

/**
 * Send a push notification to all registered devices.
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {object} [data] - Extra data payload (e.g. { url: '/chores' })
 */
async function sendPushToAll(title, body, data = {}) {
  if (!ensureConfigured()) return;
  const subs = readSubscriptions();
  if (subs.length === 0) {
    console.log('[PushService] No subscriptions registered — skipping push.');
    return;
  }

  const payload = JSON.stringify({ title, body, ...data });
  const stale = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or invalid — mark for removal
          stale.push(sub.endpoint);
        } else {
          console.error('[PushService] Send failed:', err.message);
        }
      }
    })
  );

  // Clean up stale subscriptions
  if (stale.length > 0) {
    const remaining = readSubscriptions().filter(s => !stale.includes(s.endpoint));
    writeSubscriptions(remaining);
    console.log(`[PushService] Removed ${stale.length} stale subscription(s).`);
  }
}

function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}

function getSubscriptionCount() {
  return readSubscriptions().length;
}

module.exports = {
  addSubscription,
  removeSubscription,
  sendPushToAll,
  getVapidPublicKey,
  getSubscriptionCount,
};
