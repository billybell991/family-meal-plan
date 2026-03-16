import { useState, useEffect } from 'react';
import { getPlanHistory, clearHistory } from '../api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const loadHistory = () => {
    getPlanHistory()
      .then(res => setHistory(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all plan history? This cannot be undone.')) return;
    await clearHistory();
    setHistory([]);
  };

  if (loading) return <LoadingSpinner message="Loading history…" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Plan History</h2>
        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="text-xs px-3 py-2 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-colors"
          >
            🗑️ Clear History
          </button>
        )}
      </div>

      {history.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-gray-500">No history yet. Plans will appear here after the first week.</p>
        </div>
      )}

      <div className="space-y-3">
        {history.map((entry, i) => {
          const isOpen = expanded === i;
          const label = entry.weekOf
            ? `Week of ${new Date(entry.weekOf + 'T12:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}`
            : `Plan ${i + 1}`;
          const sortedDays = entry.plan?.days
            ? [...entry.plan.days].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))
            : [];

          return (
            <div key={i} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="text-left">
                  <p className="font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Saved {new Date(entry.savedAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-gray-400 text-lg">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sortedDays.map(day => (
                      <div key={day.day} className={`rounded-xl border p-3 ${
                        day.isTakeout ? 'border-blue-100 bg-blue-50'
                        : day.isLeftover ? 'border-orange-100 bg-orange-50'
                        : 'border-gray-100 bg-gray-50'
                      }`}>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{day.day}</p>
                        {day.isTakeout ? (
                          <p className="text-sm font-medium text-blue-700">🥡 Takeout Night</p>
                        ) : day.isLeftover ? (
                          <p className="text-sm font-medium text-orange-600">♻️ Leftover Night</p>
                        ) : (
                          <>
                            {day.meal?.link ? (
                              <a href={day.meal.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-700 hover:underline">
                                {day.meal?.name || '—'} ↗
                              </a>
                            ) : (
                              <p className="text-sm font-medium text-gray-800">{day.meal?.name || '—'}</p>
                            )}
                            {day.sides?.length > 0 && (
                              <p className="text-xs text-gray-400 mt-1">+ {day.sides.map(s => s.name).join(', ')}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">👨‍🍳 {day.cook}</p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
