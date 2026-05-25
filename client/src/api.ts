import { List, ProcessedItem, ConfirmEntry } from './types';

const BASE = '/api';

export async function fetchLists(): Promise<List[]> {
  const res = await fetch(`${BASE}/lists`);
  if (!res.ok) throw new Error('שגיאה בטעינת הרשימות');
  return res.json();
}

export async function createList(name: string): Promise<List> {
  const res = await fetch(`${BASE}/lists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? 'שגיאה ביצירת רשימה');
  }
  return res.json();
}

export async function deleteList(listId: number): Promise<void> {
  const res = await fetch(`${BASE}/lists/${listId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('שגיאה במחיקת הרשימה');
}

export async function deleteItem(listId: number, itemId: number): Promise<void> {
  const res = await fetch(`${BASE}/lists/${listId}/items/${itemId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('שגיאה במחיקת הפריט');
}

export async function updateItemQuantity(
  listId: number,
  itemId: number,
  quantity: number
): Promise<void> {
  const res = await fetch(`${BASE}/lists/${listId}/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error('שגיאה בעדכון הכמות');
}

export async function parseText(text: string): Promise<{ items: ProcessedItem[] }> {
  const res = await fetch(`${BASE}/process/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? 'שגיאה בפענוח הטקסט');
  }
  return res.json();
}

export async function confirmItems(
  items: ConfirmEntry[]
): Promise<{ results: Array<{ item: unknown; action: string }> }> {
  const res = await fetch(`${BASE}/process/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? 'שגיאה בשמירת הפריטים');
  }
  return res.json();
}
