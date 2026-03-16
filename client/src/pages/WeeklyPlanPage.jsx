import { useState, useEffect, useCallback, useRef } from 'react';
import { getMealPlan, generatePlan, toggleTakeout, deletePlan } from '../api.js';
import DayCard from '../components/DayCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PROGRESS_STEPS = [
  { pct: 8,  icon: '📋', text: 'Loading your family meals and preferences…' },
  { pct: 20, icon: '🚫', text: 'Checking allergies for Dad, Maya & Maddy…' },
  { pct: 33, icon: '⭐', text: 'Reviewing past meal ratings…' },
  { pct: 45, icon: '🗓️', text: 'Checking what you had the last two weeks…' },
  { pct: 58, icon: '🎲', text: 'Picking a Random Sunday special from your recipe site…' },
  { pct: 70, icon: '🤖', text: 'Asking Gemini AI to build the plan…' },
  { pct: 82, icon: '🛒', text: 'Compiling the grocery list…' },
  { pct: 93, icon: '✅', text: 'Almost done — putting it all together…' },
];

export default function WeeklyPlanPage() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState(null);
  const progressTimer = useRef(null);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMealPlan();
      setPlan(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setPlan(null); // No plan yet — show generate prompt
      } else {
        setPlan(null); // Server not reachable yet — silently show empty state
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  const handleGenerate = async () => {
    if (plan && !window.confirm('This will replace the current plan. Are you sure?')) return;
    setGenerating(true);
    setProgressStep(0);
    setError(null);

    // Advance through steps on a timer
    let step = 0;
    progressTimer.current = setInterval(() => {
      step = Math.min(step + 1, PROGRESS_STEPS.length - 1);
      setProgressStep(step);
    }, 3200);

    try {
      const res = await generatePlan();
      setPlan(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate plan. Check your Gemini API key.');
    } finally {
      clearInterval(progressTimer.current);
      setGenerating(false);
    }
  };

  const handleToggleTakeout = async (dayName, isTakeout) => {
    try {
      const res = await toggleTakeout(dayName, isTakeout);
      setPlan(res.data);
    } catch (err) {
      console.error('Takeout toggle failed:', err);
    }
  };

  const handleDayUpdate = (updatedPlan) => {
    setPlan(updatedPlan);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this week\'s plan entirely?')) return;
    try {
      await deletePlan();
      setPlan(null);
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  // Sort days to match canonical order
  const sortedDays = plan?.days
    ? [...plan.days].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))
    : [];

  const weekLabel = plan?.weekOf
    ? `Week of ${new Date(plan.weekOf + 'T12:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}`
    : '';

  const takeoutCount    = sortedDays.filter(d => d.isTakeout).length;
  const leftoverCount   = sortedDays.filter(d => d.isLeftover).length;
  const homeCookedCount = sortedDays.length - takeoutCount - leftoverCount;
  const quickCount      = sortedDays.filter(d => !d.isTakeout && !d.isLeftover && ['Monday','Tuesday','Wednesday','Thursday'].includes(d.day)).length;
  const cookMap         = sortedDays
    .filter(d => !d.isTakeout && !d.isLeftover && d.cook && d.cook !== 'N/A')
    .reduce((acc, d) => { acc[d.cook] = (acc[d.cook] || 0) + 1; return acc; }, {});

  if (loading) return <LoadingSpinner message="Loading meal plan…" />;

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Weekly Meal Plan</h2>
          {weekLabel && <p className="text-sm text-gray-500 mt-0.5">{weekLabel}</p>}
        </div>
        <div className="flex items-center gap-3">
          {plan && (
            <button onClick={loadPlan} className="btn-secondary text-xs">
              🔄 Refresh
            </button>
          )}
          {plan && (
            <button onClick={handleDelete} className="text-xs px-3 py-2 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-colors" title="Delete this week's plan">
              🗑️ Delete Plan
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary"
          >
            {generating ? (
              <>⏳ Generating…</>
            ) : (
              <>✨ {plan ? 'Re-generate Plan' : 'Generate This Week\'s Plan'}</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
          ⚠️ {error}
        </div>
      )}

      {!plan && !generating && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">🍽️</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No meal plan yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Click "Generate This Week's Plan" to let Gemini AI create a personalized meal plan for the Bell family — factoring in weeknight time constraints, your favourite recipes, and a Random Sunday special.
          </p>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary mx-auto">
            ✨ Generate Plan
          </button>
        </div>
      )}

      {generating && (() => {
        const step = PROGRESS_STEPS[progressStep];
        const pct = step.pct;
        return (
          <div className="card p-10 text-center">
            <div className="text-5xl mb-5">{step.icon}</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-1">Gemini is cooking up your plan…</h3>
            <p className="text-gray-500 mb-6 text-sm">{step.text}</p>
            <div className="w-full max-w-sm mx-auto bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-brand-500 h-2.5 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-3">{pct}%</p>
          </div>
        );
      })()}

      {plan && !generating && (
        <div className="lg:grid lg:grid-cols-[1fr_272px] lg:gap-8 lg:items-start">

          {/* ── Day cards ── */}
          <div>
            {/* Legend — mobile only (desktop has sidebar) */}
            <div className="flex flex-wrap gap-3 mb-5 text-xs text-gray-500 lg:hidden">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-brand-400 inline-block"></span>Random Sunday Special</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block"></span>Takeout Night</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-300 inline-block"></span>Leftover Night</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400 inline-block"></span>Quick weeknight meal</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedDays.map((dayData) => (
                <DayCard
                  key={dayData.day}
                  dayData={{
                    ...dayData,
                    groceryItems: (plan.groceryItems || []).filter(g => g.forDay === dayData.day),
                  }}
                  onToggleTakeout={handleToggleTakeout}
                  onUpdate={handleDayUpdate}
                />
              ))}
            </div>

            <p className="text-xs text-gray-400 mt-6 text-right lg:hidden">
              Generated: {new Date(plan.generatedAt).toLocaleString()}
            </p>
          </div>

          {/* ── Desktop sidebar ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">

              {/* Week at a Glance */}
              <div className="card p-5">
                <h3 className="font-semibold text-sm text-slate-700 mb-4">Week at a Glance</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">🍳 Home-cooked</span>
                    <span className="font-bold text-slate-800">{homeCookedCount} nights</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">🥡 Takeout</span>
                    <span className="font-bold text-slate-800">{takeoutCount} nights</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">♻️ Leftovers</span>
                    <span className="font-bold text-slate-800">{leftoverCount} nights</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">⚡ Quick meals</span>
                    <span className="font-bold text-slate-800">{quickCount} nights</span>
                  </div>
                </div>
              </div>

              {/* Cooking Duties */}
              {Object.keys(cookMap).length > 0 && (
                <div className="card p-5">
                  <h3 className="font-semibold text-sm text-slate-700 mb-4">👨‍🍳 Cooking Duties</h3>
                  <div className="space-y-2.5">
                    {Object.entries(cookMap).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                      <div key={name} className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 w-12">{name}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-brand-400 h-2 rounded-full transition-all"
                            style={{ width: `${(count / homeCookedCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-500 w-5 text-right">{count}×</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="card p-5">
                <h3 className="font-semibold text-sm text-slate-700 mb-3">Legend</h3>
                <div className="space-y-2 text-xs text-gray-500">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-brand-400 flex-shrink-0"></span>Random Sunday Special</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-400 flex-shrink-0"></span>Takeout Night</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-300 flex-shrink-0"></span>Leftover Night</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-400 flex-shrink-0"></span>Quick weeknight meal</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Generated: {new Date(plan.generatedAt).toLocaleString()}
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
