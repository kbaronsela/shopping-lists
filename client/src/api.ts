import { supabase } from './supabase';
import { List, Item } from './types';

// ── Lists ────────────────────────────────────────────────────────────────────

export async function fetchLists(): Promise<List[]> {
  const { data: lists, error: listsErr } = await supabase
    .from('lists')
    .select('*')
    .order('created_at', { ascending: true });

  if (listsErr) throw new Error('שגיאה בטעינת הרשימות: ' + listsErr.message);

  const { data: items, error: itemsErr } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: true });

  if (itemsErr) throw new Error('שגיאה בטעינת הפריטים: ' + itemsErr.message);

  return (lists ?? []).map((list) => ({
    ...list,
    items: (items ?? []).filter((item) => item.list_id === list.id) as Item[],
  })) as List[];
}

export async function createList(name: string): Promise<List> {
  const { data, error } = await supabase
    .from('lists')
    .insert({ name: name.trim() })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('רשימה עם שם זה כבר קיימת');
    throw new Error('שגיאה ביצירת רשימה: ' + error.message);
  }

  return { ...data, items: [] } as List;
}

export async function deleteList(listId: number): Promise<void> {
  const { error } = await supabase.from('lists').delete().eq('id', listId);
  if (error) throw new Error('שגיאה במחיקת הרשימה: ' + error.message);
}

// ── Items ────────────────────────────────────────────────────────────────────

export async function deleteItem(_listId: number, itemId: number): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', itemId);
  if (error) throw new Error('שגיאה במחיקת הפריט: ' + error.message);
}

export async function updateItemQuantity(
  _listId: number,
  itemId: number,
  quantity: number
): Promise<void> {
  const { error } = await supabase
    .from('items')
    .update({ quantity })
    .eq('id', itemId);
  if (error) throw new Error('שגיאה בעדכון הכמות: ' + error.message);
}

// ── Process ──────────────────────────────────────────────────────────────────

export interface ConfirmEntry {
  name: string;
  listId: number;
  quantity: number;
  increaseIfDuplicate?: boolean;
}

export async function confirmItems(
  entries: ConfirmEntry[]
): Promise<{ results: Array<{ item: Item; action: 'added' | 'increased' | 'skipped' }> }> {
  const results: Array<{ item: Item; action: 'added' | 'increased' | 'skipped' }> = [];

  for (const entry of entries) {
    // Check for existing item (case-insensitive)
    const { data: existing } = await supabase
      .from('items')
      .select('*')
      .eq('list_id', entry.listId)
      .ilike('name', entry.name)
      .maybeSingle();

    if (existing) {
      if (entry.increaseIfDuplicate) {
        const newQty = (existing.quantity as number) + entry.quantity;
        const { data: updated, error } = await supabase
          .from('items')
          .update({ quantity: newQty })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw new Error('שגיאה בעדכון כמות: ' + error.message);
        results.push({ item: updated as Item, action: 'increased' });
      } else {
        results.push({ item: existing as Item, action: 'skipped' });
      }
    } else {
      const { data: newItem, error } = await supabase
        .from('items')
        .insert({ list_id: entry.listId, name: entry.name, quantity: entry.quantity })
        .select()
        .single();
      if (error) throw new Error('שגיאה בהוספת פריט: ' + error.message);
      results.push({ item: newItem as Item, action: 'added' });
    }
  }

  return { results };
}

export async function checkDuplicates(
  listId: number,
  name: string
): Promise<Item | null> {
  const { data } = await supabase
    .from('items')
    .select('*')
    .eq('list_id', listId)
    .ilike('name', name)
    .maybeSingle();
  return (data as Item) ?? null;
}
