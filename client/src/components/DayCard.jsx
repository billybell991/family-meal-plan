import { useState, useEffect } from 'react';
import { updateDay, updatePortions, toggleTakeout, toggleLeftover } from '../api.js';
import EditDayModal from './EditDayModal.jsx';
import RatingStars from './RatingStars.jsx';

const QUICK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const TODAY_DATE = new Date().toISOString().slice(0, 10);

export default function DayCard({ dayData, onToggleTakeout, onUpdate }) {
  const [editOpen, setEditOpen]       = useState(false);
  const [expanded, setExpanded]       = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [portionsLocal, setPortionsLocal] = useState(dayData.portions ?? 4);
  const [saving, setSaving]           = useState(false);


  useEffect(() => { setPortionsLocal(dayData.portions ?? 4); }, [dayData.portions]);

  const isQuick = QUICK_DAYS.includes(dayData.day);
  const isToday = dayData.date === TODAY_DATE;

  const handlePortionChange = async (delta) => {
    const newVal = Math.max(1, Math.min(10, portionsLocal + delta));
    setPortionsLocal(newVal);
    try { const res = await updatePortions(dayData.day, newVal); onUpdate(res.data); }
    catch (e) { console.error('Portions update failed', e); }
  };

  const handleTakeoutToggle = async () => {
    setSaving(true);
    try { await onToggleTakeout(dayData.day, !dayData.isTakeout); }
    finally { setSaving(false); }
  };

  const handleLeftoverToggle = async () => {
    setSaving(true);
    try {
      const res = await toggleLeftover(dayData.day, !dayData.isLeftover);
      onUpdate(res.data);
    } finally { setSaving(false); }
  };

  const accentBorder = dayData.isTakeout
    ? 'border-l-4 border-blue-400'
    : dayData.isLeftover
    ? 'border-l-4 border-orange-300'
    : dayData.meal?.isRandomSunday
    ? 'border-l-4 border-brand-400'
    : isQuick
    ? 'border-l-4 border-green-400'
    : 'border-l-4 border-slate-200';

  const dayGroceries = (dayData.groceryItems || []);

  return (
    <>
      <div className={`card ${accentBorder} flex flex-col`}>

        {/* Compact row */}
        <button
          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
          onClick={() => setExpanded(v => !v)}
        >
          <div className="w-24 flex-shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`font-bold text-sm ${isToday ? 'text-brand-600' : 'text-slate-800'}`}>{dayData.day}</span>
              {isToday && <span className="badge bg-brand-500 text-white text-xs py-0">Today</span>}
            </div>
            {dayData.date && (
              <span className="text-xs text-slate-400">
                {new Date(dayData.date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {dayData.isTakeout ? (
              <span className="text-sm font-semibold text-blue-600">🥡 Takeout Night</span>
            ) : dayData.isLeftover ? (
              <span className="text-sm font-semibold text-orange-500">♻️ Leftover Night</span>
            ) : dayData.meal?.name ? (
              <>
                <p className="text-sm font-semibold text-slate-800 truncate">{dayData.meal.name}</p>
                {dayData.sides?.length > 0 && (
                  <p className="text-xs text-slate-400 truncate">
                    + {dayData.sides.map(s => s.name).join(', ')}
                  </p>
                )}
              </>
            ) : (
              <span className="text-sm text-slate-400 italic">No meal set</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!dayData.isTakeout && !dayData.isLeftover && dayData.cook && (
              <span className="text-xs text-slate-500 hidden sm:block">👨‍🍳 {dayData.cook}</span>
            )}
            {dayData.meal?.isRandomSunday && (
              <span className="badge bg-brand-100 text-brand-700 hidden md:inline-flex">🎲</span>
            )}
            {isQuick && !dayData.isTakeout && !dayData.isLeftover && (
              <span className="badge bg-green-100 text-green-700">⚡</span>
            )}
            <span className="text-slate-300 text-xs">{expanded ? '▲' : '▼'}</span>
          </div>
        </button>

        {/* Expanded drawer */}
        {expanded && (
          <div className="border-t border-slate-100">
            {dayData.isTakeout ? (
              <div className="px-4 py-4 text-center">
                <div className="text-3xl mb-1">🥡</div>
                <p className="text-sm text-slate-500">Sit back and enjoy your night off!</p>
              </div>
            ) : dayData.isLeftover ? (
              <div className="px-4 py-4 text-center">
                <div className="text-3xl mb-1">♻️</div>
                <p className="text-sm text-slate-500">Finishing up leftovers from earlier this week!</p>
              </div>
            ) : (
              <div className="px-4 pt-3 pb-2 space-y-3">
                {dayData.meal?.description && (
                  <p className="text-xs text-slate-500 leading-relaxed">{dayData.meal.description}</p>
                )}
                {dayData.meal?.prepNote && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800">
                    📝 {dayData.meal.prepNote}
                  </div>
                )}
                {dayData.sides?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {dayData.sides.map((s, i) => (
                      <span key={i} className="badge bg-slate-100 text-slate-600 text-xs">{s.name}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    {dayData.cook && (
                      <span className="flex items-center gap-1">
                        <span>👨‍🍳</span>
                        <span className="font-medium">{dayData.cook}</span>
                      </span>
                    )}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1">
                      <button onClick={() => handlePortionChange(-1)} className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 font-bold">−</button>
                      <span className="text-xs font-medium w-4 text-center">{portionsLocal}</span>
                      <button onClick={() => handlePortionChange(1)} className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 font-bold">+</button>
                      <span className="text-xs text-slate-400">servings</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {dayData.meal?.link && (
                      <a href={dayData.meal.link} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-2.5 py-1 rounded-lg border border-brand-200 text-brand-600 hover:bg-brand-50 transition-colors">
                        📖 Recipe ↗
                      </a>
                    )}
                    <button
                      onClick={() => setShowIngredients(v => !v)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${showIngredients ? 'bg-brand-500 text-white border-brand-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      🛒 {showIngredients ? 'Hide' : 'Ingredients'}
                    </button>
                    <button onClick={handleTakeoutToggle} disabled={saving}
                      className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                      🥡 Takeout
                    </button>
                    <button onClick={handleLeftoverToggle} disabled={saving}
                      className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                      ♻️ Leftovers
                    </button>
                    <button onClick={() => setEditOpen(true)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                      ✏️ Edit
                    </button>
                  </div>
                </div>
                {showIngredients && (
                  <div className="bg-slate-50 rounded-xl px-3 py-3 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ingredients for this meal</p>
                    {dayGroceries.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {dayGroceries.map((g, i) => (
                          <span key={i} className="text-xs bg-white border border-slate-200 rounded-full px-2.5 py-0.5 text-slate-700">{g.item}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No ingredient data — check Grocery List page for the full list.</p>
                    )}
                  </div>
                )}
                {dayData.meal?.name && (
                  <div className="pt-1">
                    <RatingStars mealName={dayData.meal.name} />
                  </div>
                )}
              </div>
            )}
            {(dayData.isTakeout || dayData.isLeftover) && (
              <div className="px-4 pb-3 flex justify-end gap-2">
                {dayData.isTakeout && (
                  <button onClick={handleTakeoutToggle} disabled={saving}
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                    🍳 Switch to Home-cooked
                  </button>
                )}
                {dayData.isLeftover && (
                  <button onClick={handleLeftoverToggle} disabled={saving}
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                    🍳 Switch to Home-cooked
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {editOpen && (
        <EditDayModal
          dayData={dayData}
          onClose={() => setEditOpen(false)}
          onSave={(updated) => { onUpdate(updated); setEditOpen(false); }}
        />
      )}
    </>
  );
}
