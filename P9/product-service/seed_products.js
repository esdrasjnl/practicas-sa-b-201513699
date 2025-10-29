// seed script for product-service
require('dotenv').config();
const mysql = require('mysql2/promise');

async function seed(){
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'mysql',
    user: process.env.DB_USER || 'p9',
    password: process.env.DB_PASSWORD || 'p9pass',
    database: process.env.DB_NAME || 'p9db',
  });

  const products = [
    ['Cafetera X100','Cafetera automática 1.5L',59.90,10],
    ['Auriculares Pro','Auriculares inalámbricos',89.50,20],
    ['Laptop Student','Laptop 8GB RAM, 256GB SSD',399.99,5]
  ];

  for (const p of products){
    try {
      await pool.query('INSERT INTO products (name,description,price,stock) VALUES (?,?,?,?)', p);
    } catch(e){
      // ignore duplicates
    }
  }
  console.log('Products seeded');
  await pool.end();
}

seed().catch(console.error);
