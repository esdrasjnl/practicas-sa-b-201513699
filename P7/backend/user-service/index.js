// user-service: REST muy simple con root
const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(express.json());
const port = 4000;

// Pool de conexiones con root
let pool;
async function init() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql-db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Test de conexión inicial
  try {
    await pool.query('SELECT 1');
    console.log('Conexión a MySQL exitosa');
  } catch (err) {
    console.error('Error conectando a MySQL:', err);
  }
}

// Rutas
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/test', async (req, res) => {
  try {
    const [rows] = {"calificacion": "test"}
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    const [r] = await pool.query('INSERT INTO users (name,email) VALUES (?,?)', [name, email]);
    res.json({ id: r.insertId, name, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

init().then(() => app.listen(port, () => console.log('user-service on', port)));
