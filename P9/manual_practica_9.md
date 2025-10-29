# Práctica 9 — Chatbot utilizando IA

> Manual paso a paso (archivo continuo) — carpeta: `P9`

---

## Índice

1. Resumen y objetivos
2. Requisitos previos
3. Estructura del repositorio y `P9`
4. Diseño de la arquitectura (diagrama y descripción)
5. Microservicios — responsabilidades y contratos
6. Desarrollo paso a paso
   - 6.1. Inicializar el repositorio
   - 6.2. Microservicio: `intent-service` (FastAPI)
   - 6.3. Microservicio: `qa-service` (Node.js / Express)
   - 6.4. Microservicio: `ai-service` (Python — LLM local / fallback)
   - 6.5. Backend orquestador `chatbot-backend`
   - 6.6. Frontend (React) — chat UI obligatorio
7. Integración, pruebas y ejemplo de inputs
8. Contenerización con Docker y `docker-compose`
9. Despliegue simple (opcional): Kubernetes local (minikube / kind)
10. Monitoreo y logs mínimos requeridos
11. Seguridad y buenas prácticas
12. Entregables y checklist
13. Anexos: ejemplos de archivos y comandos útiles

---

## 1. Resumen y objetivos

Esta práctica solicita implementar un **chatbot que use IA** y consuma **al menos 3 microservicios propios**. El frontend debe existir y presentar la interfaz de chat; las respuestas mostradas deben provenir de los microservicios propios (no de servicios externos durante la demostración).

**Objetivos principales**:
- Implementar 3+ microservicios con contratos REST internos.
- Construir backend orquestador que reciba inputs del frontend y coordine microservicios.
- Integrar una solución IA local o embebida para generación de respuestas (puede ser un LLM local, o un motor combinado de reglas + embedding + modelo pequeño local).
- Proveer documentación completa, manual de uso, diagrama de arquitectura y scripts de despliegue.

---

## 2. Requisitos previos

- Git instalado.
- Node.js (>= 18) y npm o yarn.
- Python 3.10+ y pip.
- Docker y `docker-compose` (para contenerizar y probar localmente).
- (Opcional para LLM local) `conda` o entorno virtual y `transformers` + modelo compatible, o `llama.cpp` si va a usar LLaMA en local.
- Editor de código (VSCode recomendado).

---

## 3. Estructura del repositorio y carpeta `P9`

Se debe crear una carpeta dentro del repo llamada `P9` como pide la práctica. Dentro de `P9` proponemos la siguiente estructura:

```
P9/
├── docs/
│   ├── arquitectura.png
│   └── manual_practica9.pdf (o md)
├── chatbot-backend/        # Orquestador (express o FastAPI)
├── intent-service/        # microservicio 1: detección de intención
├── qa-service/            # microservicio 2: preguntas frecuentes / knowledge
├── ai-service/            # microservicio 3: motor IA (generador de texto local)
├── frontend/              # React app (obligatorio)
├── docker-compose.yml
├── Makefile
└── README.md
```

**Nota**: El repositorio debe incluir `P9` en la raíz y solo esta carpeta será revisada por el auxiliar (según enunciado).

---

## 4. Diseño de la arquitectura (breve descripción)

- **Frontend (React)**: UI chat, envía `POST /api/chat` al orquestador.
- **Chatbot-backend**: Recibe requests, aplica pre-procesamiento, consulta `intent-service`, decide flujo, llama a `qa-service` y/o `ai-service`, compone la respuesta y la devuelve al frontend. Expone endpoint `/api/chat` y endpoints de health/logs.
- **Intent-service**: Expone `/predict` que recibe texto y devuelve `intent` (p.ej. `consulta_factura`, `saludo`, `pregunta_tecnica`) y entidades.
- **QA-service**: Base de conocimiento REST. Endpoints `/search?q=` y `/answer`.
- **AI-service**: Motor local para generación de texto — puede ser un pequeño modelo offline o un componente que llame a un modelo local (transformers) o una lógica híbrida (retrieval + generation). Debe exponer `/generate`.
- **Logs/Monitoring**: Cada servicio debe exponer `/metrics` (si se usa prom) y logs estructurados (JSON) a stdout para que filebeat/ELK puedan recogerlos si se desea.

(Dibujar diagrama en `docs/arquitectura.png` con boxes y flechas - incluir en la entrega).

---

## 5. Microservicios — responsabilidades y contratos

### 5.1 Intent-service (FastAPI) — Contrato mínimo
- Endpoint: `POST /predict`
- Body: `{ "text": "..." }`
- Response: `{ "intent": "saludo", "confidence": 0.92, "entities": {"producto":"X"} }`

### 5.2 QA-service (Express/Node) — Contrato mínimo
- Endpoint: `GET /search?q=...` -> devuelve lista de documentos/FAQs
- Endpoint: `POST /answer` Body: `{ "question": "...", "context": "..." }` -> Response: `{ "answer": "...", "source": "FAQ#23" }

### 5.3 AI-service (FastAPI/Python) — Contrato mínimo
- Endpoint: `POST /generate`
- Body: `{ "prompt": "...", "max_tokens": 256 }`
- Response: `{ "id": "uuid", "text": "...", "meta": {...} }`

### 5.4 Chatbot-backend (Orquestador)
- Endpoint expuesto al frontend: `POST /api/chat` Body: `{ "message": "...", "session_id": "..." }`
- Flujos internos: llama a `/predict`, decide si usar `qa-service` (retrieval) o `ai-service` (generación). Devuelve: `{ "reply": "...", "source": "ai|qa|rule", "trace": {...} }`.

---

## 6. Desarrollo paso a paso

> Aquí se explican los pasos concretos para desarrollar cada componente. Sigue el orden propuesto.

### 6.0 Crear el repo y carpeta P9

1. Crear repo en GitHub (o GitLab) y clonarlo localmente.

```bash
git clone git@github.com:<usuario>/<repo>.git
cd <repo>
mkdir -p P9
cd P9
```

2. Crear README dentro de `P9` explicando cómo arrancar la práctica.

```bash
cat > P9/README.md <<'EOF'
# P9 - Práctica 9: Chatbot con IA
Instrucciones para ejecutar localmente...
EOF
```

### 6.1 Intent-service (FastAPI)

1. Crear carpeta `P9/intent-service`.
2. Crear entorno virtual e instalar dependencias:

```bash
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn pydantic scikit-learn joblib
```

3. Implementar `main.py` ejemplo (básico, con modelo de intent simple):

```python
# intent-service/main.py
from fastapi import FastAPI
from pydantic import BaseModel
app = FastAPI()

class Req(BaseModel):
    text: str

@app.post('/predict')
def predict(r: Req):
    text = r.text.lower()
    # regla simple como ejemplo
    if any(w in text for w in ['hola', 'buenas', 'buenos']):
        return { 'intent': 'saludo', 'confidence': 0.98, 'entities': {} }
    if 'factura' in text:
        return { 'intent': 'consulta_factura', 'confidence': 0.95, 'entities': {} }
    return { 'intent': 'unknown', 'confidence': 0.6, 'entities': {} }

# correr: uvicorn main:app --host 0.0.0.0 --port 8001
```

4. Crear `Dockerfile` mínimo:

```
FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir fastapi uvicorn
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8001"]
```

### 6.2 QA-service (Node.js / Express)

1. Crear `P9/qa-service`.
2. `package.json` simple y `index.js`:

```js
// qa-service/index.js
const express = require('express');
const app = express();
app.use(express.json());
const faqs = [
  {id:1, q:'¿Cómo facturo?', a:'Para facturar...' }
];
app.get('/search', (req,res)=>{
  const q = (req.query.q||'').toLowerCase();
  const results = faqs.filter(f=>f.q.toLowerCase().includes(q));
  res.json(results);
});
app.post('/answer',(req,res)=>{
  const {question} = req.body;
  const found = faqs.find(f=>question.toLowerCase().includes('factur'));
  if(found) return res.json({answer: found.a, source: `faq:${found.id}`});
  return res.json({answer: null, source: null});
});
app.listen(8002, ()=>console.log('QA service running 8002'));
```

3. Dockerfile para `qa-service`:

```
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node","index.js"]
```

### 6.3 AI-service (Python) — motor de generación

> Recomendación: Para ajustarse a la restricción (no usar terceros en ejecución) se recomienda usar un modelo local pequeño o una estrategia híbrida: retrieval + template/rule-based fallback. Si no es posible correr un LLM local por recursos, implementar una **lógica generadora basada en templates** + embeddings locales (simulated) para demostrar la integración con `ai-service`.

1. Crear `P9/ai-service`.
2. Ejemplo simple con FastAPI que usa plantilla:

```python
# ai-service/main.py
from fastapi import FastAPI
from pydantic import BaseModel
app = FastAPI()
class Req(BaseModel):
    prompt: str
    max_tokens: int = 256

@app.post('/generate')
def generate(r: Req):
    # placeholder: una plantilla simple que echa mano del prompt
    text = f"Respuesta generada para: {r.prompt[:200]}"
    return {'id':'local-1', 'text': text, 'meta': {}}

# Correr: uvicorn main:app --port 8003
```

3. Si el equipo tiene capacidad, en vez de la plantilla puede integrarse `transformers` y un modelo ligero (ej. `distilgpt2`) local:

```bash
pip install transformers torch
```

Y luego cargar el modelo en startup y usar `model.generate(...)`.

4. Dockerfile (mínimo):

```
FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN pip install fastapi uvicorn
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8003"]
```

### 6.4 Chatbot-backend (Orquestador)

1. Crear `P9/chatbot-backend`.
2. Puede ser Express o FastAPI; ejemplo con Express (Node):

```js
// chatbot-backend/index.js
const express = require('express');
const fetch = require('node-fetch');
const app = express(); app.use(express.json());

const INTENT_URL = process.env.INTENT_URL || 'http://intent-service:8001/predict';
const QA_URL = process.env.QA_URL || 'http://qa-service:8002/answer';
const AI_URL = process.env.AI_URL || 'http://ai-service:8003/generate';

app.post('/api/chat', async (req,res)=>{
  const { message, session_id } = req.body;
  // 1. predict intent
  const pred = await fetch(INTENT_URL, {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({text: message})});
  const p = await pred.json();

  // 2. Decide flow
  if(p.intent === 'consulta_factura'){
    // call qa-service first
    const qres = await fetch(QA_URL, {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({question: message})});
    const qa = await qres.json();
    if(qa.answer) return res.json({reply: qa.answer, source: 'qa', trace:{intent: p}});
  }
  // 3. fallback to ai-service
  const ai = await fetch(AI_URL, {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({prompt: message})});
  const aiR = await ai.json();
  return res.json({reply: aiR.text, source: 'ai', trace:{intent: p}});
});

app.get('/health', (req,res)=>res.send('ok'));
app.listen(8000, ()=>console.log('chatbot backend 8000'));
```

3. Dockerfile equivalente y variables de entorno en `docker-compose` para apuntar a los servicios.

### 6.5 Frontend (React) — obligatorio

1. Crear `P9/frontend` con `create-react-app` o Vite.

```bash
cd P9
npm create vite@latest frontend --template react
cd frontend
npm install
```

2. Estructura mínima: un componente `Chat` que envíe `POST /api/chat` al backend. El backend expuesto por `chatbot-backend` puede montarse detrás de un proxy (Nginx) o `proxy` en dev.

3. Ejemplo simple (pseudocódigo):

```jsx
// src/App.jsx
import { useState } from 'react'
export default function App(){
  const [msgs,setMsgs] = useState([])
  const [text,setText] = useState('')
  const send = async ()=>{
    const resp = await fetch('/api/chat', {method:'POST', body: JSON.stringify({message:text}), headers:{'content-type':'application/json'}})
    const j = await resp.json()
    setMsgs(m=>[...m, {from:'user', text}, {from:'bot', text: j.reply}])
    setText('')
  }
  return (
    <div>
      <div id='chat'>
        {msgs.map((m,i)=> <div key={i} className={m.from}>{m.text}</div>)}
      </div>
      <input value={text} onChange={e=>setText(e.target.value)} />
      <button onClick={send}>Enviar</button>
    </div>
  )
}
```

4. UI/UX: Añadir diseño sencillo con Bootstrap o Tailwind. Debe ser agradable porque la rúbrica valora UI/UX.

---

## 7. Integración, pruebas y ejemplos de inputs

### 7.1 Ejecutar localmente sin Docker (desarrollo)

- Arrancar `intent-service` (puerto 8001)
- Arrancar `qa-service` (puerto 8002)
- Arrancar `ai-service` (puerto 8003)
- Arrancar `chatbot-backend` (puerto 8000)
- Ejecutar `frontend` (puerto 3000)

Probar via UI: escribir `Hola`, `Tengo un problema con mi factura`, `¿Cómo funciona X?`.

### 7.2 Ejemplo de inputs y outputs (manual de uso)

- Input: `Hola` -> Resultado esperado: `Saludo` (intent) -> Respuesta: `Hola, ¿en qué puedo ayudarte hoy?` (source: rule/intent)
- Input: `Quiero ver mi factura 1234` -> Intent `consulta_factura` -> QA-service responde con la información de la FAQ o instrucciones.
- Input: `Explícame cómo instalar Docker` -> Intent `unknown` -> Fallback a `ai-service` -> respuesta generada.

Incluir estos ejemplos en `docs/manual_practica9_examples.md`.

---

## 8. Contenerización con Docker y `docker-compose`

Crear `P9/docker-compose.yml` con los servicios y redes:

```yaml
version: '3.8'
services:
  intent-service:
    build: ./intent-service
    container_name: intent-service
    ports: ['8001:8001']
    networks: - p9net
  qa-service:
    build: ./qa-service
    container_name: qa-service
    ports: ['8002:8002']
    networks: - p9net
  ai-service:
    build: ./ai-service
    container_name: ai-service
    ports: ['8003:8003']
    networks: - p9net
  chatbot-backend:
    build: ./chatbot-backend
    container_name: chatbot-backend
    ports: ['8000:8000']
    depends_on: ['intent-service','qa-service','ai-service']
    networks: - p9net
  frontend:
    build: ./frontend
    container_name: frontend
    ports: ['3000:3000']
    depends_on: ['chatbot-backend']
    networks: - p9net
networks:
  p9net:
    driver: bridge
```

> Ejecutar:

```bash
cd P9
docker-compose up --build
```

Verificar `/` del frontend y probar chat.

---

## 9. Despliegue simple: Kubernetes local (opcional)

Si deseas presentar en laboratorio usando Kubernetes, empaqueta cada servicio en una imagen y crea Deployments + Services. Añade un `ingress` para exponer el frontend. Para pruebas locales puedes usar `minikube` o `kind`.

Archivos a incluir: `k8s/intent-depl.yaml`, `k8s/qa-depl.yaml`, etc. Asegúrate de namespace `so1-fase2` si el curso lo requiere (tu contexto previo indica `so1-fase2`).

---

## 10. Monitoreo y logs mínimos requeridos

La práctica solicita monitoreo y registros. Mínimos requeridos:

- Cada servicio emite logs en JSON a stdout: timestamp, level, service, message.
- Backend expone `/health` y `/metrics` (si implementas Prometheus). Si no implementas `metrics`, asegúrate de health endpoints y logs.
- Incluir un simple script `scripts/collect_logs.sh` que muestre `docker logs` de cada servicio y los guarde en `logs/`.

Ejemplo `collect_logs.sh`:

```bash
#!/usr/bin/env bash
mkdir -p logs
docker-compose logs intent-service > logs/intent.log
docker-compose logs qa-service > logs/qa.log
docker-compose logs ai-service > logs/ai.log
docker-compose logs chatbot-backend > logs/backend.log
```

---

## 11. Seguridad y buenas prácticas

- No subir credenciales al repo.
- Validar inputs y manejar errores con códigos HTTP adecuados.
- Limitar tamaño de `prompt` al `ai-service`.
- Usar CORS únicamente entre orígenes necesarios durante la demo.

---

## 12. Entregables y checklist (para subir a UEDI)

Dentro de `P9` incluir:

- `docs/manual_practica9.md` (este archivo convertido a PDF opcional).
- Código fuente de cada microservicio.
- `docker-compose.yml` y/o manifiestos `k8s/`.
- Scripts (`scripts/collect_logs.sh`, `scripts/build.sh`).
- Archivos de configuración (Dockerfile, package.json, requirements.txt).
- Diagrama de arquitectura (`docs/arquitectura.png`).
- `README.md` con comandos para ejecutar y descripción breve.
- Último commit antes de la fecha/hora de entrega (revisar cronograma: entregar antes de 30/10/2025 medio día).

**Checklist rápido**:
- [ ] Carpeta `P9` con todo
- [ ] Frontend funcional (UI)
- [ ] Backend orquestador funcionando
- [ ] 3 microservicios implementados y llamados desde el chatbot
- [ ] Logs y endpoints de health
- [ ] Documentación en MD/PDF
- [ ] Añadir al auxiliar como Developer

---

## 13. Anexos: ejemplos de comandos y fragmentos útiles

### Comandos útiles

```bash
# build docker-compose
docker-compose build --parallel
# levantar en background
docker-compose up -d
# ver logs
docker-compose logs -f chatbot-backend
# ejecutar tests (ejemplo pytest)
pytest -q
```

### Ejemplo de README corto que debe contener P9/README.md

```
# P9 - Práctica 9
Para ejecutar localmente:
1. cd P9
2. docker-compose up --build
3. Abrir http://localhost:3000

Para desarrollo sin Docker, arrancar cada servicio en su puerto local y ejecutar frontend.
```

---

## Manual de uso (resumen para el entregable)

1. Abrir frontend (http://localhost:3000)
2. Escribir un mensaje en el chat (p.ej. "Hola")
3. El frontend enviará `POST /api/chat` al `chatbot-backend`.
4. Backend llamará a `intent-service` y según la intención llamará a `qa-service` o `ai-service`.
5. La respuesta se mostrará en pantalla y los logs contendrán el `trace` con la ruta tomada.

Ejemplos de inputs para el PDF de entrega:
- "Hola"
- "Quiero ver mi factura 1234"
- "Explícame cómo instalar Docker en Ubuntu"

---

## Notas finales y recomendaciones

- Prioriza que el **frontend exista y sea funcional** — la rúbrica lo exige fuertemente.
- Si no puedes correr un LLM local por recursos, documenta la limitación y usa una combinación de reglas + retrieval (QA) en `ai-service` para demostrar el comportamiento inteligente.
- Incluye un apartado en la documentación donde expliques la elección de la herramienta IA, sus *funcionalidades, límites y costos* (si usaste algún servicio pago o modelo que tenga licencia), tal como lo pide la práctica.

---

**Fin del manual (archivo continuo).**

