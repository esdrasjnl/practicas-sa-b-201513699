// product-service/index.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8011;

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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// List products
app.get('/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, description, price, stock, created_at FROM products ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Get product
app.get('/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query('SELECT id, name, description, price, stock, created_at FROM products WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Purchase product (transactional)
app.post('/products/:id/purchase', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const productId = Number(req.params.id);
    const { user_id, quantity = 1 } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id_required' });
    await conn.beginTransaction();

    // Check product and stock
    const [prodRows] = await conn.query('SELECT id, stock FROM products WHERE id = ? FOR UPDATE', [productId]);
    if (!prodRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'product_not_found' });
    }
    const product = prodRows[0];
    if (product.stock < quantity) {
      await conn.rollback();
      return res.status(409).json({ error: 'insufficient_stock' });
    }

    // decrement stock
    await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, productId]);

    // insert purchase - ensure user exists (simple check)
    const [userRows] = await conn.query('SELECT id FROM users WHERE id = ?', [user_id]);
    if (!userRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'user_not_found' });
    }

    await conn.query('INSERT INTO purchases (user_id, product_id, quantity) VALUES (?, ?, ?)', [user_id, productId, quantity]);
    await conn.commit();

    res.json({ status: 'ok', product_id: productId, user_id, quantity });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  } finally {
    conn.release();
  }
});

// Products purchased by users in a country
app.get('/products/purchased-by-country', async (req, res) => {
  try {
    const country = req.query.country;
    if (!country) return res.status(400).json({ error: 'country required' });

    const sql = `
      SELECT p.id, p.name,
             SUM(pu.quantity) AS total_quantity,
             JSON_ARRAYAGG(JSON_OBJECT('user_id', u.id, 'name', u.name, 'email', u.email)) AS buyers
      FROM purchases pu
      JOIN products p ON p.id = pu.product_id
      JOIN users u ON u.id = pu.user_id
      WHERE u.country = ?
      GROUP BY p.id, p.name
      ORDER BY total_quantity DESC
    `;
    const [rows] = await pool.query(sql, [country]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

app.listen(PORT, () => {
  console.log(`product-service listening on ${PORT}`);
});
