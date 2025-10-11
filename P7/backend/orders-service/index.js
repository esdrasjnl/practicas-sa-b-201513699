const express = require('express'), { graphqlHTTP } = require('express-graphql'), { buildSchema } = require('graphql'), fetch = (...args)=> import('node-fetch').then(({default:f})=>f(...args));
const mysql = require('mysql2/promise'); require('dotenv').config();
const app = express(); const port=4200;
let pool;
async function init(){ pool = mysql.createPool({ host:process.env.DB_HOST||'mysql', user:process.env.DB_USER||'root', password:process.env.DB_PASSWORD||'rootpass', database:process.env.DB_NAME||'appdb' }); }
const schema = buildSchema(`type Order{ id:ID!, userId:Int!, total:Float! } type Query{ orders:[Order] } type Mutation{ createOrder(userId:Int!, productIds:[Int!]!): Order }`);
const root = {
  orders: async ()=> { const [r]=await pool.query('SELECT * FROM orders'); return r; },
  createOrder: async ({userId, productIds})=>{
    // validar user mínimo
    const u = await fetch(`http://user-service:4000/api/users/${userId}`); if(u.status!==200) throw new Error('user not found');
    // calc total simple
    let total=0;
    for(const pid of productIds){ const p = await fetch(`http://product-service:4100/api/products/${pid}`); if(p.status!==200) throw new Error('product not found'); const pd=await p.json(); total+=parseFloat(pd.price); }
    const [r]=await pool.query('INSERT INTO orders (user_id,total) VALUES (?,?)',[userId,total]);
    return { id: r.insertId, userId, total };
  }
};
app.use('/graphql', graphqlHTTP({schema, rootValue: root, graphiql:true}));
init().then(()=>app.listen(port,()=>console.log('orders-service',port)));
