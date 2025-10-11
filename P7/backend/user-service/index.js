// user-service: REST muy simple
const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();
const app = express(); app.use(express.json());
const port = 4000;

let pool;
async function init() {
  pool = mysql.createPool({
    host: process.env.DB_HOST||'mysql',
    user: process.env.DB_USER||'root',
    password: process.env.DB_PASSWORD||'rootpass',
    database: process.env.DB_NAME||'appdb'
  });
}
app.get('/api/users', async (req,res)=>{
  const [rows]=await pool.query('SELECT * FROM users');
  res.json(rows);
});
app.post('/api/users', async (req,res)=>{
  const {name,email}=req.body;
  const [r]=await pool.query('INSERT INTO users (name,email) VALUES (?,?)',[name,email]);
  res.json({id:r.insertId,name,email});
});
init().then(()=>app.listen(port,()=>console.log('user-service on',port)));
