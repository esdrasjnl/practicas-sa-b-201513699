# Dockerfile para product-service
FROM python:3.11-slim

# Directorio de trabajo
WORKDIR /app

# Copiar y instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código
COPY . .

# Exponer el puerto que usa Flask
EXPOSE 4000

# Comando para iniciar la aplicación
CMD ["python", "app.py"]
