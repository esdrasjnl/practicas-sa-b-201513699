const express = require('express'), { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
app.use('/api/users', createProxyMiddleware({ target:'http://user-service:4000', changeOrigin:true }));
app.use('/api/products', createProxyMiddleware({ target:'http://product-service:4100', changeOrigin:true }));
app.use('/graphql/orders', createProxyMiddleware({ target:'http://orders-service:4200', changeOrigin:true, pathRewrite: {'^/graphql/orders':'/graphql'} }));
app.get('/health', (req,res)=>res.json({ok:true}));
app.listen(3000, ()=>console.log('gateway on 3000'));
