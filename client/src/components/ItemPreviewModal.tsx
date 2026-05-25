import { useState } from 'react';
import { ProcessedItem, List } from '../types';
import { ConfirmEntry } from '../api';

interface ItemState {
  listId: number;
  listName: string;
  decision: 'keep' | 'increase' | 'skip';
}

interface Props {
  items: ProcessedItem[];
  lists: List[];
  onConfirm: (entries: ConfirmEntry[]) => void;
  onCancel: () => void;
}

export default function ItemPreviewModal({ items, lists, onConfirm, onCancel }: Props) {
  const [states, setStates] = useState<ItemState[]>(() =>
    items.map((item) => ({
      listId: item.resolvedListId ?? lists[0]?.id ?? 0,
      listName: item.resolvedListName,
      decision: item.isDuplicate ? 'increase' : 'keep',
    }))
  );

  function updateState(index: number, patch: Partial<ItemState>) {
    setStates((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function handleListChange(index: number, listId: number) {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    updateState(index, { listId, listName: list.name, decision: 'keep' });
  }

  function handleConfirm() {
    const entries: ConfirmEntry[] = items.flatMap((item, i) => {
      const s = states[i];
      if (s.decision === 'skip' || !s.listId) return [];
      return [{
        name: item.name,
        listId: s.listId,
        quantity: item.quantity,
        increaseIfDuplicate: s.decision === 'increase',
      }];
    });
    onConfirm(entries);
  }

  const hasItems = states.some((s) => s.decision !== 'skip');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col fade-in">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">פריטים שזוהו</h2>
          <p className="text-sm text-slate-500 mt-1">ניתן לשנות רשימה לפני ההוספה</p>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {items.map((item, i) => {
            const s = states[i];
            const isDuplicate = item.isDuplicate && s.listId === item.resolvedListId;

            return (
              <div
                key={i}
                className={`rounded-2xl border-2 p-4 transition-all ${
                  s.decision === 'skip'
                    ? 'border-slate-200 bg-slate-50 opacity-50'
                    : isDuplicate
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-indigo-200 bg-indigo-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-800">
                    {item.name}
                    {item.quantity > 1 && (
                      <span className="mr-2 text-sm font-normal text-slate-500">× {item.quantity}</span>
                    )}
                  </p>

                  {/* List selector */}
                  <select
                    value={s.listId}
                    onChange={(e) => handleListChange(i, Number(e.target.value))}
                    disabled={s.decision === 'skip'}
                    className="text-sm border-2 border-indigo-200 rounded-xl px-2 py-1.5 bg-white text-slate-700 outline-none focus:border-indigo-400 cursor-pointer disabled:opacity-50"
                  >
                    {lists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                </div>

                {isDuplicate && s.decision !== 'skip' && (
                  <p className="text-xs text-amber-700 mt-2 font-medium">
                    ⚠️ פריט זה כבר קיים ברשימה
                    {item.existingItem && item.existingItem.quantity > 1
                      ? ` (כמות נוכחית: ${item.existingItem.quantity})`
                      : ''}
                  </p>
                )}

                <div className="mt-3 flex gap-2 flex-wrap">
                  {isDuplicate && (
                    <>
                      <button
                        onClick={() => updateState(i, { decision: 'increase' })}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                          s.decision === 'increase'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-50'
                        }`}
                      >
                        הגדל כמות
                      </button>
                      <button
                        onClick={() => updateState(i, { decision: 'skip' })}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                          s.decision === 'skip'
                            ? 'bg-slate-500 text-white shadow-sm'
                            : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        דלג
                      </button>
                    </>
                  )}

                  {!isDuplicate && (
                    <button
                      onClick={() =>
                        updateState(i, { decision: s.decision === 'skip' ? 'keep' : 'skip' })
                      }
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                        s.decision === 'skip'
                          ? 'bg-slate-500 text-white'
                          : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s.decision === 'skip' ? 'בטל דילוג' : 'דלג'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all active:scale-95"
          >
            ביטול
          </button>
          <button
            onClick={handleConfirm}
            disabled={!hasItems}
            className="flex-[2] py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold transition-all active:scale-95 shadow-md hover:shadow-lg disabled:shadow-none"
          >
            הוסף לרשימות
          </button>
        </div>
      </div>
    </div>
  );
}
