import { createClient, Client, ResultSet } from '@libsql/client';
import path from 'path';
import fs from 'fs';

let client: Client;

function getClient(): Client {
  if (!client) {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'shopping.db');
    client = createClient({ url: `file:${dbPath}` });
  }
  return client;
}

async function initSchema(): Promise<void> {
  const db = getClient();
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
    );
  `);

  const DEFAULT_LISTS = ['סופר', 'טמבוריה', 'פארם', 'מקס'];
  for (const name of DEFAULT_LISTS) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO lists (name) VALUES (?)',
      args: [name],
    });
  }
}

let initialized = false;

export async function getDb(): Promise<Client> {
  const db = getClient();
  if (!initialized) {
    initialized = true;
    await initSchema();
  }
  return db;
}

export interface List {
  id: number;
  name: string;
  created_at: string;
}

export interface Item {
  id: number;
  list_id: number;
  name: string;
  quantity: number;
  created_at: string;
}

export function rowToList(row: ResultSet['rows'][number]): List {
  return {
    id: row[0] as number,
    name: row[1] as string,
    created_at: row[2] as string,
  };
}

export function rowToItem(row: ResultSet['rows'][number]): Item {
  return {
    id: row[0] as number,
    list_id: row[1] as number,
    name: row[2] as string,
    quantity: row[3] as number,
    created_at: row[4] as string,
  };
}
