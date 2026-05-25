import { useState } from 'react';
import { ProcessedItem } from '../types';
import { ConfirmEntry } from '../api';

interface Props {
  items: ProcessedItem[];
  onConfirm: (entries: ConfirmEntry[]) => void;
  onCancel: () => void;
}

export default function ItemPreviewModal({ items, onConfirm, onCancel }: Props) {
  const [decisions, setDecisions] = useState<Record<number, 'keep' | 'increase' | 'skip'>>(
    () =>
      Object.fromEntries(
        items.map((item, i) => [i, item.isDuplicate ? 'increase' : 'keep'])
      )
  );

  function setDecision(index: number, decision: 'keep' | 'increase' | 'skip') {
    setDecisions((prev) => ({ ...prev, [index]: decision }));
  }

  function handleConfirm() {
    const entries: ConfirmEntry[] = items
      .flatMap((item, i) => {
        const d = decisions[i];
        if (d === 'skip') return [];
        if (!item.resolvedListId) return [];
        const entry: ConfirmEntry = {
          name: item.name,
          listId: item.resolvedListId,
          quantity: item.quantity,
          increaseIfDuplicate: d === 'increase',
        };
        return [entry];
      });

    onConfirm(entries);
  }

  const hasItems = items.some((_, i) => decisions[i] !== 'skip');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col fade-in">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">פריטים שזוהו</h2>
          <p className="text-sm text-slate-500 mt-1">בדוק את הפריטים לפני ההוספה לרשימות</p>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className={`rounded-2xl border-2 p-4 transition-all ${
                decisions[i] === 'skip'
                  ? 'border-slate-200 bg-slate-50 opacity-50'
                  : item.isDuplicate
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-indigo-200 bg-indigo-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-800">
                    {item.name}
                    {item.quantity > 1 && (
                      <span className="mr-2 text-sm font-normal text-slate-500">
                        × {item.quantity}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    → {item.resolvedListName}
                  </p>
                  {item.isDuplicate && decisions[i] !== 'skip' && (
                    <p className="text-xs text-amber-700 mt-1 font-medium">
                      ⚠️ פריט זה כבר קיים ברשימה
                      {item.existingItem && item.existingItem.quantity > 1
                        ? ` (כמות נוכחית: ${item.existingItem.quantity})`
                        : ''}
                    </p>
                  )}
                </div>
              </div>

              {item.isDuplicate && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  <button
                    onClick={() => setDecision(i, 'increase')}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                      decisions[i] === 'increase'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    הגדל כמות
                  </button>
                  <button
                    onClick={() => setDecision(i, 'skip')}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                      decisions[i] === 'skip'
                        ? 'bg-slate-500 text-white shadow-sm'
                        : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    דלג
                  </button>
                </div>
              )}

              {!item.isDuplicate && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setDecision(i, decisions[i] === 'skip' ? 'keep' : 'skip')}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                      decisions[i] === 'skip'
                        ? 'bg-slate-500 text-white'
                        : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {decisions[i] === 'skip' ? 'בטל דילוג' : 'דלג'}
                  </button>
                </div>
              )}
            </div>
          ))}
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
            className="flex-2 flex-grow-[2] py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold transition-all active:scale-95 shadow-md hover:shadow-lg disabled:shadow-none"
          >
            הוסף לרשימות
          </button>
        </div>
      </div>
    </div>
  );
}
