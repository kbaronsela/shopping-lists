import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ListsPage from './pages/ListsPage';
import { isMissingConfig } from './supabase';

function MissingConfigScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="bg-white rounded-3xl shadow-xl border border-red-100 p-8 max-w-md w-full text-center">
        <p className="text-5xl mb-4">⚙️</p>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">הגדרת Supabase חסרה</h1>
        <p className="text-slate-500 mb-6 text-sm leading-relaxed">
          האפליקציה זקוקה לפרטי התחברות ל-Supabase כדי לפעול.
        </p>
        <div className="bg-slate-50 rounded-2xl p-4 text-right text-sm text-slate-700 space-y-2">
          <p className="font-semibold text-slate-800 mb-3">אם אתה מפתח/ת:</p>
          <p>1. צור קובץ <code className="bg-slate-200 px-1 rounded">client/.env</code></p>
          <p>2. הוסף:</p>
          <pre className="bg-slate-800 text-green-400 rounded-xl p-3 text-xs text-left mt-2 overflow-auto">
{`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...`}
          </pre>
          <p className="pt-1">3. הפעל מחדש עם <code className="bg-slate-200 px-1 rounded">npm run dev</code></p>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          לפרטים ראה את README.md
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (isMissingConfig) return <MissingConfigScreen />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lists" element={<ListsPage />} />
      </Routes>
    </div>
  );
}
