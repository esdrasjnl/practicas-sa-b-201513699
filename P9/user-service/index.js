// user-service/index.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8010;

let pool;
async function initDbPool() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql',
    user: process.env.DB_USER || 'p9',
    password: process.env.DB_PASSWORD || 'p9pass',
    database: process.env.DB_NAME || 'p9db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}
initDbPool().catch(err => {
  console.error('DB init error', err);
  process.exit(1);
});

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// List users (filter by country)
app.get('/users', async (req, res) => {
  try {
    const { country, limit = 100, offset = 0 } = req.query;
    let sql = 'SELECT id, name, email, country, created_at FROM users';
    const params = [];
    if (country) {
      sql += ' WHERE country = ?';
      params.push(country);
    }
    sql += ' ORDER BY id LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Get user by id (with purchases)
app.get('/users/:id', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const [users] = await pool.query('SELECT id, name, email, country, created_at FROM users WHERE id = ?', [userId]);
    if (!users.length) return res.status(404).json({ error: 'not_found' });

    const [purchases] = await pool.query(
      `SELECT pu.id, pu.product_id, p.name as product_name, pu.quantity, pu.purchased_at
       FROM purchases pu JOIN products p ON p.id = pu.product_id
       WHERE pu.user_id = ?`, [userId]
    );

    const user = users[0];
    user.purchases = purchases;
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Get purchases for a user
app.get('/users/:id/purchases', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const [rows] = await pool.query(
      `SELECT pu.id, pu.product_id, p.name as product_name, pu.quantity, pu.purchased_at
       FROM purchases pu JOIN products p ON p.id = pu.product_id
       WHERE pu.user_id = ?`, [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Create user
app.post('/users', async (req, res) => {
  try {
    const { name, email, country } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name_and_email_required' });
    const [result] = await pool.query('INSERT INTO users (name, email, country) VALUES (?, ?, ?)', [name, email, country || null]);
    const [rows] = await pool.query('SELECT id, name, email, country, created_at FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'email_exists' });
    res.status(500).json({ error: 'server_error' });
  }
});

app.listen(PORT, () => {
  console.log(`user-service listening on ${PORT}`);
});
