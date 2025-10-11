FROM node:18-alpine

WORKDIR /app

# Copiar package.json y package-lock.json (si existe)
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar todo el código
COPY . .

# Construir para producción
RUN npm run build

# Servir con un server simple
RUN npm install -g serve
EXPOSE 80
CMD ["serve", "-s", "build"]
