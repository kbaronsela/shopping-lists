import { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import { fetchLists, deleteItem, updateItemQuantity, createList, deleteList } from '../api';
import { List } from '../types';

const EMOJI_MAP: Record<string, string> = {
  סופר: '🛒',
  טמבוריה: '🔧',
  פארם: '💊',
  מקס: '🏬',
};

function getListEmoji(name: string): string {
  return EMOJI_MAP[name] ?? '📋';
}

export default function ListsPage() {
  const [lists, setLists] = useState<List[]>([]);
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newListName, setNewListName] = useState('');
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [deletingItem, setDeletingItem] = useState<number | null>(null);

  const loadLists = useCallback(async () => {
    try {
      const data = await fetchLists();
      setLists(data);
      if (data.length > 0 && activeListId === null) {
        setActiveListId(data[0].id);
      }
    } catch {
      setError('שגיאה בטעינת הרשימות');
    } finally {
      setIsLoading(false);
    }
  }, [activeListId]);

  useEffect(() => {
    void loadLists();
  }, []);

  async function handleDeleteItem(listId: number, itemId: number) {
    setDeletingItem(itemId);
    try {
      await deleteItem(listId, itemId);
      setLists((prev) =>
        prev.map((list) =>
          list.id === listId
            ? { ...list, items: list.items.filter((i) => i.id !== itemId) }
            : list
        )
      );
    } catch {
      setError('שגיאה במחיקת הפריט');
    } finally {
      setDeletingItem(null);
    }
  }

  async function handleUpdateQuantity(listId: number, itemId: number, delta: number) {
    const list = lists.find((l) => l.id === listId);
    const item = list?.items.find((i) => i.id === itemId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty < 1) {
      await handleDeleteItem(listId, itemId);
      return;
    }

    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i)) }
          : l
      )
    );

    try {
      await updateItemQuantity(listId, itemId, newQty);
    } catch {
      setError('שגיאה בעדכון הכמות');
      void loadLists();
    }
  }

  async function handleCreateList() {
    if (!newListName.trim()) return;
    try {
      const list = await createList(newListName.trim());
      setLists((prev) => [...prev, list]);
      setActiveListId(list.id);
      setNewListName('');
      setShowNewListInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת רשימה');
    }
  }

  async function handleDeleteList(listId: number) {
    if (!confirm('למחוק את הרשימה וכל הפריטים שבה?')) return;
    try {
      await deleteList(listId);
      const remaining = lists.filter((l) => l.id !== listId);
      setLists(remaining);
      if (activeListId === listId) {
        setActiveListId(remaining[0]?.id ?? null);
      }
    } catch {
      setError('שגיאה במחיקת הרשימה');
    }
  }

  const activeList = lists.find((l) => l.id === activeListId);
  const totalItems = lists.reduce((sum, l) => sum + l.items.length, 0);

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm fade-in">
            {error}
            <button onClick={() => setError('')} className="mr-2 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Stats bar */}
        {!isLoading && (
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {lists.length} רשימות · {totalItems} פריטים
            </p>
            <button
              onClick={() => setShowNewListInput((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition-all"
            >
              <span className="text-lg leading-none">+</span>
              רשימה חדשה
            </button>
          </div>
        )}

        {/* New list input */}
        {showNewListInput && (
          <div className="mb-5 flex gap-2 fade-in">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleCreateList()}
              placeholder="שם הרשימה..."
              className="flex-1 px-4 py-2.5 rounded-xl border-2 border-indigo-200 focus:border-indigo-400 outline-none text-slate-800 text-sm"
              autoFocus
            />
            <button
              onClick={() => void handleCreateList()}
              disabled={!newListName.trim()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:bg-slate-300 transition-all active:scale-95"
            >
              הוסף
            </button>
            <button
              onClick={() => { setShowNewListInput(false); setNewListName(''); }}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all text-sm"
            >
              ביטול
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <>
            {/* List tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => setActiveListId(list.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-medium text-sm transition-all active:scale-95 ${
                    activeListId === list.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  <span>{getListEmoji(list.name)}</span>
                  <span>{list.name}</span>
                  {list.items.length > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                        activeListId === list.id
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {list.items.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Active list content */}
            {activeList ? (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getListEmoji(activeList.name)}</span>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{activeList.name}</h2>
                      <p className="text-sm text-slate-400">
                        {activeList.items.length === 0
                          ? 'הרשימה ריקה'
                          : `${activeList.items.length} פריטים`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => void handleDeleteList(activeList.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-50"
                    title="מחק רשימה"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                  </button>
                </div>

                {activeList.items.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <p className="text-5xl mb-4">🛍️</p>
                    <p className="text-slate-400 font-medium">אין פריטים ברשימה זו</p>
                    <p className="text-slate-300 text-sm mt-1">חזור לעמוד הראשי כדי להוסיף</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-50">
                    {activeList.items.map((item) => (
                      <li
                        key={item.id}
                        className={`flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-all fade-in ${
                          deletingItem === item.id ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                          <span className="text-slate-800 font-medium truncate">{item.name}</span>
                        </div>

                        <div className="flex items-center gap-2 mr-4 flex-shrink-0">
                          {/* Quantity controls */}
                          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                            <button
                              onClick={() => void handleUpdateQuantity(activeList.id, item.id, -1)}
                              className="w-7 h-7 rounded-lg bg-white shadow-sm hover:bg-red-50 hover:text-red-600 text-slate-500 font-bold text-lg leading-none flex items-center justify-center transition-all active:scale-90"
                              title="הפחת כמות (0 = מחיקה)"
                            >
                              −
                            </button>
                            <span className="min-w-[1.5rem] text-center text-sm font-semibold text-slate-700">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => void handleUpdateQuantity(activeList.id, item.id, 1)}
                              className="w-7 h-7 rounded-lg bg-white shadow-sm hover:bg-green-50 hover:text-green-600 text-slate-500 font-bold text-lg leading-none flex items-center justify-center transition-all active:scale-90"
                              title="הגדל כמות"
                            >
                              +
                            </button>
                          </div>

                          {/* Delete button */}
                          <button
                            onClick={() => void handleDeleteItem(activeList.id, item.id)}
                            className="w-8 h-8 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all active:scale-90"
                            title="מחק פריט"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400">
                <p className="text-5xl mb-4">📋</p>
                <p>אין רשימות. צור רשימה חדשה!</p>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
