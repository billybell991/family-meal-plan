import { useState, useEffect, useRef } from 'react';

const CATEGORIES = ['kitchen', 'floors', 'rooms', 'bathroom', 'laundry', 'garbage', 'pets', 'outdoor', 'cooking', 'other'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly'];
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CATEGORY_ICONS = {
  kitchen: '🍽️', floors: '🧹', rooms: '🛋️', bathroom: '🚿', laundry: '👕',
  garbage: '🗑️', pets: '🐾', outdoor: '🌿', cooking: '👨‍🍳', other: '📋',
};

const DEFAULT_FORM = {
  name: '', category: 'rooms', difficulty: 'easy',
  estimatedMinutes: 15, frequency: 'weekly', ageMin: 10,
  specificDay: null,
};

export default function EditChoreModal({ chore, onClose, onSave }) {
  const [form, setForm] = useState(chore ? { ...chore } : { ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);
  const isEdit = !!chore?.id;
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSave = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(form);
    } catch {
      // onSave throws on error — keep modal open
      setSaving(false);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  const numField = (key) => ({
    value: form[key],
    onChange: (e) => setForm(f => ({ ...f, [key]: Number(e.target.value) })),
  });

  const difficultyColors = {
    easy: 'bg-green-50 border-green-200 text-green-700',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    hard: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-900">
            {isEdit ? '✏️ Edit Chore' : '➕ Add Chore'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl p-1 -mr-1 rounded-full transition-colors"
            aria-label="Close"
          >✕</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chore Name</label>
            <input
              ref={nameRef}
              type="text"
              {...field('name')}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              placeholder="e.g. Clean bathroom sink…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Category + Difficulty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                {...field('category')}
                className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <div className="flex gap-1.5">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      form.difficulty === d
                        ? difficultyColors[d]
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <div className="flex gap-1.5">
              {FREQUENCIES.map(fr => (
                <button
                  key={fr}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, frequency: fr }))}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    form.frequency === fr
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {fr.charAt(0).toUpperCase() + fr.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Specific Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specific Day <span className="text-gray-400 font-normal">(optional)</span></label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, specificDay: null }))}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  form.specificDay === null
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                Any
              </button>
              {DAYS_OF_WEEK.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, specificDay: d }))}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    form.specificDay === d
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Pin this chore to a specific day of the week</p>
          </div>

          {/* Est. Minutes + Min Age */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Est. Minutes</label>
              <input
                type="number"
                min="5"
                max="180"
                step="5"
                {...numField('estimatedMinutes')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Age</label>
              <input
                type="number"
                min="5"
                max="99"
                {...numField('ageMin')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            className="btn-primary text-sm"
          >
            {saving ? 'Saving…' : isEdit ? '💾 Save Changes' : '➕ Add Chore'}
          </button>
        </div>

      </div>
    </div>
  );
}
