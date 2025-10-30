# Chatbot con Hugging Face - Documentación

## Descripción de la herramienta

Este chatbot utiliza el modelo **MiniMaxAI/MiniMax-M2:novita** alojado en **Hugging Face**, que permite generar respuestas conversacionales en lenguaje natural.

### Funcionalidades Clave

* Responde preguntas generales usando inteligencia artificial.
* Puede integrarse con servicios propios, como `productService` y `userService`.
* Mantiene historial de conversaciones por usuario en memoria.
* Permite añadir reglas locales y prompts personalizados.
* Interfaz CORS habilitada para comunicación desde cualquier frontend.

### Precios y restricciones

* Hugging Face ofrece planes gratuitos con limitaciones de requests por minuto y tamaño de modelo.
* Para acceso extendido, es necesario un token con plan pago.
* Uso de modelo local no está incluido, todo depende del servicio de Hugging Face.

## Arquitectura

```text
+------------------+       HTTP       +-------------------+
|                  | <--------------> |                   |
|  Frontend React  |                  |   Backend NodeJS  |
|                  | ----------------> |                   |
+------------------+       /chat      +-------------------+
                                         |
                                         | Calls Services
                                         |
                     +-------------------+-------------------+
                     |                                       |
           +-------------------+                     +----------------+
           | productService.js  |                     | userService.js |
           +-------------------+                     +----------------+
                                         |
                                         v
                                 +-------------------+
                                 | Hugging Face API  |
                                 | MiniMax-M2 Model  |
                                 +-------------------+
```

## Manual de uso

### Backend

#### Instalación

```bash
git clone <repo-url>
cd chatbot-backend
npm install dotenv express cors axios
```

#### Configuración

Crear archivo `.env`:

```env
PORT=5050
HF_TOKEN=tu_huggingface_token
USER_SERVICE_URL=http://<user-service-url>
```

#### Ejecutar

```bash
node index.js
```

El backend estará disponible en `http://localhost:5050`

### Frontend

#### Componente React `Chatbot.js`

```javascript
import { useState } from 'react';

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const userId = 'user1';

  const sendMessage = async () => {
    if (!input) return;
    const text = input;
    setMessages([...messages, { role: 'user', text }]);
    setInput('');

    try {
      const res = await fetch('http://localhost:5050/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, text })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
    }
  };

  return (
    <div>
      <div>
        {messages.map((m,i) => (
          <div key={i} className={m.role}>{m.role}: {m.text}</div>
        ))}
      </div>
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={sendMessage}>Enviar</button>
    </div>
  );
}
```

### Ejemplo de interacción

**Input usuario:** `Muéstrame productos de cocina`

**Respuesta:**

```
Encontré los siguientes productos de cocina:
• Sartén antiadherente - Para todo tipo de cocina ($25)
• Juego de cuchillos - Acero inoxidable ($40)
```

**Input usuario:** `¿Quiénes son los usuarios disponibles?`

**Respuesta:**

```
Estos son los usuarios disponibles:
• Juan Pérez (juan@mail.com)
• Ana López (ana@mail.com)
```

**Input usuario:** `Cuál es la capital de Francia?`

**Respuesta usando GPT gratuito:**

```
La capital de Francia es París.
```

### Historial de conversación

El backend mantiene conversaciones en memoria usando el objeto:

```javascript
let conversaciones = {
  userId: [
    { role: 'user', text: 'Hola' },
    { role: 'assistant', text: '¡Hola! ¿En qué puedo ayudarte?' }
  ]
};
```

### Uso de servicios

* `productService.js` para consultar productos filtrando por palabra clave.
* `userService.js` para obtener usuarios desde un servicio REST externo.

### Integración GPT gratuito

* Se llama al modelo **MiniMax-M2** de Hugging Face para preguntas que no coincidan con reglas locales ni servicios propios.
* Se requiere el token de Hugging Face (`HF_TOKEN`) en `.env`.

---

**Nota:** Para producción, se recomienda un almacenamiento persistente de conversaciones y un manejo de errores más robusto. Se pueden agregar más reglas locales en `respuestas.json` y prompts en `prompt.txt` para personalizar la interacción.
