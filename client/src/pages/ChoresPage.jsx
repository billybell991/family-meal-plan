import { useState, useEffect, useCallback, useRef } from 'react';
import { getChorePlan, generateChorePlan, deleteChorePlan, toggleChoreComplete, getChoreDefinitions, addChoreDefinition, updateChoreDefinition, deleteChoreDefinition } from '../api.js';
import ChoreCard from '../components/ChoreCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CATEGORIES = ['kitchen', 'floors', 'rooms', 'bathroom', 'laundry', 'garbage', 'pets', 'outdoor', 'cooking', 'other'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly'];
const CATEGORY_ICONS = {
  kitchen: '🍽️', floors: '🧹', rooms: '🛋️', bathroom: '🚿', laundry: '👕',
  garbage: '🗑️', pets: '🐾', outdoor: '🌿', cooking: '👨‍🍳', other: '📋',
};

const PROGRESS_STEPS = [
  { pct: 10, icon: '📋', text: 'Loading chore library and preferences…' },
  { pct: 30, icon: '👨‍👩‍👧‍👦', text: 'Checking family member availability…' },
  { pct: 50, icon: '📊', text: 'Reviewing recent chore history for fairness…' },
  { pct: 70, icon: '🤖', text: 'Asking Gemini AI to assign chores…' },
  { pct: 90, icon: '✅', text: 'Almost done — building the schedule…' },
];

export default function ChoresPage() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState(null);
  const progressTimer = useRef(null);

  // Chore library state
  const [choreLibrary, setChoreLibrary] = useState([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [newChore, setNewChore] = useState({ name: '', category: 'rooms', difficulty: 'easy', estimatedMinutes: 15, frequency: 'weekly', ageMin: 10 });
  const [editingChore, setEditingChore] = useState(null);
  const [libraryFilter, setLibraryFilter] = useState('all');

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getChorePlan();
      setPlan(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setPlan(null);
      } else {
        setPlan(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChoreLibrary = useCallback(async () => {
    try {
      const res = await getChoreDefinitions();
      setChoreLibrary(res.data.choreDefinitions || []);
    } catch (err) {
      console.error('Failed to load chore library:', err);
    }
  }, []);

  useEffect(() => { loadPlan(); loadChoreLibrary(); }, [loadPlan, loadChoreLibrary]);

  const handleGenerate = async () => {
    if (plan && !window.confirm('This will replace the current chore plan. Are you sure?')) return;
    setGenerating(true);
    setProgressStep(0);
    setError(null);

    let step = 0;
    progressTimer.current = setInterval(() => {
      step = Math.min(step + 1, PROGRESS_STEPS.length - 1);
      setProgressStep(step);
    }, 3200);

    try {
      const res = await generateChorePlan();
      setPlan(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate chore plan.');
    } finally {
      clearInterval(progressTimer.current);
      setGenerating(false);
    }
  };

  const handleToggleComplete = async (day, choreId, assignedTo, isCompleted) => {
    try {
      const res = await toggleChoreComplete(day, choreId, assignedTo, isCompleted);
      setPlan(res.data);
    } catch (err) {
      console.error('Toggle complete failed:', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this week\'s chore plan entirely?')) return;
    try {
      await deleteChorePlan();
      setPlan(null);
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  // Chore library handlers
  const handleAddChore = async () => {
    if (!newChore.name.trim()) return;
    try {
      await addChoreDefinition(newChore);
      await loadChoreLibrary();
      setNewChore({ name: '', category: 'rooms', difficulty: 'easy', estimatedMinutes: 15, frequency: 'weekly', ageMin: 10 });
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to add chore.';
      alert(msg);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingChore || !editingChore.name.trim()) return;
    try {
      await updateChoreDefinition(editingChore.id, editingChore);
      await loadChoreLibrary();
      setEditingChore(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update chore.');
    }
  };

  const handleDeleteChore = async (id) => {
    if (!window.confirm('Remove this chore from the library? It won\'t affect the current plan.')) return;
    try {
      await deleteChoreDefinition(id);
      await loadChoreLibrary();
    } catch (err) {
      console.error('Delete chore failed:', err);
    }
  };

  const filteredLibrary = libraryFilter === 'all'
    ? choreLibrary
    : choreLibrary.filter(c => c.category === libraryFilter);

  const groupedChores = filteredLibrary.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  const sortedDays = plan?.days
    ? [...plan.days].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))
    : [];

  const weekLabel = plan?.weekOf
    ? `Week of ${new Date(plan.weekOf + 'T12:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}`
    : '';

  // Stats
  const totalChores = sortedDays.reduce((acc, d) => acc + (d.assignments?.length || 0), 0);
  const completedChores = sortedDays.reduce((acc, d) => acc + (d.assignments?.filter(a => a.isCompleted).length || 0), 0);
  const memberStats = {};
  for (const d of sortedDays) {
    for (const a of (d.assignments || [])) {
      if (!memberStats[a.assignedTo]) memberStats[a.assignedTo] = { total: 0, done: 0 };
      memberStats[a.assignedTo].total++;
      if (a.isCompleted) memberStats[a.assignedTo].done++;
    }
  }

  if (loading) return <LoadingSpinner message="Loading chore plan…" />;

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Weekly Chore Plan</h2>
          {weekLabel && <p className="text-sm text-gray-500 mt-0.5">{weekLabel}</p>}
        </div>
        <div className="flex items-center gap-3">
          {plan && (
            <button onClick={loadPlan} className="btn-secondary text-xs">🔄 Refresh</button>
          )}
          {plan && (
            <button onClick={handleDelete} className="text-xs px-3 py-2 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-colors">
              🗑️ Delete Plan
            </button>
          )}
          <button onClick={handleGenerate} disabled={generating} className="btn-primary">
            {generating ? '⏳ Generating…' : `🧹 ${plan ? 'Re-generate Chores' : 'Generate Chore Plan'}`}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">⚠️ {error}</div>
      )}

      {!plan && !generating && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">🧹</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No chore plan yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Click "Generate Chore Plan" to let Gemini AI create fair, balanced chore assignments for everyone in the family.
          </p>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary mx-auto">🧹 Generate Chore Plan</button>
        </div>
      )}

      {generating && (() => {
        const step = PROGRESS_STEPS[progressStep];
        return (
          <div className="card p-10 text-center">
            <div className="text-5xl mb-5">{step.icon}</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-1">Gemini is assigning chores…</h3>
            <p className="text-gray-500 mb-6 text-sm">{step.text}</p>
            <div className="w-full max-w-sm mx-auto bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-700 ease-out" style={{ width: `${step.pct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-3">{step.pct}%</p>
          </div>
        );
      })()}

      {plan && !generating && (
        <div className="lg:grid lg:grid-cols-[1fr_272px] lg:gap-8 lg:items-start">
          <div>
            <div className="grid grid-cols-1 gap-4">
              {sortedDays.map(dayData => (
                <ChoreCard
                  key={dayData.day}
                  dayData={dayData}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-6 text-right lg:hidden">
              Generated: {new Date(plan.generatedAt).toLocaleString()}
            </p>
          </div>

          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              {/* Progress */}
              <div className="card p-5">
                <h3 className="font-semibold text-sm text-slate-700 mb-4">Overall Progress</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-3 rounded-full transition-all"
                      style={{ width: `${totalChores > 0 ? (completedChores / totalChores) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{completedChores}/{totalChores}</span>
                </div>
                <p className="text-xs text-slate-400">
                  {totalChores > 0 ? Math.round((completedChores / totalChores) * 100) : 0}% complete
                </p>
              </div>

              {/* Per member */}
              {Object.keys(memberStats).length > 0 && (
                <div className="card p-5">
                  <h3 className="font-semibold text-sm text-slate-700 mb-4">👨‍👩‍👧‍👦 Member Progress</h3>
                  <div className="space-y-2.5">
                    {Object.entries(memberStats).sort((a, b) => b[1].total - a[1].total).map(([name, stats]) => (
                      <div key={name} className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 w-14">{name}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-indigo-400 h-2 rounded-full transition-all"
                            style={{ width: `${stats.total > 0 ? (stats.done / stats.total) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-500 w-8 text-right">{stats.done}/{stats.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 text-center">
                Generated: {new Date(plan.generatedAt).toLocaleString()}
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* ── Chore Library Management ─────────────────────────────── */}
      <div className="mt-10">
        <button
          onClick={() => setLibraryOpen(v => !v)}
          className="flex items-center gap-2 text-lg font-semibold text-gray-800 hover:text-indigo-600 transition-colors mb-4"
        >
          <span className={`transform transition-transform ${libraryOpen ? 'rotate-90' : ''}`}>▶</span>
          📚 Chore Library ({choreLibrary.length})
        </button>

        {libraryOpen && (
          <div className="space-y-4">
            {/* Add new chore form */}
            <div className="card p-5 space-y-3">
              <h4 className="font-semibold text-gray-700 text-sm">Add New Chore</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={newChore.name}
                  onChange={e => setNewChore(c => ({ ...c, name: e.target.value }))}
                  placeholder="Chore name…"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 sm:col-span-2 lg:col-span-1"
                />
                <select
                  value={newChore.category}
                  onChange={e => setNewChore(c => ({ ...c, category: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
                <select
                  value={newChore.difficulty}
                  onChange={e => setNewChore(c => ({ ...c, difficulty: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {DIFFICULTIES.map(d => (
                    <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                  <select
                    value={newChore.frequency}
                    onChange={e => setNewChore(c => ({ ...c, frequency: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {FREQUENCIES.map(f => (
                      <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Est. Minutes</label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    step="5"
                    value={newChore.estimatedMinutes}
                    onChange={e => setNewChore(c => ({ ...c, estimatedMinutes: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min Age</label>
                  <input
                    type="number"
                    min="5"
                    max="99"
                    value={newChore.ageMin}
                    onChange={e => setNewChore(c => ({ ...c, ageMin: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddChore}
                    disabled={!newChore.name.trim()}
                    className="btn-primary text-sm w-full"
                  >
                    + Add Chore
                  </button>
                </div>
              </div>
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setLibraryFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  libraryFilter === 'all'
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                All ({choreLibrary.length})
              </button>
              {CATEGORIES.filter(cat => choreLibrary.some(c => c.category === cat)).map(cat => {
                const count = choreLibrary.filter(c => c.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setLibraryFilter(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      libraryFilter === cat
                        ? 'bg-indigo-500 text-white border-indigo-500'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
                  </button>
                );
              })}
            </div>

            {/* Edit modal inline */}
            {editingChore && (
              <div className="card p-5 border-2 border-indigo-300 space-y-3">
                <h4 className="font-semibold text-indigo-700 text-sm">✏️ Editing: {editingChore.name}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={editingChore.name}
                    onChange={e => setEditingChore(c => ({ ...c, name: e.target.value }))}
                    className="rounded-lg border border-indigo-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 sm:col-span-2 lg:col-span-1"
                  />
                  <select
                    value={editingChore.category}
                    onChange={e => setEditingChore(c => ({ ...c, category: e.target.value }))}
                    className="rounded-lg border border-indigo-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                  <select
                    value={editingChore.difficulty}
                    onChange={e => setEditingChore(c => ({ ...c, difficulty: e.target.value }))}
                    className="rounded-lg border border-indigo-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {DIFFICULTIES.map(d => (
                      <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                    <select
                      value={editingChore.frequency}
                      onChange={e => setEditingChore(c => ({ ...c, frequency: e.target.value }))}
                      className="w-full rounded-lg border border-indigo-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      {FREQUENCIES.map(f => (
                        <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Est. Minutes</label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      step="5"
                      value={editingChore.estimatedMinutes}
                      onChange={e => setEditingChore(c => ({ ...c, estimatedMinutes: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-indigo-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Min Age</label>
                    <input
                      type="number"
                      min="5"
                      max="99"
                      value={editingChore.ageMin}
                      onChange={e => setEditingChore(c => ({ ...c, ageMin: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-indigo-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button onClick={handleSaveEdit} className="btn-primary text-sm flex-1">💾 Save</button>
                    <button onClick={() => setEditingChore(null)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Chore list grouped by category */}
            <div className="space-y-3">
              {Object.entries(groupedChores)
                .sort(([a], [b]) => CATEGORIES.indexOf(a) - CATEGORIES.indexOf(b))
                .map(([category, chores]) => (
                  <div key={category} className="card p-4">
                    <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      {CATEGORY_ICONS[category] || '📋'} {category}
                    </h4>
                    <div className="space-y-1.5">
                      {chores.sort((a, b) => a.name.localeCompare(b.name)).map(chore => (
                        <div
                          key={chore.id}
                          className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-50 group transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-sm text-gray-800 truncate">{chore.name}</span>
                            <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                chore.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                chore.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {chore.difficulty}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                {chore.frequency}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                ~{chore.estimatedMinutes}min
                              </span>
                              {chore.ageMin > 10 && (
                                <span className="text-[10px] text-gray-400">
                                  {chore.ageMin}+
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              onClick={() => setEditingChore({ ...chore })}
                              className="text-xs px-2 py-1 rounded text-indigo-500 hover:bg-indigo-50 transition-colors"
                              title="Edit chore"
                            >✏️</button>
                            <button
                              onClick={() => handleDeleteChore(chore.id)}
                              className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-50 transition-colors"
                              title="Remove chore"
                            >✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              {filteredLibrary.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {libraryFilter === 'all' ? 'No chores in the library yet. Add one above!' : `No chores in "${libraryFilter}" category.`}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
