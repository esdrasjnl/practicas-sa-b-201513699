require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getUsers } = require('./services/userService');
const { getProducts } = require('./services/productService');


const app = express();
app.use(cors());
app.use(express.json());


// Endpoint para chatbot
app.post('/chat', async (req, res) => {
const { question } = req.body;
try {
if (question.toLowerCase().includes('usuarios')) {
const users = await getUsers();
return res.json({ answer: users });
} else if (question.toLowerCase().includes('productos')) {
const products = await getProducts();
return res.json({ answer: products });
} else {
return res.json({ answer: 'No entiendo la pregunta.' });
}
} catch (err) {
res.status(500).json({ error: err.message });
}
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend escuchando en puerto ${PORT}`));