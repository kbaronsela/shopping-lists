import { Router, Request, Response } from 'express';
import { getDb, List, Item, rowToList, rowToItem } from '../database';
import { parseShoppingText, ParsedItem } from '../openai';

const router = Router();

export interface ProcessedItem extends ParsedItem {
  resolvedListId: number | null;
  resolvedListName: string;
  isDuplicate: boolean;
  existingItem?: Item;
}

// POST /api/process/parse - parse text and return items (without saving)
router.post('/parse', async (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };
  if (!text?.trim()) {
    res.status(400).json({ error: 'טקסט נדרש' });
    return;
  }

  try {
    const db = await getDb();
    const listsResult = await db.execute('SELECT id, name, created_at FROM lists ORDER BY created_at ASC');
    const lists = listsResult.rows.map(rowToList);
    const listNames = lists.map((l: List) => l.name);

    let parsedItems: ParsedItem[];
    try {
      parsedItems = await parseShoppingText(text.trim(), listNames);
    } catch (err) {
      console.error('OpenAI error:', err);
      res.status(502).json({ error: 'שגיאה בפענוח הטקסט. בדוק את מפתח ה-API.' });
      return;
    }

    const processedItems: ProcessedItem[] = await Promise.all(
      parsedItems.map(async (item) => {
        const list =
          lists.find((l: List) => l.name.toLowerCase() === item.listName.toLowerCase()) ?? lists[0];

        let existing: Item | undefined;
        if (list) {
          const existingResult = await db.execute({
            sql: 'SELECT id, list_id, name, quantity, created_at FROM items WHERE list_id = ? AND LOWER(name) = LOWER(?)',
            args: [list.id, item.name],
          });
          if (existingResult.rows.length > 0) {
            existing = rowToItem(existingResult.rows[0]);
          }
        }

        return {
          ...item,
          resolvedListId: list?.id ?? null,
          resolvedListName: list?.name ?? item.listName,
          isDuplicate: !!existing,
          existingItem: existing,
        };
      })
    );

    res.json({ items: processedItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה פנימית' });
  }
});

// POST /api/process/confirm - actually save items to DB
router.post('/confirm', async (req: Request, res: Response) => {
  const { items } = req.body as {
    items?: Array<{
      name: string;
      listId: number;
      quantity: number;
      increaseIfDuplicate?: boolean;
    }>;
  };

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'נדרש מערך פריטים' });
    return;
  }

  try {
    const db = await getDb();
    const results: Array<{ item: Item; action: 'added' | 'increased' | 'skipped' }> = [];

    for (const entry of items) {
      const existingResult = await db.execute({
        sql: 'SELECT id, list_id, name, quantity, created_at FROM items WHERE list_id = ? AND LOWER(name) = LOWER(?)',
        args: [entry.listId, entry.name],
      });

      if (existingResult.rows.length > 0) {
        const existing = rowToItem(existingResult.rows[0]);
        if (entry.increaseIfDuplicate) {
          await db.execute({
            sql: 'UPDATE items SET quantity = quantity + ? WHERE list_id = ? AND LOWER(name) = LOWER(?)',
            args: [entry.quantity, entry.listId, entry.name],
          });
          const updatedResult = await db.execute({
            sql: 'SELECT id, list_id, name, quantity, created_at FROM items WHERE list_id = ? AND LOWER(name) = LOWER(?)',
            args: [entry.listId, entry.name],
          });
          results.push({ item: rowToItem(updatedResult.rows[0]), action: 'increased' });
        } else {
          results.push({ item: existing, action: 'skipped' });
        }
      } else {
        const insertResult = await db.execute({
          sql: 'INSERT INTO items (list_id, name, quantity) VALUES (?, ?, ?)',
          args: [entry.listId, entry.name, entry.quantity],
        });
        const newItemResult = await db.execute({
          sql: 'SELECT id, list_id, name, quantity, created_at FROM items WHERE id = ?',
          args: [insertResult.lastInsertRowid!],
        });
        results.push({ item: rowToItem(newItemResult.rows[0]), action: 'added' });
      }
    }

    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשמירת הפריטים' });
  }
});

export default router;
