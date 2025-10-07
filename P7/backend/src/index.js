require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
let pool;

async function initDb() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'appuser',
    password: process.env.DB_PASSWORD || 'apppass',
    database: process.env.DB_NAME || 'appdb',
    waitForConnections: true,
    connectionLimit: 10
  });
  await pool.query(`CREATE TABLE IF NOT EXISTS items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL
  )`);
}

app.get('/health', (_, res) => res.json({status: 'ok'}));

app.get('/items', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM items');
  res.json(rows);
});

app.post('/items', async (req, res) => {
  const { name } = req.body;
  const [result] = await pool.query('INSERT INTO items (name) VALUES (?)', [name]);
  res.json({ id: result.insertId, name });
});

initDb()
  .then(() => app.listen(PORT, () => console.log(`Backend running on ${PORT}`)))
  .catch(err => { console.error(err); process.exit(1); });
