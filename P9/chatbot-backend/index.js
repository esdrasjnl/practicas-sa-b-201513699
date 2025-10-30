require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { OpenAI } = require('openai');

const { getProducts } = require('./services/productService');
const { getUsers } = require('./services/userService');

const app = express();

// ✅ CORS: permitir cualquier origen
app.use(cors());
app.use(express.json());

// Inicializar cliente OpenAI (Router HF)
const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HUGGINGFACE_API_KEY,
});

// Leer reglas desde prompt.txt
let systemPrompt = "Eres un asistente útil.";
try {
  systemPrompt = fs.readFileSync('prompt.txt', 'utf-8');
} catch {
  console.log("No se encontró prompt.txt, se usará el prompt por defecto.");
}

// Cargar respuestas locales
let respuestas = {};
try {
  respuestas = JSON.parse(fs.readFileSync('respuestas.json', 'utf-8'));
} catch {
  console.log("No se encontró respuestas.json, solo se usarán servicios y GPT gratis.");
}

// 🔹 Conversaciones en memoria
let conversaciones = {}; // { userId: [{role, text}, ...] }

// Función para consultar modelo MiniMax en HF Router
const askMiniMax = async (messages) => {
  try {
    const chatCompletion = await client.chat.completions.create({
      model: "MiniMaxAI/MiniMax-M2:novita",
      messages
    });
    return chatCompletion.choices[0].message.content;
  } catch (err) {
    console.error("❌ Error MiniMax:", err.message);
    return "Lo siento, hubo un error al consultar GPT gratis.";
  }
};

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ message: '🚀 Backend del chatbot funcionando correctamente' });
});

// Ruta principal del chatbot
app.post('/chat', async (req, res) => {
  const { userId, text } = req.body;
  if (!userId || !text) return res.status(400).json({ error: 'Falta userId o text' });

  if (!conversaciones[userId]) conversaciones[userId] = [];

  const lowerText = text.toLowerCase();
  let answer = null;

  try {
    // 1️⃣ Respuestas locales
    for (let key in respuestas) {
      if (lowerText.includes(key.toLowerCase())) {
        answer = respuestas[key];
        break;
      }
    }

    // 2️⃣ Consultar productos
    if (!answer && /producto|productos|cocina|autos/.test(lowerText)) {
      const filterMatch = lowerText.match(/cocina|autos/i);
      const filter = filterMatch ? filterMatch[0] : null;
      const products = await getProducts(filter);
      if (products.length) {
        answer = `Encontré los siguientes productos${filter ? ` de ${filter}` : ''}:\n` +
                 products.map(p => `• ${p.name} - ${p.description} ($${p.price})`).join('\n');
      } else {
        answer = "No encontré productos que coincidan con tu búsqueda.";
      }
    }

    // 3️⃣ Consultar usuarios
    if (!answer && lowerText.includes("usuario")) {
      const users = await getUsers();
      if (users.length) {
        answer = "Estos son los usuarios disponibles:\n" +
                 users.map(u => `• ${u.name} (${u.email})`).join('\n');
      } else {
        answer = "No hay usuarios disponibles.";
      }
    }

    // 4️⃣ Si no hay coincidencia, usar MiniMax GPT
    if (!answer) {
      const messages = [
        { role: "system", content: systemPrompt },
        ...conversaciones[userId].map(m => ({ role: m.role, content: m.text })),
        { role: "user", content: text }
      ];

      answer = await askMiniMax(messages);
    }

  } catch (err) {
    console.error("❌ Error al procesar mensaje:", err.message);
    answer = "Lo siento, ocurrió un error al procesar tu solicitud.";
  }

  // Guardar en historial
  conversaciones[userId].push({ role: "user", text });
  conversaciones[userId].push({ role: "assistant", text: answer });

  res.json({ answer });
});

// Iniciar servidor
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`Backend escuchando en http://localhost:${PORT}`));
