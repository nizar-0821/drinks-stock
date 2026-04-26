import * as SQLite from 'expo-sqlite';
import { DEFAULT_DRINKS } from '../constants/drinks';

const DB_NAME = 'drinks_stock.db';

export function getDb() {
  return SQLite.openDatabaseSync(DB_NAME);
}

export function initDatabase() {
  const db = getDb();

  db.execSync(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, pin TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#1D9E75', initials TEXT NOT NULL,
    streak_days INTEGER DEFAULT 0, last_sales_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.execSync(`CREATE TABLE IF NOT EXISTS drinks (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, price_per_unit REAL NOT NULL,
    color_hex TEXT NOT NULL, sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1
  )`);

  db.execSync(`CREATE TABLE IF NOT EXISTS stock_entries (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, drink_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 0, updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.execSync(`CREATE TABLE IF NOT EXISTS sales_records (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL,
    entries TEXT NOT NULL, confirmed_at TEXT DEFAULT (datetime('now'))
  )`);

  db.execSync(`CREATE TABLE IF NOT EXISTS restock_records (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL,
    entries TEXT NOT NULL, mode TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // Seed default drinks if empty
  const existing = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM drinks');
  if (!existing || existing.count === 0) {
    DEFAULT_DRINKS.forEach(d => {
      db.runSync(
        'INSERT INTO drinks (id, name, price_per_unit, color_hex, sort_order) VALUES (?, ?, ?, ?, ?)',
        [d.id, d.name, d.pricePerUnit, d.colorHex, d.sortOrder]
      );
    });
  }
}

// ── USERS ─────────────────────────────────────────────────────

export function getAllUsers() {
  return getDb().getAllSync<any>('SELECT * FROM users ORDER BY created_at ASC');
}

export function getUserById(userId: string) {
  return getDb().getFirstSync<any>('SELECT * FROM users WHERE id = ?', [userId]);
}

export function createUser(name: string, pinHash: string) {
  const db = getDb();
  const id = `user_${Date.now()}`;
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['#1D9E75', '#7F77DD', '#EF9F27', '#D4537E', '#378ADD'];
  const count = (db.getAllSync<any>('SELECT id FROM users')).length;
  const color = colors[count % colors.length];

  db.runSync(
    'INSERT INTO users (id, name, pin, initials, avatar_color) VALUES (?, ?, ?, ?, ?)',
    [id, name, pinHash, initials, color]
  );

  const drinks = db.getAllSync<any>('SELECT id FROM drinks WHERE is_active = 1');
  drinks.forEach(d => {
    db.runSync(
      'INSERT INTO stock_entries (id, user_id, drink_id, quantity) VALUES (?, ?, ?, 0)',
      [`se_${id}_${d.id}`, id, d.id]
    );
  });

  return id;
}

// ── STOCK ─────────────────────────────────────────────────────

export function getStockForUser(userId: string) {
  const db = getDb();

  // Calculate avg_daily from last 7 days of sales for each drink
  const today = new Date().toISOString().split('T')[0];
  const week = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const recentSales = db.getAllSync<any>(
    'SELECT entries FROM sales_records WHERE user_id = ? AND date >= ? AND date <= ?',
    [userId, week, today]
  );

  // Sum up sales per drink over last 7 days
  const salesMap: Record<string, number> = {};
  recentSales.forEach((r: any) => {
    const entries = JSON.parse(r.entries);
    entries.forEach((e: any) => {
      salesMap[e.drinkId] = (salesMap[e.drinkId] || 0) + e.unitsSold;
    });
  });

  const drinks = db.getAllSync<any>(`
    SELECT d.id, d.name, d.price_per_unit, d.color_hex, d.sort_order,
           COALESCE(se.quantity, 0) as quantity, se.updated_at
    FROM drinks d
    LEFT JOIN stock_entries se ON se.drink_id = d.id AND se.user_id = ?
    WHERE d.is_active = 1
    ORDER BY d.sort_order
  `, [userId]);

  return drinks.map((d: any) => ({
    ...d,
    avg_daily: recentSales.length > 0
      ? Math.round((salesMap[d.id] || 0) / Math.max(recentSales.length, 1))
      : 0,
  }));
}

export function updateStock(userId: string, drinkId: string, quantity: number) {
  getDb().runSync(
    `UPDATE stock_entries SET quantity = ?, updated_at = datetime('now')
     WHERE user_id = ? AND drink_id = ?`,
    [quantity, userId, drinkId]
  );
}

// ── SALES ─────────────────────────────────────────────────────

export function saveSalesRecord(
  userId: string,
  entries: Array<{ drinkId: string; unitsSold: number }>
) {
  const db = getDb();
  const id = `sale_${Date.now()}`;
  const date = new Date().toISOString().split('T')[0];

  db.runSync(
    'INSERT INTO sales_records (id, user_id, date, entries) VALUES (?, ?, ?, ?)',
    [id, userId, date, JSON.stringify(entries)]
  );

  entries.forEach(e => {
    db.runSync(
      `UPDATE stock_entries SET quantity = MAX(0, quantity - ?), updated_at = datetime('now')
       WHERE user_id = ? AND drink_id = ?`,
      [e.unitsSold, userId, e.drinkId]
    );
  });

  updateStreak(userId, date);
  return id;
}

export function deleteSalesRecord(recordId: string, userId: string) {
  const db = getDb();
  const record = db.getFirstSync<any>('SELECT * FROM sales_records WHERE id = ?', [recordId]);
  if (!record) return;

  const entries: Array<{ drinkId: string; unitsSold: number }> = JSON.parse(record.entries);
  entries.forEach(e => {
    db.runSync(
      `UPDATE stock_entries SET quantity = quantity + ? WHERE user_id = ? AND drink_id = ?`,
      [e.unitsSold, userId, e.drinkId]
    );
  });
  db.runSync('DELETE FROM sales_records WHERE id = ?', [recordId]);
}

export function getTodaySalesRecord(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  return getDb().getFirstSync<any>(
    'SELECT * FROM sales_records WHERE user_id = ? AND date = ?',
    [userId, today]
  );
}

export function getSalesForMonth(userId: string, yearMonth: string) {
  return getDb().getAllSync<any>(
    'SELECT * FROM sales_records WHERE user_id = ? AND date LIKE ?',
    [userId, `${yearMonth}%`]
  );
}

// ── RESTOCK ───────────────────────────────────────────────────

export function saveRestockRecord(
  userId: string,
  entries: Array<{ drinkId: string; unitsAdded: number; newTotal: number }>,
  mode: 'add' | 'set'
) {
  const db = getDb();
  const id = `restock_${Date.now()}`;
  const date = new Date().toISOString().split('T')[0];

  db.runSync(
    'INSERT INTO restock_records (id, user_id, date, entries, mode) VALUES (?, ?, ?, ?, ?)',
    [id, userId, date, JSON.stringify(entries), mode]
  );

  entries.forEach(e => {
    db.runSync(
      `UPDATE stock_entries SET quantity = ?, updated_at = datetime('now')
       WHERE user_id = ? AND drink_id = ?`,
      [e.newTotal, userId, e.drinkId]
    );
  });

  return id;
}

// ── STREAK ────────────────────────────────────────────────────

function updateStreak(userId: string, today: string) {
  const db = getDb();
  const user = db.getFirstSync<any>('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const streak =
    user.last_sales_date === yesterday ? (user.streak_days || 0) + 1 :
    user.last_sales_date === today ? user.streak_days || 1 : 1;

  db.runSync(
    'UPDATE users SET streak_days = ?, last_sales_date = ? WHERE id = ?',
    [streak, today, userId]
  );
}

// ── DRINKS ────────────────────────────────────────────────────

export function getAllDrinks() {
  return getDb().getAllSync<any>(
    'SELECT * FROM drinks WHERE is_active = 1 ORDER BY sort_order'
  );
}

export function updateDrink(id: string, name: string, price: number, color: string) {
  getDb().runSync(
    'UPDATE drinks SET name = ?, price_per_unit = ?, color_hex = ? WHERE id = ?',
    [name, price, color, id]
  );
}

export function addDrink(name: string, price: number, color: string) {
  const db = getDb();
  const id = `drink_${Date.now()}`;
  const max = db.getFirstSync<any>('SELECT MAX(sort_order) as m FROM drinks');
  const sortOrder = (max?.m || 0) + 1;

  db.runSync(
    'INSERT INTO drinks (id, name, price_per_unit, color_hex, sort_order) VALUES (?, ?, ?, ?, ?)',
    [id, name, price, color, sortOrder]
  );

  const users = db.getAllSync<any>('SELECT id FROM users');
  users.forEach(u => {
    db.runSync(
      'INSERT INTO stock_entries (id, user_id, drink_id, quantity) VALUES (?, ?, ?, 0)',
      [`se_${u.id}_${id}`, u.id, id]
    );
  });

  return id;
}
