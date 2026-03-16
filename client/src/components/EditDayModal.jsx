import { useState, useEffect, useRef } from 'react';
import { updateDay, getKnownMeals } from '../api.js';

const COOKS = ['Mom', 'Dad', 'Maya', 'Maddy', 'N/A'];

export default function EditDayModal({ dayData, onClose, onSave }) {
  const [selectedMeal, setSelectedMeal] = useState(
    dayData.meal ? { name: dayData.meal.name, link: dayData.meal.link || null, notes: dayData.meal.description || null } : null
  );
  const [mealSearch, setMealSearch]   = useState(dayData.meal?.name || '');
  const [mealDropOpen, setMealDropOpen] = useState(false);
  const [selectedSides, setSelectedSides] = useState((dayData.sides || []).map(s => s.name));
  const [sidesDropOpen, setSidesDropOpen] = useState(false);
  const [cook, setCook]               = useState(dayData.cook || 'Dad');
  const [saving, setSaving]           = useState(false);
  const [knownMeals, setKnownMeals]   = useState([]);
  const [knownSides, setKnownSides]   = useState([]);
  const mealRef = useRef(null);
  const sidesRef = useRef(null);

  useEffect(() => {
    getKnownMeals()
      .then(res => {
        setKnownMeals(res.data.meals || []);
        setKnownSides(res.data.sides || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (mealRef.current && !mealRef.current.contains(e.target)) setMealDropOpen(false);
      if (sidesRef.current && !sidesRef.current.contains(e.target)) setSidesDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredMeals = mealSearch.length > 0
    ? knownMeals.filter(m => m.name.toLowerCase().includes(mealSearch.toLowerCase()))
    : knownMeals;

  const handlePickMeal = (meal) => {
    setSelectedMeal(meal);
    setMealSearch(meal.name);
    setMealDropOpen(false);
  };

  const toggleSide = (sideName) => {
    setSelectedSides(prev =>
      prev.includes(sideName) ? prev.filter(s => s !== sideName) : [...prev, sideName]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        cook,
        sides: selectedSides.map(name => ({ name })),
        meal: {
          ...dayData.meal,
          name: selectedMeal?.name || mealSearch,
          link: selectedMeal?.link || null,
          description: selectedMeal?.notes || dayData.meal?.description || null,
        },
      };
      const res = await updateDay(dayData.day, updates);
      onSave(res.data);
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-lg">Edit {dayData.day}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto">

          <div ref={mealRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Meal</label>
            <button
              type="button"
              onClick={() => { setMealDropOpen(v => !v); setMealSearch(''); }}
              className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white hover:bg-gray-50"
            >
              <span className={selectedMeal ? 'text-gray-900' : 'text-gray-400'}>
                {selectedMeal?.name || 'Choose a meal...'}
              </span>
              <span className="text-gray-400 ml-2">{mealDropOpen ? '▲' : '▼'}</span>
            </button>

            {mealDropOpen && (
              <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg flex flex-col" style={{maxHeight: '260px'}}>
                <div className="p-2 border-b border-gray-100 flex-shrink-0">
                  <input
                    autoFocus
                    type="text"
                    value={mealSearch}
                    onChange={e => setMealSearch(e.target.value)}
                    placeholder="Search meals..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                <div className="overflow-y-auto">
                  {filteredMeals.map((meal, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handlePickMeal(meal)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors border-b border-gray-50 last:border-0 ${
                        selectedMeal?.name === meal.name
                          ? 'bg-brand-50 text-brand-700 font-medium'
                          : 'hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      <span>{meal.name}</span>
                      {meal.link && <span className="text-xs text-brand-400 ml-2">↗ recipe</span>}
                    </button>
                  ))}
                  {filteredMeals.length === 0 && (
                    <p className="px-3 py-3 text-sm text-gray-400 italic">No matches</p>
                  )}
                </div>
              </div>
            )}

            {selectedMeal?.link && (
              <a
                href={selectedMeal.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1.5 text-xs text-brand-600 hover:underline"
              >
                📖 {selectedMeal.link.replace(/^https?:\/\//, '').substring(0, 55)}... ↗
              </a>
            )}
          </div>

          <div ref={sidesRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Sides</label>
            {selectedSides.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedSides.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-full px-2.5 py-0.5 text-xs font-medium">
                    {s}
                    <button type="button" onClick={() => toggleSide(s)} className="hover:text-red-500 leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setSidesDropOpen(v => !v)}
              className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white hover:bg-gray-50"
            >
              <span className="text-gray-400">{sidesDropOpen ? 'Close' : '+ Add sides...'}</span>
              <span className="text-gray-400">{sidesDropOpen ? '▲' : '▼'}</span>
            </button>
            {sidesDropOpen && (
              <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {knownSides.map((side, i) => {
                  const picked = selectedSides.includes(side.name);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleSide(side.name)}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between border-b border-gray-50 last:border-0 transition-colors ${
                        picked ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      {side.name}
                      {picked && <span className="text-brand-500 font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Who's Cooking?</label>
            <div className="flex flex-wrap gap-2">
              {COOKS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCook(c)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    cook === c
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
