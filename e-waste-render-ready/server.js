require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { init } = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN || '7d';
const PORT = process.env.PORT || process.env.PORT || 3000;

async function main() {
  const db = await init();
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Serve frontend static files
  app.use(express.static(path.join(__dirname, 'public')));

  function sign(user) {
    return jwt.sign({ id: user.id, email: user.email, isAdmin: !!user.isAdmin }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
  }

  async function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Missing authorization' });
    const token = header.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  // Signup
  app.post('/api/signup', async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
      const existing = await db.get(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase()]);
      if (existing) return res.status(400).json({ error: 'Email already used' });
      const hash = await bcrypt.hash(password, 10);
      const result = await db.run(`INSERT INTO users (name,email,password) VALUES (?,?,?)`, [name, email.toLowerCase(), hash]);
      const user = await db.get(`SELECT id,name,email,isAdmin FROM users WHERE id = ?`, [result.lastID]);
      const token = sign(user);
      res.json({ user, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Login
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
      const user = await db.get(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase()]);
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
      const payloadUser = { id: user.id, name: user.name, email: user.email, isAdmin: !!user.isAdmin };
      const token = sign(payloadUser);
      res.json({ user: payloadUser, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Create request (user)
  app.post('/api/requests', authMiddleware, async (req, res) => {
    try {
      const { itemType, quantity, address, phone, preferredDate } = req.body;
      if (!itemType || !quantity || !address || !phone || !preferredDate) return res.status(400).json({ error: 'Missing fields' });
      const result = await db.run(
        `INSERT INTO requests (userId,itemType,quantity,address,phone,preferredDate) VALUES (?,?,?,?,?,?)`,
        [req.user.id, itemType, quantity, address, phone, preferredDate]
      );
      const r = await db.get(`SELECT * FROM requests WHERE id = ?`, [result.lastID]);
      res.json({ request: r });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Get my requests (user)
  app.get('/api/requests/mine', authMiddleware, async (req, res) => {
    const rows = await db.all(`SELECT r.*, u.name as userName, u.email as userEmail FROM requests r JOIN users u ON r.userId = u.id WHERE userId = ? ORDER BY createdAt DESC`, [req.user.id]);
    res.json({ requests: rows });
  });

  // Admin: get all requests
  app.get('/api/admin/requests', authMiddleware, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    const rows = await db.all(`SELECT r.*, u.name as userName, u.email as userEmail FROM requests r JOIN users u ON r.userId = u.id ORDER BY createdAt DESC`);
    res.json({ requests: rows });
  });

  // Admin: update status
  app.put('/api/admin/requests/:id/status', authMiddleware, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    const { status } = req.body;
    const id = req.params.id;
    if (!['pending', 'collected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    await db.run(`UPDATE requests SET status = ? WHERE id = ?`, [status, id]);
    const r = await db.get(`SELECT r.*, u.name as userName, u.email as userEmail FROM requests r JOIN users u ON r.userId = u.id WHERE r.id = ?`, [id]);
    res.json({ request: r });
  });

  // Admin: search/filter (simple via query)
  app.get('/api/admin/requests/search', authMiddleware, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    const q = (req.query.q || '').toLowerCase();
    const status = req.query.status || 'all';
    let sql = `SELECT r.*, u.name as userName, u.email as userEmail FROM requests r JOIN users u ON r.userId = u.id WHERE 1=1`;
    const params = [];
    if (status !== 'all') { sql += ` AND r.status = ?`; params.push(status); }
    if (q) {
      sql += ` AND (lower(r.itemType) LIKE ? OR lower(u.name) LIKE ? OR lower(u.email) LIKE ? OR r.id LIKE ?)`;
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    sql += ` ORDER BY r.createdAt DESC`;
    const rows = await db.all(sql, params);
    res.json({ requests: rows });
  });

  app.get('/api/ping', (req, res) => res.json({ ok: true }));

  // catch-all to serve index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
