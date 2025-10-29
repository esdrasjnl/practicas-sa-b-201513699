// seed script for user-service (connects to same DB)
require('dotenv').config();
const mysql = require('mysql2/promise');

async function seed(){
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'mysql',
    user: process.env.DB_USER || 'p9',
    password: process.env.DB_PASSWORD || 'p9pass',
    database: process.env.DB_NAME || 'p9db',
  });

  const users = [
    ['Carlos Perez','carlos.perez@example.com','Guatemala'],
    ['Ana Lopez','ana.lopez@example.com','Guatemala'],
    ['John Doe','john.doe@example.com','USA'],
    ['María González','maria.g@example.com','Guatemala']
  ];

  for (const u of users){
    try {
      await pool.query('INSERT INTO users (name,email,country) VALUES (?,?,?)', u);
    } catch(e){
      // ignore duplicate
    }
  }
  console.log('Users seeded');
  await pool.end();
}

seed().catch(console.error);
