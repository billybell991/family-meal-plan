import { useState, useEffect, useRef } from 'react';

const FAMILY = ['Mom', 'Dad', 'Maya', 'Maddy'];

const MEMBER_COLORS = {
  Mom:   { selected: 'bg-purple-500 text-white border-purple-500', idle: 'border-purple-200 text-purple-600 hover:bg-purple-50' },
  Dad:   { selected: 'bg-blue-500 text-white border-blue-500',     idle: 'border-blue-200 text-blue-600 hover:bg-blue-50' },
  Maya:  { selected: 'bg-pink-500 text-white border-pink-500',     idle: 'border-pink-200 text-pink-600 hover:bg-pink-50' },
  Maddy: { selected: 'bg-amber-500 text-white border-amber-500',   idle: 'border-amber-200 text-amber-600 hover:bg-amber-50' },
};

const CATEGORY_ICONS = {
  kitchen: '🍽️', floors: '🧹', rooms: '🛋️', bathroom: '🚿', laundry: '👕',
  garbage: '🗑️', pets: '🐾', outdoor: '🌿', cooking: '👨‍🍳', other: '📋',
};

function AssigneePicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {FAMILY.map(name => {
        const colors = MEMBER_COLORS[name] || { selected: 'bg-gray-500 text-white', idle: 'text-gray-600' };
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            className={`px-2 py-0.5 rounded-full border text-xs font-medium transition-colors ${
              value === name ? colors.selected : colors.idle
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}

export default function EditDayChoresModal({ dayData, choreLibrary, onClose, onSave }) {
  const [assignments, setAssignments] = useState(
    (dayData.assignments || []).map(a => ({ ...a }))
  );
  const [addChoreId, setAddChoreId] = useState('');
  const [addAssignee, setAddAssignee] = useState('Mom');
  const [choreSearch, setChoreSearch] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('keydown', handler);
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  const selectedLibraryChore = choreLibrary.find(c => c.id === addChoreId);

  const filteredLibrary = choreLibrary.filter(c =>
    c.name.toLowerCase().includes(choreSearch.toLowerCase())
  );

  const handleReassign = (idx, newPerson) => {
    setAssignments(prev => prev.map((a, i) => i === idx ? { ...a, assignedTo: newPerson } : a));
  };

  const handleRemove = (idx) => {
    setAssignments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddChore = () => {
    if (!addChoreId) return;
    const chore = choreLibrary.find(c => c.id === addChoreId);
    if (!chore) return;
    setAssignments(prev => [
      ...prev,
      {
        choreId: chore.id,
        choreName: chore.name,
        category: chore.category,
        assignedTo: addAssignee,
        isCompleted: false,
      },
    ]);
    setAddChoreId('');
    setChoreSearch('');
    setDropOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(dayData.day, assignments);
    } catch {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg text-gray-900">✏️ Edit {dayData.day}'s Chores</h3>
            {dayData.date && (
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(dayData.date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl p-1 -mr-1 rounded-full transition-colors"
            aria-label="Close"
          >✕</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-grow min-h-0 overflow-y-auto px-6 py-4 space-y-3">

          {assignments.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center py-4">No chores assigned yet. Add one below.</p>
          )}

          {assignments.map((a, idx) => (
            <div key={`${a.choreId}-${idx}`} className="flex flex-col gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base flex-shrink-0">{CATEGORY_ICONS[a.category] || '📋'}</span>
                  <span className={`text-sm font-medium truncate ${a.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {a.choreName}
                  </span>
                  {a.isCompleted && (
                    <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full flex-shrink-0">done</span>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(idx)}
                  className="text-red-300 hover:text-red-500 text-sm px-1.5 py-0.5 rounded transition-colors flex-shrink-0"
                  title="Remove this assignment"
                >✕</button>
              </div>
              <AssigneePicker value={a.assignedTo} onChange={(name) => handleReassign(idx, name)} />
            </div>
          ))}

          {/* Add chore row */}
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add a chore</p>

            {/* Chore picker dropdown */}
            <div ref={dropRef} className="relative">
              <button
                type="button"
                onClick={() => { setDropOpen(v => !v); }}
                className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white hover:bg-gray-50 transition-colors"
              >
                <span className={selectedLibraryChore ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedLibraryChore
                    ? `${CATEGORY_ICONS[selectedLibraryChore.category] || '📋'} ${selectedLibraryChore.name}`
                    : 'Pick a chore from the library…'}
                </span>
                <span className="text-gray-400 ml-2 text-xs">{dropOpen ? '▲' : '▼'}</span>
              </button>

              {dropOpen && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg flex flex-col max-h-52 overflow-hidden">
                  <div className="p-2 border-b border-gray-100 flex-shrink-0">
                    <input
                      autoFocus
                      type="text"
                      value={choreSearch}
                      onChange={e => setChoreSearch(e.target.value)}
                      placeholder="Search chores…"
                      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div className="flex-grow overflow-y-auto">
                    {filteredLibrary.map(chore => (
                      <button
                        key={chore.id}
                        type="button"
                        onClick={() => { setAddChoreId(chore.id); setChoreSearch(''); setDropOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm border-b border-gray-50 last:border-0 transition-colors flex items-center gap-2 ${
                          addChoreId === chore.id
                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                            : 'hover:bg-gray-50 text-gray-800'
                        }`}
                      >
                        <span>{CATEGORY_ICONS[chore.category] || '📋'}</span>
                        <span className="flex-1 truncate">{chore.name}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{chore.category}</span>
                      </button>
                    ))}
                    {filteredLibrary.length === 0 && (
                      <p className="px-3 py-3 text-sm text-gray-400 italic">No matches</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Assignee picker for new chore */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 whitespace-nowrap">Assign to:</span>
              <AssigneePicker value={addAssignee} onChange={setAddAssignee} />
            </div>

            <button
              onClick={handleAddChore}
              disabled={!addChoreId}
              className="btn-primary text-sm w-full"
            >
              ➕ Add to {dayData.day}
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
            {saving ? 'Saving…' : '💾 Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
}
