FROM node:18-alpine

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production

# Copiar el resto del proyecto
COPY . .

# Exponer el puerto
EXPOSE 4000

# Ejecutar la app
CMD ["node", "index.js"]
