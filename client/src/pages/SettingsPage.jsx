import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings, addMeal, getKnownMeals, sendNotificationEmail, sendDailyNotificationEmail, getChoreDefinitions, saveChoreDefinitions, getVapidPublicKey, subscribePush, unsubscribePush, sendTestPush } from '../api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FAMILY = ['Mom', 'Dad', 'Maya', 'Maddy'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [meals, setMeals] = useState({ meals: [], sides: [] });
  const [newMealName, setNewMealName] = useState('');
  const [newMealLink, setNewMealLink] = useState('');
  const [newMealType, setNewMealType] = useState('meal');
  const [csvText, setCsvText] = useState('');
  const [csvMode, setCsvMode] = useState(false);
  const [allergyText, setAllergyText] = useState({});
  const [choreData, setChoreData] = useState(null);
  const [chorePrefText, setChorePrefText] = useState({});
  const [choreDislikeText, setChoreDislikeText] = useState({});
  const [pushSupported, setPushSupported] = useState(false);
  const [pushActive, setPushActive] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    Promise.all([getSettings(), getKnownMeals(), getChoreDefinitions()])
      .then(([s, m, c]) => {
        setSettings(s.data);
        setMeals(m.data);
        setChoreData(c.data);
        const text = {};
        FAMILY.forEach(member => {
          text[member] = (s.data.allergies?.[member] || []).join(', ');
        });
        setAllergyText(text);
        const prefs = {};
        const dislikes = {};
        FAMILY.forEach(member => {
          prefs[member] = (c.data.chorePreferences?.[member]?.preferred || []).join(', ');
          dislikes[member] = (c.data.chorePreferences?.[member]?.disliked || []).join(', ');
        });
        setChorePrefText(prefs);
        setChoreDislikeText(dislikes);
      })
      .finally(() => setLoading(false));

    // Check push notification support
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      navigator.serviceWorker.getRegistration('/sw-push.js').then(reg => {
        if (reg) {
          reg.pushManager.getSubscription().then(sub => {
            setPushActive(!!sub);
          });
        }
      });
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(settings);
      // Also save chore preferences if loaded
      if (choreData) {
        const prefs = {};
        FAMILY.forEach(member => {
          prefs[member] = {
            preferred: (chorePrefText[member] || '').split(',').map(s => s.trim()).filter(Boolean),
            disliked: (choreDislikeText[member] || '').split(',').map(s => s.trim()).filter(Boolean),
          };
        });
        await saveChoreDefinitions({ ...choreData, chorePreferences: prefs });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Settings save failed', e);
    } finally {
      setSaving(false);
    }
  };

  const handleAllergyChange = (member, value) => {
    // Just update raw text — don't parse yet so commas can be typed
    setAllergyText(prev => ({ ...prev, [member]: value }));
  };

  const handleAllergyBlur = (member) => {
    // Parse to array only when the user leaves the field
    const list = allergyText[member].split(',').map(s => s.trim()).filter(Boolean);
    setSettings(prev => ({
      ...prev,
      allergies: { ...prev.allergies, [member]: list },
    }));
  };

  const handleAddMeal = async () => {
    if (!newMealName.trim()) return;
    await addMeal({ name: newMealName.trim(), type: newMealType, link: newMealLink || null });
    const res = await getKnownMeals();
    setMeals(res.data);
    setNewMealName('');
    setNewMealLink('');
  };

  const handleCsvImport = async () => {
    if (!csvText.trim()) return;
    try {
      const res = await fetch('/api/settings/meals/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csvText,
      });
      const json = await res.json();
      if (json.error) { alert('CSV error: ' + json.error); return; }
      alert(`Imported ${json.mealsCount} meals and ${json.sidesCount} sides!`);
      const m = await getKnownMeals();
      setMeals(m.data);
      setCsvText('');
      setCsvMode(false);
    } catch (e) {
      alert('Import failed: ' + e.message);
    }
  };

  const handleEnablePush = async () => {
    setPushLoading(true);
    try {
      const { data } = await getVapidPublicKey();
      const reg = await navigator.serviceWorker.register('/sw-push.js');
      await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
      await subscribePush(subscription.toJSON());
      setPushActive(true);
    } catch (err) {
      console.error('Push subscribe failed:', err);
      if (Notification.permission === 'denied') {
        alert('Notifications are blocked. Please enable them in your browser settings.');
      } else {
        alert('Failed to enable push notifications: ' + err.message);
      }
    } finally {
      setPushLoading(false);
    }
  };

  const handleDisablePush = async () => {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw-push.js');
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await unsubscribePush(sub.endpoint);
          await sub.unsubscribe();
        }
      }
      setPushActive(false);
    } catch (err) {
      console.error('Push unsubscribe failed:', err);
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    try {
      await sendTestPush();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to send test push.');
    }
  };

  if (loading) return <LoadingSpinner message="Loading settings…" />;

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      {/* Schedule */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 text-lg">📅 Auto-generation Schedule</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
            <select
              value={settings.scheduleDay}
              onChange={e => setSettings(s => ({ ...s, scheduleDay: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            <select
              value={settings.scheduleHour}
              onChange={e => setSettings(s => ({ ...s, scheduleHour: Number(e.target.value) }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              {HOURS.map(h => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00 {h < 12 ? 'AM' : h === 12 ? 'PM' : 'PM'}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          The AI will automatically generate next week's meal plan on {settings.scheduleDay} at {String(settings.scheduleHour).padStart(2, '0')}:00.
        </p>
      </div>

      {/* Takeout night */}
      <div className="card p-6 space-y-3">
        <h3 className="font-semibold text-gray-800 text-lg">🥡 Default Takeout Night</h3>
        <p className="text-sm text-gray-500">The AI will mark this day as Takeout Night by default. You can still override it per week on the plan.</p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(d => (
            <button
              key={d}
              onClick={() => setSettings(s => ({ ...s, takeoutDay: d }))}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                settings.takeoutDay === d
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Leftover night */}
      <div className="card p-6 space-y-3">
        <h3 className="font-semibold text-gray-800 text-lg">🍲 Default Leftover Night</h3>
        <p className="text-sm text-gray-500">The AI will mark this day as Leftover Night by default. Choose "None" to let the AI pick. You can still override it per week on the plan.</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSettings(s => ({ ...s, leftoverDay: null }))}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              !settings.leftoverDay
                ? 'bg-orange-500 text-white border-orange-500'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            AI Picks
          </button>
          {DAYS.map(d => (
            <button
              key={d}
              onClick={() => setSettings(s => ({ ...s, leftoverDay: d }))}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                settings.leftoverDay === d
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Grocery days */}
      <div className="card p-6 space-y-3">
        <h3 className="font-semibold text-gray-800 text-lg">🛒 Grocery Day(s)</h3>
        <p className="text-sm text-gray-500">
          Select which days you shop for groceries. The grocery list will be split into trips — each trip shows only the ingredients needed for the meals between that grocery day and the next one.
        </p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(d => {
            const isSelected = (settings.groceryDays || []).includes(d);
            return (
              <button
                key={d}
                onClick={() => setSettings(s => {
                  const current = s.groceryDays || [];
                  return {
                    ...s,
                    groceryDays: isSelected
                      ? current.filter(day => day !== d)
                      : [...current, d],
                  };
                })}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  isSelected
                    ? 'bg-green-500 text-white border-green-500'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
        {(settings.groceryDays || []).length > 0 && (
          <p className="text-xs text-gray-400">
            Currently: {(settings.groceryDays || []).sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b)).join(', ')}
          </p>
        )}
      </div>

      {/* Allergies */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 text-lg">🚫 Allergies & Dietary Restrictions</h3>
        <p className="text-sm text-gray-500">The AI will avoid these when planning meals. Enter comma-separated items per person.</p>
        {FAMILY.map(member => (
          <div key={member}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{member}</label>
            <input
              type="text"
              value={allergyText[member] ?? ''}
              onChange={e => handleAllergyChange(member, e.target.value)}
              onBlur={() => handleAllergyBlur(member)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="e.g. peanuts, shellfish, gluten"
            />
          </div>
        ))}
      </div>

      {/* Member Emails */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 text-lg">👤 Daily Email — Per-Person Settings</h3>
        <p className="text-sm text-gray-500">
          Each person gets <strong>only their own chores and meal info</strong>. Set a personal send time per person —
          leave blank to use the default time below. Leave the email blank for anyone who doesn't want a daily email.
        </p>
        <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-3 items-center">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Person</span>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Email address</span>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Send at</span>
          {FAMILY.map(member => {
            const colors = { Mom: 'purple', Dad: 'blue', Maya: 'pink', Maddy: 'amber' };
            const ring = { Mom: 'focus:ring-purple-400', Dad: 'focus:ring-blue-400', Maya: 'focus:ring-pink-400', Maddy: 'focus:ring-amber-400' };
            const memberHour = settings.memberEmailHours?.[member] ?? settings.dailyEmailHour ?? 16;
            const memberMinute = settings.memberEmailMinutes?.[member] ?? settings.dailyEmailMinute ?? 0;
            return (
              <React.Fragment key={member}>
                <span className={`text-sm font-semibold text-${colors[member]}-600`}>{member}</span>
                <input
                  type="email"
                  value={settings.memberEmails?.[member] ?? ''}
                  onChange={e => setSettings(s => ({
                    ...s,
                    memberEmails: { ...(s.memberEmails || {}), [member]: e.target.value },
                  }))}
                  className={`rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ring[member]}`}
                  placeholder={`${member.toLowerCase()}@example.com`}
                />
                <div className="flex items-center gap-1">
                  <select
                    value={memberHour}
                    onChange={e => setSettings(s => ({
                      ...s,
                      memberEmailHours: { ...(s.memberEmailHours || {}), [member]: Number(e.target.value) },
                    }))}
                    className={`rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 ${ring[member]}`}
                  >
                    {HOURS.map(h => (
                      <option key={h} value={h}>{String(h % 12 === 0 ? 12 : h % 12).padStart(2, '0')} {h < 12 ? 'AM' : 'PM'}</option>
                    ))}
                  </select>
                  <span className="text-gray-400 text-sm">:</span>
                  <select
                    value={memberMinute}
                    onChange={e => setSettings(s => ({
                      ...s,
                      memberEmailMinutes: { ...(s.memberEmailMinutes || {}), [member]: Number(e.target.value) },
                    }))}
                    className={`rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 ${ring[member]}`}
                  >
                    {MINUTES.map(m => (
                      <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Notification Emails */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 text-lg">📧 Weekly Email Notification</h3>
        <p className="text-sm text-gray-500">When the plan is generated, a combined email with meals + chores (broken down by everyone) will be sent to these addresses.</p>
        {(settings.notificationEmails || []).map((email, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="email"
              value={email}
              onChange={e => {
                const updated = [...(settings.notificationEmails || [])];
                updated[i] = e.target.value;
                setSettings(s => ({ ...s, notificationEmails: updated }));
              }}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="email@example.com"
            />
            <button
              onClick={() => {
                const updated = (settings.notificationEmails || []).filter((_, j) => j !== i);
                setSettings(s => ({ ...s, notificationEmails: updated }));
              }}
              className="text-red-400 hover:text-red-600 px-2 text-lg"
            >✕</button>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSettings(s => ({ ...s, notificationEmails: [...(s.notificationEmails || []), ''] }))}
            className="btn-secondary text-sm"
          >+ Add email</button>
          <button
            onClick={async () => {
              try {
                await sendNotificationEmail();
                alert('Weekly plan email sent!');
              } catch (e) {
                alert(e.response?.data?.error || 'Failed to send email.');
              }
            }}
            className="btn-secondary text-sm"
            disabled={!settings.notificationEmails?.length}
          >📧 Send Weekly Email Now</button>
        </div>
      </div>

      {/* Daily Email */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 text-lg">📋 Daily Email Reminder</h3>
        <p className="text-sm text-gray-500">
          Enable personalized daily reminders. Each person's email fires at <strong>their own time</strong> set above.
          The time below is the <strong>default</strong> used for anyone without a custom time, and for the combined
          fallback email if no per-person addresses are set.
        </p>
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.dailyEmailEnabled ?? false}
              onChange={e => setSettings(s => ({ ...s, dailyEmailEnabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
          </label>
          <span className="text-sm font-medium text-gray-700">
            {settings.dailyEmailEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        {settings.dailyEmailEnabled && (
          <>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Default time</label>
              <select
                value={settings.dailyEmailHour ?? 16}
                onChange={e => setSettings(s => ({ ...s, dailyEmailHour: Number(e.target.value) }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {HOURS.map(h => (
                  <option key={h} value={h}>
                    {String(h % 12 === 0 ? 12 : h % 12).padStart(2, '0')}:{String(settings.dailyEmailMinute ?? 0).padStart(2, '0')} {h < 12 ? 'AM' : 'PM'}
                  </option>
                ))}
              </select>
              <select
                value={settings.dailyEmailMinute ?? 0}
                onChange={e => setSettings(s => ({ ...s, dailyEmailMinute: Number(e.target.value) }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {MINUTES.map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400">every day</span>
            </div>
            <button
              onClick={async () => {
                try {
                  await sendDailyNotificationEmail();
                  alert("Today's daily email sent!");
                } catch (e) {
                  alert(e.response?.data?.error || 'Failed to send daily email.');
                }
              }}
              className="btn-secondary text-sm"
              disabled={!Object.values(settings.memberEmails || {}).some(e => e?.trim()) && !settings.notificationEmails?.length}
            >📋 Send Today's Email Now</button>
          </>
        )}
        {!Object.values(settings.memberEmails || {}).some(e => e?.trim()) && !settings.notificationEmails?.length && settings.dailyEmailEnabled && (
          <p className="text-xs text-amber-600">⚠️ Add at least one member email above (or a weekly notification email) to receive daily emails.</p>
        )}
      </div>

      {/* Push Notifications */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 text-lg">🔔 Push Notifications</h3>
        <p className="text-sm text-gray-500">
          Get nudges on your phone for new weekly plans, daily meal reminders, and chore updates.
        </p>
        {!pushSupported ? (
          <p className="text-sm text-gray-400">Push notifications are not supported in this browser.</p>
        ) : (
          <>
            <button
              onClick={pushActive ? handleDisablePush : handleEnablePush}
              disabled={pushLoading}
              className={`w-full py-3 rounded-xl font-semibold text-white transition-colors ${
                pushActive
                  ? 'bg-gray-400 hover:bg-gray-500'
                  : 'bg-brand-500 hover:bg-brand-600'
              }`}
            >
              {pushLoading ? 'Working…' : pushActive ? '🔕 Disable Notifications' : '🔔 Enable Notifications'}
            </button>
            {pushActive && (
              <button
                onClick={handleTestPush}
                className="w-full py-3 rounded-xl font-semibold border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                📲 Send Test Ping
              </button>
            )}
            {pushActive && (
              <p className="text-sm text-green-600 text-center">✅ Notifications active</p>
            )}
            <div className="bg-brand-50 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-gray-800">📲 Install on your phone</p>
              <p className="text-sm text-gray-600">For the best experience and push notifications to work:</p>
              <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
                <li>Open this URL in Chrome on your Android</li>
                <li>Tap the 3-dot menu (⋮)</li>
                <li>Tap "Add to Home screen"</li>
                <li>Done — it'll work like a real app</li>
              </ol>
            </div>
          </>
        )}
      </div>

      {/* Default portions */}
      <div className="card p-6 space-y-3">
        <h3 className="font-semibold text-gray-800 text-lg">🍽️ Default Portions</h3>
        <p className="text-sm text-gray-500">How many servings to generate by default. Adjust per-day on the plan.</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSettings(s => ({ ...s, defaultPortions: Math.max(1, (s.defaultPortions || 4) - 1) }))}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-lg hover:bg-gray-50"
          >−</button>
          <span className="text-xl font-bold text-brand-600">{settings.defaultPortions || 4}</span>
          <button
            onClick={() => setSettings(s => ({ ...s, defaultPortions: Math.min(12, (s.defaultPortions || 4) + 1) }))}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-lg hover:bg-gray-50"
          >+</button>
          <span className="text-sm text-gray-500">servings</span>
        </div>
      </div>

      {/* Chores per Person */}
      <div className="card p-6 space-y-3">
        <h3 className="font-semibold text-gray-800 text-lg">🧹 Chores per Person</h3>
        <p className="text-sm text-gray-500">How many chores each person should be assigned per day.</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSettings(s => ({ ...s, choresPerPerson: Math.max(1, (s.choresPerPerson || 2) - 1) }))}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-lg hover:bg-gray-50"
          >−</button>
          <span className="text-xl font-bold text-brand-600">{settings.choresPerPerson || 2}</span>
          <button
            onClick={() => setSettings(s => ({ ...s, choresPerPerson: Math.min(10, (s.choresPerPerson || 2) + 1) }))}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-lg hover:bg-gray-50"
          >+</button>
          <span className="text-sm text-gray-500">chores/day</span>
        </div>
      </div>

      {/* Chore Preferences */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 text-lg">🧹 Chore Preferences</h3>
        <p className="text-sm text-gray-500">Tell the AI what chores each person prefers or dislikes. Comma-separated chore names.</p>
        {FAMILY.map(member => (
          <div key={member} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">{member}</label>
            <input
              type="text"
              value={chorePrefText[member] ?? ''}
              onChange={e => setChorePrefText(prev => ({ ...prev, [member]: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Preferred chores, e.g. Walk Gus, Laundry"
            />
            <input
              type="text"
              value={choreDislikeText[member] ?? ''}
              onChange={e => setChoreDislikeText(prev => ({ ...prev, [member]: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="Disliked chores, e.g. Clean bathroom"
            />
          </div>
        ))}
      </div>

      {/* Save settings */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : saved ? '✅ Saved!' : '💾 Save Settings'}
        </button>
      </div>

      {/* Meals list management */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-lg">🍲 Known Meals & Sides</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setCsvMode(v => !v)}
              className="btn-secondary text-xs"
            >
              📄 Import CSV
            </button>
          </div>
        </div>

        {csvMode && (
          <div className="space-y-3 bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-600">
              Paste CSV with columns: <code className="bg-gray-200 px-1 rounded">name, type (meal|side), link, notes</code>
            </p>
            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="name,type,link,notes&#10;Shepherd's Pie,meal,,Great for leftovers&#10;Steamed Broccoli,side,,"
            />
            <div className="flex gap-2">
              <button onClick={handleCsvImport} className="btn-primary text-xs">Import</button>
              <button onClick={() => setCsvMode(false)} className="btn-secondary text-xs">Cancel</button>
            </div>
          </div>
        )}

        {/* Add new meal */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMealName}
              onChange={e => setNewMealName(e.target.value)}
              placeholder="Meal or side name…"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <select
              value={newMealType}
              onChange={e => setNewMealType(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
            >
              <option value="meal">Meal</option>
              <option value="side">Side</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={newMealLink}
              onChange={e => setNewMealLink(e.target.value)}
              placeholder="Recipe link (optional)"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button onClick={handleAddMeal} disabled={!newMealName.trim()} className="btn-primary text-xs whitespace-nowrap">
              + Add
            </button>
          </div>
        </div>

        {/* Current meals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Meals ({meals.meals?.length || 0})
            </p>
            <ul className="space-y-1 max-h-60 overflow-y-auto">
              {(meals.meals || []).map((m, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-center gap-2 py-0.5">
                  <span className="text-gray-300">•</span>
                  {m.link ? (
                    <a href={m.link} target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 hover:underline truncate">{m.name} ↗</a>
                  ) : <span className="truncate">{m.name}</span>}
                </li>
              ))}
              {(!meals.meals || meals.meals.length === 0) && (
                <li className="text-xs text-gray-400 italic">No meals added yet. Import a CSV or add manually.</li>
              )}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Sides ({meals.sides?.length || 0})
            </p>
            <ul className="space-y-1 max-h-60 overflow-y-auto">
              {(meals.sides || []).map((s, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-center gap-2 py-0.5">
                  <span className="text-gray-300">•</span>
                  <span className="truncate">{s.name}</span>
                </li>
              ))}
              {(!meals.sides || meals.sides.length === 0) && (
                <li className="text-xs text-gray-400 italic">No sides added yet.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
