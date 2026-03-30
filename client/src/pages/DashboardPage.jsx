import { useState, useEffect, useCallback } from 'react';
import { getMealPlan, getChorePlan, toggleChoreComplete, toggleTakeout, toggleLeftover } from '../api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TODAY_DATE = new Date().toISOString().slice(0, 10);

const MEMBER_COLORS = {
  Mom: 'bg-purple-100 text-purple-700 border-purple-200',
  Dad: 'bg-blue-100 text-blue-700 border-blue-200',
  Maya: 'bg-pink-100 text-pink-700 border-pink-200',
  Maddy: 'bg-amber-100 text-amber-700 border-amber-200',
};

const MEMBER_DOTS = {
  Mom: 'bg-purple-500',
  Dad: 'bg-blue-500',
  Maya: 'bg-pink-500',
  Maddy: 'bg-amber-500',
};

export default function DashboardPage() {
  const [mealPlan, setMealPlan] = useState(null);
  const [chorePlan, setChorePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [mealRes, choreRes] = await Promise.allSettled([getMealPlan(), getChorePlan()]);
    if (mealRes.status === 'fulfilled') {
      setMealPlan(mealRes.value.data);
      // Auto-expand today
      const todayEntry = mealRes.value.data?.days?.find(d => d.date === TODAY_DATE);
      if (todayEntry) setExpandedDay(todayEntry.day);
    }
    if (choreRes.status === 'fulfilled') setChorePlan(choreRes.value.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleChoreToggle = async (day, choreId, assignedTo, isCompleted) => {
    try {
      const res = await toggleChoreComplete(day, choreId, assignedTo, isCompleted);
      setChorePlan(res.data);
    } catch (err) {
      console.error('Toggle complete failed:', err);
    }
  };

  const sortedDays = (() => {
    const all = DAY_ORDER.map(dayName => {
      const meal = mealPlan?.days?.find(d => d.day === dayName) || null;
      const chore = chorePlan?.days?.find(d => d.day === dayName) || null;
      return { day: dayName, meal, chore };
    });
    // Rotate so the week starts from the weekOf date (Sunday) — no reordering
    return all;
  })();

  // Stats
  const totalChores = chorePlan?.days?.reduce((acc, d) => acc + (d.assignments?.length || 0), 0) || 0;
  const completedChores = chorePlan?.days?.reduce((acc, d) => acc + (d.assignments?.filter(a => a.isCompleted).length || 0), 0) || 0;
  const mealCount = mealPlan?.days?.filter(d => !d.isTakeout && !d.isLeftover && d.meal?.name).length || 0;
  const takeoutCount = mealPlan?.days?.filter(d => d.isTakeout).length || 0;

  if (loading) return <LoadingSpinner message="Loading your week…" />;

  const hasAnyData = mealPlan || chorePlan;
  const weekLabel = mealPlan?.weekOf || chorePlan?.weekOf
    ? `Week of ${new Date((mealPlan?.weekOf || chorePlan?.weekOf) + 'T12:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}`
    : '';

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Week</h2>
          {weekLabel && <p className="text-sm text-gray-500 mt-0.5">{weekLabel}</p>}
        </div>
        <button onClick={loadData} className="btn-secondary text-xs">🔄 Refresh</button>
      </div>

      {!hasAnyData && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Nothing planned yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Head over to Meal Plan or Chores to generate your weekly plans, then come back here for the full picture.
          </p>
        </div>
      )}

      {hasAnyData && (
        <div className="lg:grid lg:grid-cols-[1fr_240px] lg:gap-8 lg:items-start">
          <div className="space-y-3">
            {sortedDays.map(({ day, meal, chore }) => {
              const isToday = meal?.date === TODAY_DATE;
              const isExpanded = expandedDay === day;
              const assignments = chore?.assignments || [];
              const completedCount = assignments.filter(a => a.isCompleted).length;

              return (
                <div key={day} className={`card border-l-4 ${isToday ? 'border-brand-500 ring-2 ring-brand-200 shadow-lg' : 'border-slate-200'} flex flex-col`}>
                  <button
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedDay(isExpanded ? null : day)}
                  >
                    <div className="w-20 flex-shrink-0">
                      <span className={`font-bold text-sm ${isToday ? 'text-brand-600' : 'text-slate-800'}`}>{day}</span>
                      {isToday && <span className="badge bg-brand-500 text-white text-xs py-0 ml-1">Today</span>}
                      {meal?.date && (
                        <div className="text-xs text-slate-400">
                          {new Date(meal.date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      {/* Meal summary */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm">🍽️</span>
                        {meal?.isTakeout ? (
                          <span className="text-sm font-medium text-blue-600">Takeout</span>
                        ) : meal?.isLeftover ? (
                          <span className="text-sm font-medium text-orange-500">Leftovers</span>
                        ) : meal?.meal?.name ? (
                          <span className="text-sm font-medium text-slate-700 truncate">{meal.meal.name}</span>
                        ) : (
                          <span className="text-sm text-slate-400 italic">No meal</span>
                        )}
                        {/* Cook with color dot */}
                        {meal?.cook && !meal?.isTakeout && !meal?.isLeftover && (
                          <span className="flex items-center gap-1 ml-1 flex-shrink-0">
                            <span className={`w-2 h-2 rounded-full ${MEMBER_DOTS[meal.cook] || 'bg-slate-400'}`}></span>
                            <span className="text-xs text-slate-500">{meal.cook}</span>
                          </span>
                        )}
                      </div>

                      {/* Chore summary */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">🧹</span>
                        {assignments.length > 0 ? (
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                            completedCount === assignments.length ? 'bg-green-100 text-green-700' : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {completedCount}/{assignments.length} chores
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">No chores</span>
                        )}
                      </div>
                    </div>

                    <span className="text-slate-300 text-xs flex-shrink-0">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Meal detail */}
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">🍽️ Dinner</p>
                        {meal?.isTakeout ? (
                          <div className="text-center py-3">
                            <div className="text-2xl mb-1">🥡</div>
                            <p className="text-sm text-slate-500">Takeout Night</p>
                          </div>
                        ) : meal?.isLeftover ? (
                          <div className="text-center py-3">
                            <div className="text-2xl mb-1">♻️</div>
                            <p className="text-sm text-slate-500">Leftover Night</p>
                          </div>
                        ) : meal?.meal?.name ? (
                          <div className="space-y-1.5">
                            <p className="text-sm font-semibold text-slate-800">{meal.meal.name}</p>
                            {meal.meal.description && <p className="text-xs text-slate-500">{meal.meal.description}</p>}
                            {meal.sides?.length > 0 && (
                              <p className="text-xs text-slate-400">+ {meal.sides.map(s => s.name).join(', ')}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              {meal.cook && <span>👨‍🍳 {meal.cook}</span>}
                              {meal.meal.link && (
                                <a href={meal.meal.link} target="_blank" rel="noopener noreferrer"
                                  className="text-brand-600 hover:underline">📖 Recipe ↗</a>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 italic">No meal set</p>
                        )}
                      </div>

                      {/* Chore detail */}
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">🧹 Chores</p>
                        {assignments.length === 0 ? (
                          <p className="text-sm text-slate-400 italic">No chores</p>
                        ) : (
                          <div className="space-y-1">
                            {[...assignments].sort((a, b) => a.assignedTo.localeCompare(b.assignedTo)).map((a, i) => (
                              <label
                                key={`${a.choreId}-${i}`}
                                className={`flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer transition-colors ${
                                  a.isCompleted ? 'bg-green-50' : 'hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={a.isCompleted}
                                  onChange={() => handleChoreToggle(day, a.choreId, a.assignedTo, !a.isCompleted)}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
                                />
                                <span className={`text-xs ${a.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                  {a.choreName}
                                </span>
                                <span className={`text-xs px-1.5 py-0 rounded-full ml-auto ${MEMBER_COLORS[a.assignedTo] || 'bg-slate-100 text-slate-500'}`}>
                                  {a.assignedTo}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              {/* Quick stats */}
              <div className="card p-5">
                <h3 className="font-semibold text-sm text-slate-700 mb-4">Week at a Glance</h3>
                <div className="space-y-3">
                  {mealPlan && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">🍳 Home-cooked</span>
                        <span className="font-bold text-slate-800">{mealCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">🥡 Takeout</span>
                        <span className="font-bold text-slate-800">{takeoutCount}</span>
                      </div>
                    </>
                  )}
                  {chorePlan && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">🧹 Chores</span>
                        <span className="font-bold text-slate-800">{completedChores}/{totalChores}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
                        <div
                          className="bg-indigo-500 h-2 rounded-full transition-all"
                          style={{ width: `${totalChores > 0 ? (completedChores / totalChores) * 100 : 0}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="card p-5">
                <h3 className="font-semibold text-sm text-slate-700 mb-3">Legend</h3>
                <div className="space-y-2 text-xs text-gray-500">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-brand-500 flex-shrink-0"></span>Today</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-400 flex-shrink-0"></span>All chores done</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-400 flex-shrink-0"></span>Chores in progress</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
