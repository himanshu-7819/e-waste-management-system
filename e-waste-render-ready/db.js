const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'e-waste.db');

async function init() {
  const db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database
  });

  await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    isAdmin INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    itemType TEXT,
    quantity INTEGER,
    address TEXT,
    phone TEXT,
    preferredDate TEXT,
    status TEXT DEFAULT 'pending',
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id)
  );
  `);

  const admin = await db.get(`SELECT * FROM users WHERE email = ?`, ['admin@example.com']);
  if (!admin) {
    const bcrypt = require('bcryptjs');
    const h = await bcrypt.hash('admin123', 10);
    await db.run(`INSERT INTO users (name,email,password,isAdmin) VALUES (?,?,?,1)`, ['Admin', 'admin@example.com', h]);
    console.log('Admin created: admin@example.com / admin123');
  }

  return db;
}

module.exports = { init };
