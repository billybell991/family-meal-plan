import { useState } from 'react';

const MEMBER_COLORS = {
  Mom: 'bg-purple-100 text-purple-700',
  Dad: 'bg-blue-100 text-blue-700',
  Maya: 'bg-pink-100 text-pink-700',
  Maddy: 'bg-amber-100 text-amber-700',
};

const CATEGORY_ICONS = {
  kitchen: '🍽️',
  floors: '🧹',
  rooms: '🛋️',
  bathroom: '🚿',
  laundry: '👕',
  garbage: '🗑️',
  pets: '🐾',
  outdoor: '🌿',
  cooking: '👨‍🍳',
};

export default function ChoreCard({ dayData, onToggleComplete, onEditDay }) {
  const [expanded, setExpanded] = useState(false);

  const assignments = dayData.assignments || [];
  const completed = assignments.filter(a => a.isCompleted).length;
  const total = assignments.length;
  const allDone = total > 0 && completed === total;

  const isToday = dayData.day === new Date().toLocaleDateString('en-CA', { weekday: 'long' });

  const accentBorder = allDone
    ? 'border-l-4 border-green-400'
    : isToday
    ? 'border-l-4 border-indigo-500'
    : 'border-l-4 border-indigo-200';

  // Group by person (sorted alphabetically)
  const byPerson = {};
  for (const a of assignments) {
    if (!byPerson[a.assignedTo]) byPerson[a.assignedTo] = [];
    byPerson[a.assignedTo].push(a);
  }
  const sortedPersonEntries = Object.entries(byPerson).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className={`card ${accentBorder} flex flex-col`}>
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-24 flex-shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-bold text-sm ${isToday ? 'text-indigo-600' : 'text-slate-800'}`}>{dayData.day}</span>
            {isToday && <span className="badge bg-indigo-500 text-white text-xs py-0">Today</span>}
          </div>
          {dayData.date && (
            <span className="text-xs text-slate-400">
              {new Date(dayData.date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {total === 0 ? (
            <span className="text-sm text-slate-400 italic">No chores assigned</span>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-slate-700 flex-shrink-0">{total} chores</span>
              <span className="text-xs text-slate-400 flex-shrink-0">·</span>
              <div className="flex gap-1 min-w-0 overflow-hidden">
                {Object.keys(byPerson).map(name => (
                  <span key={name} className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${MEMBER_COLORS[name] || 'bg-slate-100 text-slate-600'}`}>
                    <span className="sm:hidden">{name[0]}</span>
                    <span className="hidden sm:inline">{name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {total > 0 && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${allDone ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {completed}/{total}
            </span>
          )}
          {onEditDay && (
            <button
              onClick={e => { e.stopPropagation(); onEditDay(dayData); }}
              className="text-xs px-2 py-1 rounded text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              title="Edit chore assignments"
            >✏️</button>
          )}
          <span className="text-slate-300 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          {sortedPersonEntries.map(([name, chores]) => (
            <div key={name}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${MEMBER_COLORS[name]?.split(' ')[1] || 'text-slate-500'}`}>
                {name}
              </p>
              <div className="space-y-1">
                {chores.map((a, i) => (
                  <label
                    key={`${a.choreId}-${i}`}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      a.isCompleted ? 'bg-green-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={a.isCompleted}
                      onChange={() => onToggleComplete(dayData.day, a.choreId, a.assignedTo, !a.isCompleted)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
                    />
                    <span className="text-sm mr-1">{CATEGORY_ICONS[a.category] || '🧹'}</span>
                    <span className={`text-sm ${a.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {a.choreName}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
