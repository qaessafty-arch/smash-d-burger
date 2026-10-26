import 'server-only'
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { bootstrap } from './bootstrap'

/**
 * SQLite via Node's built-in `node:sqlite` (Node >= 22.13). No native build step,
 * no external service. One process owns the file; WAL keeps readers fast.
 */

const SCHEMA_VERSION = 1

const SCHEMA = `
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE staff (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','manager','waiter','kitchen')),
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE staff_sessions (
  token_hash TEXT PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ku TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE items (
  id INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name_en TEXT NOT NULL,
  name_ku TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL DEFAULT '',
  desc_en TEXT NOT NULL DEFAULT '',
  desc_ku TEXT NOT NULL DEFAULT '',
  desc_ar TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price >= 0),
  image TEXT NOT NULL DEFAULT '',
  prep_minutes INTEGER,
  badge TEXT NOT NULL DEFAULT '',
  spicy INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  popular INTEGER NOT NULL DEFAULT 0,
  offer_price INTEGER CHECK (offer_price IS NULL OR offer_price >= 0),
  offer_label TEXT NOT NULL DEFAULT '',
  ingredients TEXT NOT NULL DEFAULT '[]',
  allergens TEXT NOT NULL DEFAULT '[]',
  available INTEGER NOT NULL DEFAULT 1,
  visible INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_items_category ON items(category_id, sort);

CREATE TABLE option_groups (
  id INTEGER PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_ku TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK (kind IN ('single','multi')),
  required INTEGER NOT NULL DEFAULT 0,
  min_select INTEGER NOT NULL DEFAULT 0,
  max_select INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_groups_item ON option_groups(item_id, sort);

CREATE TABLE options (
  id INTEGER PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_ku TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL DEFAULT '',
  price_delta INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  available INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_options_group ON options(group_id, sort);

CREATE TABLE tables (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  number TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL DEFAULT '',
  qr_token TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  occupied INTEGER NOT NULL DEFAULT 0,
  waiter_id INTEGER REFERENCES staff(id) ON DELETE SET NULL
);

CREATE TABLE table_sessions (
  id INTEGER PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  table_id INTEGER NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('qr','manual','waiter')),
  trusted INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  closed_at TEXT
);
CREATE INDEX idx_tsessions_table ON table_sessions(table_id);

CREATE TABLE waiter_links (
  token_hash TEXT PRIMARY KEY,
  table_id INTEGER NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  number INTEGER NOT NULL UNIQUE,
  table_id INTEGER NOT NULL REFERENCES tables(id) ON DELETE RESTRICT,
  table_number TEXT NOT NULL,
  session_id INTEGER NOT NULL REFERENCES table_sessions(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  track_token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('pending','verified','not_required','rejected')),
  verify_code TEXT,
  verify_token_hash TEXT UNIQUE,
  verify_token TEXT,
  verify_expires_at TEXT,
  verify_failures INTEGER NOT NULL DEFAULT 0,
  verified_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  verified_at TEXT,
  subtotal INTEGER NOT NULL,
  tax INTEGER NOT NULL,
  service_charge INTEGER NOT NULL,
  total INTEGER NOT NULL,
  customer_note TEXT NOT NULL DEFAULT '',
  internal_note TEXT NOT NULL DEFAULT '',
  cancel_reason TEXT NOT NULL DEFAULT '',
  est_ready_minutes INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT,
  UNIQUE (session_id, idempotency_key)
);
CREATE INDEX idx_orders_status ON orders(status, created_at);
CREATE INDEX idx_orders_table ON orders(table_id, created_at);
CREATE UNIQUE INDEX idx_orders_pending_code ON orders(verify_code) WHERE verification_status = 'pending' AND verify_code IS NOT NULL;

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  options_total INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 50),
  line_total INTEGER NOT NULL,
  instructions TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE order_item_options (
  id INTEGER PRIMARY KEY,
  order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  option_name TEXT NOT NULL,
  price_delta INTEGER NOT NULL
);

CREATE TABLE order_status_history (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  actor TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_history_order ON order_status_history(order_id);

CREATE TABLE service_requests (
  id INTEGER PRIMARY KEY,
  table_id INTEGER NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES table_sessions(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting','received','on_the_way','completed')),
  handled_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_requests_open ON service_requests(status, table_id);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY,
  audience TEXT NOT NULL,
  staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_notifications_audience ON notifications(audience, read, id);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_created ON audit_log(id);
`

export function dbPath() {
  return process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'restaurant.db')
}

type G = typeof globalThis & { __sbDb?: DatabaseSync }

export function db(): DatabaseSync {
  const g = globalThis as G
  if (g.__sbDb) return g.__sbDb
  const file = dbPath()
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true })
  const conn = new DatabaseSync(file)
  conn.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
  const row = conn.prepare('PRAGMA user_version').get() as { user_version: number }
  if (row.user_version < SCHEMA_VERSION) {
    conn.exec('BEGIN')
    try {
      conn.exec(SCHEMA)
      conn.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`)
      conn.exec('COMMIT')
    } catch (e) {
      conn.exec('ROLLBACK')
      throw e
    }
  }
  g.__sbDb = conn
  bootstrap(conn) // first boot only: seed menu, settings, admin account
  return conn
}

/** Run fn inside an immediate transaction (serialises writers, rolls back on throw). */
export function tx<T>(fn: () => T): T {
  const conn = db()
  conn.exec('BEGIN IMMEDIATE')
  try {
    const out = fn()
    conn.exec('COMMIT')
    return out
  } catch (e) {
    conn.exec('ROLLBACK')
    throw e
  }
}

export function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return db().prepare(sql).all(...(params as never[])) as T[]
}
export function get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
  return db().prepare(sql).get(...(params as never[])) as T | undefined
}
export function run(sql: string, ...params: unknown[]) {
  return db().prepare(sql).run(...(params as never[]))
}
