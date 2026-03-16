import { Routes, Route, NavLink } from 'react-router-dom';
import WeeklyPlanPage from './pages/WeeklyPlanPage.jsx';
import GroceryListPage from './pages/GroceryListPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';

const NAV = [
  { to: '/', label: '📅 This Week' },
  { to: '/grocery', label: '🛒 Grocery List' },
  { to: '/history', label: '📋 History' },
  { to: '/settings', label: '⚙️ Settings' },
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-brand-900 shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍽️</span>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Bell Family</h1>
              <p className="text-xs text-brand-300 leading-tight">Meal Planner</p>
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-brand-200 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        {/* Mobile nav */}
        <div className="sm:hidden flex border-t border-brand-800">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 text-center py-2.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-white border-b-2 border-brand-300' : 'text-brand-300 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<WeeklyPlanPage />} />
          <Route path="/grocery" element={<GroceryListPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200">
        Bell Family Meal Planner — AI-powered by Gemini
      </footer>
    </div>
  );
}
