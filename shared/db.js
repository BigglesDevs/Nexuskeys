const Database = require("better-sqlite3");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../nexuskeys.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'General',
    image_url   TEXT NOT NULL DEFAULT '',
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS variants (
    id         TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    name       TEXT NOT NULL,
    price      REAL NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active     INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS keys (
    id         TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    key_value  TEXT NOT NULL,
    added_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(variant_id) REFERENCES variants(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id               TEXT PRIMARY KEY,
    discord_id       TEXT NOT NULL,
    discord_username TEXT NOT NULL,
    product_id       TEXT NOT NULL,
    product_name     TEXT NOT NULL,
    variant_id       TEXT,
    variant_name     TEXT,
    amount           REAL NOT NULL,
    stripe_session_id TEXT,
    stripe_payment_id TEXT,
    key_value        TEXT,
    status           TEXT NOT NULL DEFAULT 'pending',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at     TEXT
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id               TEXT PRIMARY KEY,
    discord_id       TEXT NOT NULL,
    discord_username TEXT NOT NULL,
    channel_id       TEXT NOT NULL,
    order_id         TEXT,
    subject          TEXT NOT NULL DEFAULT 'Support Request',
    status           TEXT NOT NULL DEFAULT 'open',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    closed_at        TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    discord_id    TEXT PRIMARY KEY,
    username      TEXT NOT NULL,
    avatar        TEXT,
    access_token  TEXT,
    refresh_token TEXT,
    is_admin      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen     TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const Products = {
  getAll: () => db.prepare("SELECT * FROM products WHERE active=1 ORDER BY created_at DESC").all(),
  getAllAdmin: () => db.prepare("SELECT * FROM products ORDER BY created_at DESC").all(),
  getById: (id) => db.prepare("SELECT * FROM products WHERE id=?").get(id),
  create: ({ name, description, category, image_url }) => {
    const id = uuidv4();
    db.prepare("INSERT INTO products (id,name,description,category,image_url) VALUES (?,?,?,?,?)")
      .run(id, name, description || "", category || "General", image_url || "");
    return Products.getById(id);
  },
  update: (id, fields) => {
    const allowed = ["name","description","category","image_url","active"];
    const sets = Object.keys(fields).filter(k => allowed.includes(k)).map(k => `${k}=?`).join(", ");
    const vals = Object.keys(fields).filter(k => allowed.includes(k)).map(k => fields[k]);
    if (!sets) return Products.getById(id);
    db.prepare(`UPDATE products SET ${sets} WHERE id=?`).run(...vals, id);
    return Products.getById(id);
  },
  delete: (id) => db.prepare("UPDATE products SET active=0 WHERE id=?").run(id),
};

const Variants = {
  getByProduct: (productId) =>
    db.prepare("SELECT * FROM variants WHERE product_id=? AND active=1 ORDER BY sort_order ASC, price ASC").all(productId),
  getById: (id) => db.prepare("SELECT * FROM variants WHERE id=?").get(id),
  create: ({ product_id, name, price, sort_order }) => {
    const id = uuidv4();
    db.prepare("INSERT INTO variants (id,product_id,name,price,sort_order) VALUES (?,?,?,?,?)")
      .run(id, product_id, name, parseFloat(price), sort_order || 0);
    return Variants.getById(id);
  },
  delete: (id) => db.prepare("UPDATE variants SET active=0 WHERE id=?").run(id),
  stock: (variantId) =>
    db.prepare("SELECT COUNT(*) as c FROM keys WHERE variant_id=?").get(variantId).c,
};

const Keys = {
  addBulk: (productId, variantId, keyValues) => {
    const ins = db.prepare("INSERT INTO keys (id,product_id,variant_id,key_value) VALUES (?,?,?,?)");
    const tx = db.transaction((arr) => { for (const k of arr) ins.run(uuidv4(), productId, variantId, k.trim()); });
    const clean = keyValues.filter(k => k.trim());
    tx(clean);
    return clean.length;
  },
  // Claim = grab key value then DELETE it entirely from DB
  claimAndDelete: (variantId) => {
    const key = db.prepare("SELECT * FROM keys WHERE variant_id=? LIMIT 1").get(variantId);
    if (!key) return null;
    db.prepare("DELETE FROM keys WHERE id=?").run(key.id);
    return key.key_value;
  },
  stock: (variantId) =>
    db.prepare("SELECT COUNT(*) as c FROM keys WHERE variant_id=?").get(variantId).c,
  listByVariant: (variantId) =>
    db.prepare("SELECT id, key_value, added_at FROM keys WHERE variant_id=? ORDER BY added_at DESC").all(variantId),
};

const Orders = {
  create: ({ discord_id, discord_username, product_id, product_name, variant_id, variant_name, amount, stripe_session_id }) => {
    const id = `NX-${Date.now().toString(36).toUpperCase()}`;
    db.prepare(`INSERT INTO orders (id,discord_id,discord_username,product_id,product_name,variant_id,variant_name,amount,stripe_session_id)
      VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(id, discord_id, discord_username, product_id, product_name, variant_id, variant_name, amount, stripe_session_id || null);
    return Orders.getById(id);
  },
  getById: (id) => db.prepare("SELECT * FROM orders WHERE id=?").get(id),
  getBySession: (s) => db.prepare("SELECT * FROM orders WHERE stripe_session_id=?").get(s),
  complete: (id, { stripe_payment_id, key_value }) => {
    db.prepare("UPDATE orders SET status='completed',stripe_payment_id=?,key_value=?,completed_at=datetime('now') WHERE id=?")
      .run(stripe_payment_id, key_value, id);
    return Orders.getById(id);
  },
  fail: (id) => db.prepare("UPDATE orders SET status='failed' WHERE id=?").run(id),
  getByUser: (discordId, limit = 20) =>
    db.prepare("SELECT * FROM orders WHERE discord_id=? ORDER BY created_at DESC LIMIT ?").all(discordId, limit),
  getRecent: (limit = 50) =>
    db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT ?").all(limit),
  getStats: () => db.prepare(`
    SELECT COUNT(*) as total_orders,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status='completed' THEN amount ELSE 0 END) as total_revenue,
      SUM(CASE WHEN date(created_at)=date('now') THEN amount ELSE 0 END) as today_revenue
    FROM orders`).get(),
};

const Tickets = {
  create: ({ discord_id, discord_username, channel_id, order_id, subject }) => {
    const id = `TK-${Date.now().toString(36).toUpperCase()}`;
    db.prepare("INSERT INTO tickets (id,discord_id,discord_username,channel_id,order_id,subject) VALUES (?,?,?,?,?,?)")
      .run(id, discord_id, discord_username, channel_id, order_id || null, subject || "Support Request");
    return Tickets.getById(id);
  },
  getById: (id) => db.prepare("SELECT * FROM tickets WHERE id=?").get(id),
  getByChannel: (c) => db.prepare("SELECT * FROM tickets WHERE channel_id=?").get(c),
  close: (id) => db.prepare("UPDATE tickets SET status='closed',closed_at=datetime('now') WHERE id=?").run(id),
};

const Users = {
  upsert: ({ discord_id, username, avatar, access_token, refresh_token }) => {
    const isAdmin = discord_id === process.env.ADMIN_DISCORD_ID ? 1 : 0;
    db.prepare(`INSERT INTO users (discord_id,username,avatar,access_token,refresh_token,is_admin,last_seen)
      VALUES (?,?,?,?,?,?,datetime('now'))
      ON CONFLICT(discord_id) DO UPDATE SET username=excluded.username,avatar=excluded.avatar,
        access_token=excluded.access_token,refresh_token=excluded.refresh_token,
        is_admin=excluded.is_admin,last_seen=datetime('now')`)
      .run(discord_id, username, avatar, access_token, refresh_token, isAdmin);
    return Users.getById(discord_id);
  },
  getById: (id) => db.prepare("SELECT * FROM users WHERE discord_id=?").get(id),
};

module.exports = { db, Products, Variants, Keys, Orders, Tickets, Users };
