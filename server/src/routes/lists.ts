import { Router, Request, Response } from 'express';
import { getDb, List, Item, rowToList, rowToItem } from '../database';

const router = Router();

// GET all lists with their items
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const listsResult = await db.execute('SELECT id, name, created_at FROM lists ORDER BY created_at ASC');
    const itemsResult = await db.execute('SELECT id, list_id, name, quantity, created_at FROM items ORDER BY created_at ASC');

    const lists = listsResult.rows.map(rowToList);
    const items = itemsResult.rows.map(rowToItem);

    const result = lists.map((list) => ({
      ...list,
      items: items.filter((item) => item.list_id === list.id),
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת הרשימות' });
  }
});

// POST create a new list
router.post('/', async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: 'שם הרשימה נדרש' });
    return;
  }

  try {
    const db = await getDb();
    const result = await db.execute({
      sql: 'INSERT INTO lists (name) VALUES (?)',
      args: [name.trim()],
    });
    const listResult = await db.execute({
      sql: 'SELECT id, name, created_at FROM lists WHERE id = ?',
      args: [result.lastInsertRowid!],
    });
    const list = rowToList(listResult.rows[0]);
    res.status(201).json({ ...list, items: [] });
  } catch {
    res.status(409).json({ error: 'רשימה עם שם זה כבר קיימת' });
  }
});

// DELETE a list
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const result = await db.execute({
      sql: 'DELETE FROM lists WHERE id = ?',
      args: [req.params.id],
    });
    if (result.rowsAffected === 0) {
      res.status(404).json({ error: 'רשימה לא נמצאה' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה במחיקת הרשימה' });
  }
});

// DELETE an item
router.delete('/:listId/items/:itemId', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const result = await db.execute({
      sql: 'DELETE FROM items WHERE id = ? AND list_id = ?',
      args: [req.params.itemId, req.params.listId],
    });
    if (result.rowsAffected === 0) {
      res.status(404).json({ error: 'פריט לא נמצא' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה במחיקת הפריט' });
  }
});

// PATCH update item quantity
router.patch('/:listId/items/:itemId', async (req: Request, res: Response) => {
  const { quantity } = req.body as { quantity?: number };
  if (typeof quantity !== 'number' || quantity < 1) {
    res.status(400).json({ error: 'כמות לא תקינה' });
    return;
  }

  try {
    const db = await getDb();
    const result = await db.execute({
      sql: 'UPDATE items SET quantity = ? WHERE id = ? AND list_id = ?',
      args: [quantity, req.params.itemId, req.params.listId],
    });
    if (result.rowsAffected === 0) {
      res.status(404).json({ error: 'פריט לא נמצא' });
      return;
    }
    const itemResult = await db.execute({
      sql: 'SELECT id, list_id, name, quantity, created_at FROM items WHERE id = ?',
      args: [req.params.itemId],
    });
    res.json(rowToItem(itemResult.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בעדכון הכמות' });
  }
});

// POST add item directly to a list
router.post('/:listId/items', async (req: Request, res: Response) => {
  const { name, quantity = 1 } = req.body as { name?: string; quantity?: number };
  if (!name?.trim()) {
    res.status(400).json({ error: 'שם הפריט נדרש' });
    return;
  }

  try {
    const db = await getDb();
    const existingResult = await db.execute({
      sql: 'SELECT id, list_id, name, quantity, created_at FROM items WHERE list_id = ? AND LOWER(name) = LOWER(?)',
      args: [req.params.listId, name.trim()],
    });

    if (existingResult.rows.length > 0) {
      const existing = rowToItem(existingResult.rows[0]) as Item;
      res.status(409).json({ error: 'duplicate', item: existing });
      return;
    }

    const result = await db.execute({
      sql: 'INSERT INTO items (list_id, name, quantity) VALUES (?, ?, ?)',
      args: [req.params.listId, name.trim(), quantity],
    });
    const itemResult = await db.execute({
      sql: 'SELECT id, list_id, name, quantity, created_at FROM items WHERE id = ?',
      args: [result.lastInsertRowid!],
    });
    res.status(201).json(rowToItem(itemResult.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בהוספת הפריט' });
  }
});

export default router;
