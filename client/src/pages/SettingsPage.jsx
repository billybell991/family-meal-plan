import { useState, useEffect } from 'react';
import { getSettings, saveSettings, addMeal, getKnownMeals, sendNotificationEmail, sendDailyNotificationEmail, getChoreDefinitions, saveChoreDefinitions } from '../api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FAMILY = ['Mom', 'Dad', 'Maya', 'Maddy'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

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

  if (loading) return <LoadingSpinner message="Loading settings…" />;

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

      {/* Notification Emails */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 text-lg">📧 Weekly Email Notification</h3>
        <p className="text-sm text-gray-500">When the plan is generated, a combined email with meals + chores (broken down by person) will be sent here.</p>
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
          Get a daily email with just that day's supper and chore assignments — a quick "today's to-do" delivered to everyone's inbox.
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
              <label className="text-sm font-medium text-gray-700">Send at</label>
              <select
                value={settings.dailyEmailHour ?? 16}
                onChange={e => setSettings(s => ({ ...s, dailyEmailHour: Number(e.target.value) }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {HOURS.map(h => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00 {h < 12 ? 'AM' : h === 12 ? 'PM' : 'PM'}
                  </option>
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
              disabled={!settings.notificationEmails?.length}
            >📋 Send Today's Email Now</button>
          </>
        )}
        {!settings.notificationEmails?.length && settings.dailyEmailEnabled && (
          <p className="text-xs text-amber-600">⚠️ Add at least one email address above to receive daily emails.</p>
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
