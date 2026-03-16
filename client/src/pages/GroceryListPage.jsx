import { useState, useEffect, useCallback } from 'react';
import { getGroceryList, addCustomGroceryItem, removeGroceryItem } from '../api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const SECTION_ICONS = {
  'Meat & Seafood': '🥩',
  'Dairy & Eggs': '🧀',
  'Produce': '🥦',
  'Bread & Grains': '🍞',
  'Pantry & Condiments': '🫙',
  'Snacks': '🍿',
  'Beverages': '🧃',
  'Other': '🛒',
};

const SECTION_ORDER = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Bread & Grains', 'Pantry & Condiments', 'Snacks', 'Beverages', 'Other'];

export default function GroceryListPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('grocery-checked') || '{}'); } catch { return {}; }
  });
  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getGroceryList();
      // Clear check-off state when the week changes
      const storedWeek = localStorage.getItem('grocery-week');
      if (storedWeek !== res.data.weekOf) {
        setChecked({});
        try { localStorage.removeItem('grocery-checked'); localStorage.setItem('grocery-week', res.data.weekOf || ''); } catch {}
      }
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 404) setData(null);
      else setError('Failed to load grocery list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const toggleCheck = (item) => {
    setChecked(prev => {
      const next = { ...prev, [item]: !prev[item] };
      try { localStorage.setItem('grocery-checked', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const clearChecked = () => {
    setChecked({});
    try { localStorage.removeItem('grocery-checked'); } catch {}
  };

  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    setAdding(true);
    try {
      await addCustomGroceryItem(newItem.trim());
      setNewItem('');
      await loadList();
    } catch (e) {
      console.error('Add item failed', e);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveItem = async (item) => {
    try {
      await removeGroceryItem(item);
      await loadList();
    } catch (e) {
      console.error('Remove item failed', e);
    }
  };

  const handlePrint = () => window.print();

  if (loading) return <LoadingSpinner message="Building grocery list…" />;

  const orderedSections = !data?.sections
    ? []
    : [
        ...SECTION_ORDER.filter(s => data.sections[s]),
        ...Object.keys(data.sections).filter(s => !SECTION_ORDER.includes(s)),
      ];

  const totalUnchecked = orderedSections.reduce((sum, sec) => {
    return sum + (data.sections[sec] || []).filter(i => !checked[i.item]).length;
  }, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Grocery List</h2>
          {data?.weekOf && (
            <p className="text-sm text-gray-500 mt-0.5">
              Week of {new Date(data.weekOf + 'T12:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
              {' '}&mdash; <strong>{totalUnchecked}</strong> items remaining
            </p>
          )}
        </div>
        <div className="flex gap-2 print:hidden">
          {Object.values(checked).some(Boolean) && (
            <button onClick={clearChecked} className="btn-secondary text-xs">✅ Clear Checked</button>
          )}
          <button onClick={handlePrint} className="btn-secondary">🖨️ Print List</button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">⚠️ {error}</div>}

      {!data && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">🛒</div>
          <p className="text-gray-500">No meal plan found. Generate a weekly plan first, then your grocery list will appear here.</p>
        </div>
      )}

      {data && (
        <>
          {/* Add custom item */}
          <div className="card px-4 py-3 mb-5 print:hidden">
            <div className="flex gap-2">
              <input
                type="text"
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                placeholder="Add a custom grocery item…"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button
                onClick={handleAddItem}
                disabled={adding || !newItem.trim()}
                className="btn-primary"
              >
                {adding ? '…' : '+ Add'}
              </button>
            </div>
          </div>

          {/* Tip */}
          <p className="text-xs text-gray-400 mb-4 print:hidden">Tip: Tap an item to check it off as you shop. Takeout nights are excluded.</p>

          {/* Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orderedSections.map(section => {
              const items = data.sections[section] || [];
              const unchecked = items.filter(i => !checked[i.item]).length;
              return (
                <div key={section} className="card print:shadow-none print:border">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{SECTION_ICONS[section] || '🛒'}</span>
                      <span className="font-semibold text-gray-800">{section}</span>
                    </div>
                    <span className="text-xs text-gray-400">{unchecked}/{items.length}</span>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {items.map((gi, i) => (
                      <li
                        key={i}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors group ${checked[gi.item] ? 'opacity-40' : ''}`}
                        onClick={() => toggleCheck(gi.item)}
                      >
                        <span className="text-lg flex-shrink-0">
                          {checked[gi.item] ? '✅' : '⬜'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium ${checked[gi.item] ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {gi.item}
                          </span>
                          {gi.forMeal && gi.forDay !== 'Custom' && (
                            <span className="text-xs text-gray-400 block truncate">
                              {gi.forDay} · {gi.forMeal}
                            </span>
                          )}
                          {gi.forDay === 'Custom' && (
                            <span className="text-xs text-brand-400 block">Custom item</span>
                          )}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleRemoveItem(gi.item); }}
                          className="text-xs text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden ml-2"
                          title="Remove from list"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
