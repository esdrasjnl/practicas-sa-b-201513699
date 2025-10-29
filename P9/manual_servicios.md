# Manual Completo: Despliegue y pruebas de user-service y product-service en GKE

## 1️⃣ Requisitos Previos

- Kubernetes cluster en GKE (`cluster-practicas`)
- Docker instalado en Mac M3 Pro
- Acceso a Docker Hub con usuario `esdrasjnl`
- Código de `user-service` y `product-service` con Dockerfile
- MySQL configurado en el namespace `practicas`

---

## 2️⃣ Construir imágenes compatibles con GKE

Mac M3 Pro usa `arm64`, pero tus nodos GKE son `amd64`. Usar Docker Buildx:

```bash
# Crear builder multi-plataforma (solo la primera vez)
docker buildx create --use

# Build y push user-service
docker buildx build --platform linux/amd64 -t esdrasjnl/user-service:latest --push .

# Build y push product-service
docker buildx build --platform linux/amd64 -t esdrasjnl/product-service:latest --push .
```

---

## 3️⃣ Crear Secrets

### user-secret.yaml

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: user-secret
  namespace: practicas
type: Opaque
data:
  JWT_TOKEN: "dG9rZW5fdGVzdA=="
  EMAIL_USER: "cHJveWVjdG9zaW5nNTRAZ21haWwuY29t"
  EMAIL_PASS: "aGt4aiBpeHhyIG9ldmMgaGRxcA=="
  NODE_ENV: "cHJvZHVjdGlvbg=="
  LOG_LEVEL: "aW5mbw=="
  SERVICE_NAME: "dXNlci1zZXJ2aWNl"
```

### product-secret.yaml

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: product-secret
  namespace: practicas
type: Opaque
data:
  JWT_TOKEN: "dG9rZW5fdGVzdA=="
  EMAIL_USER: "cHJveWVjdG9zaW5nNTRAZ21haWwuY29t"
  EMAIL_PASS: "aGt4aiBpeHhyIG9ldmMgaGRxcA=="
  NODE_ENV: "cHJvZHVjdGlvbg=="
  LOG_LEVEL: "aW5mbw=="
  SERVICE_NAME: "cHJvZHVjdC1zZXJ2aWNl"
```

Aplicar los secrets:

```bash
kubectl apply -f user-secret.yaml
kubectl apply -f product-secret.yaml
```

---

## 4️⃣ Deployments con Secrets y LoadBalancer

### user-deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: practicas
spec:
  replicas: 1
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: esdrasjnl/user-service:latest
        ports:
        - containerPort: 8010
        envFrom:
        - secretRef:
            name: user-secret
      imagePullSecrets:
      - name: dockerhub-secret
```

### product-deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-service
  namespace: practicas
spec:
  replicas: 1
  selector:
    matchLabels:
      app: product-service
  template:
    metadata:
      labels:
        app: product-service
    spec:
      containers:
      - name: product-service
        image: esdrasjnl/product-service:latest
        ports:
        - containerPort: 8011
        envFrom:
        - secretRef:
            name: product-secret
      imagePullSecrets:
      - name: dockerhub-secret
```

---

## 5️⃣ Services con LoadBalancer

### user-service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: practicas
spec:
  selector:
    app: user-service
  type: LoadBalancer
  ports:
  - protocol: TCP
    port: 8010
    targetPort: 8010
```

### product-service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: product-service
  namespace: practicas
spec:
  selector:
    app: product-service
  type: LoadBalancer
  ports:
  - protocol: TCP
    port: 8011
    targetPort: 8011
```

Aplicar los services:

```bash
kubectl apply -f user-service.yaml
kubectl apply -f product-service.yaml
```

---

## 6️⃣ Reiniciar los pods para tomar los secrets y nuevas imágenes

```bash
kubectl rollout restart deployment user-service -n practicas
kubectl rollout restart deployment product-service -n practicas
```

Verificar pods:

```bash
kubectl get pods -n practicas
```

---

## 7️⃣ Verificar variables de entorno

```bash
kubectl exec -it $(kubectl get pod -l app=user-service -n practicas -o jsonpath='{.items[0].metadata.name}') -n practicas -- env | grep JWT_TOKEN
kubectl exec -it $(kubectl get pod -l app=product-service -n practicas -o jsonpath='{.items[0].metadata.name}') -n practicas -- env | grep SERVICE_NAME
```

---

## 8️⃣ Probar conectividad interna entre pods

```bash
kubectl exec -it $(kubectl get pod -l app=user-service -n practicas -o jsonpath='{.items[0].metadata.name}') -n practicas -- ping mysql
kubectl exec -it $(kubectl get pod -l app=product-service -n practicas -o jsonpath='{.items[0].metadata.name}') -n practicas -- ping mysql
```

---

## 9️⃣ Conectarse a MySQL y crear tablas necesarias

```bash
kubectl exec -it mysql-c8558b5fb-jvr7j -n practicas -- mysql -u root -p
```

### Crear base y tabla `products`

```sql
CREATE DATABASE IF NOT EXISTS p9db;
USE p9db;

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, description, price, stock) VALUES
('Producto 1', 'Descripción 1', 10.50, 100),
('Producto 2', 'Descripción 2', 25.00, 50);
```

> Repetir proceso para otras tablas requeridas por `user-service`.

---

## 🔟 Probar endpoints desde local con IP pública

```bash
# user-service
curl http://<USER_SERVICE_EXTERNAL_IP>:8010/health

# product-service
curl http://<PRODUCT_SERVICE_EXTERNAL_IP>:8011/products/
```

En Postman, usar **GET** a la misma URL y enviar JWT si el endpoint lo requiere:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## 1️⃣1️⃣ Revisar logs en caso de errores

```bash
kubectl logs -l app=user-service -n practicas
kubectl logs -l app=product-service -n practicas
```

Esto permite identificar errores de conexión a DB, JWT o endpoints.

---

## 1️⃣2️⃣ Notas importantes

- Los secrets son cargados vía `envFrom`, si cambias alguno debes **reiniciar los pods**.  
- Las IPs públicas aparecen en `kubectl get svc -n practicas` bajo `EXTERNAL-IP`.  
- En producción se recomienda usar **Ingress** y DNS en lugar de LoadBalancer directo.  
- Para crear tablas automáticamente, si tu proyecto usa ORM (`sequelize`, `knex`), puedes ejecutar migraciones desde el pod del servicio:

```bash
kubectl exec -it $(kubectl get pod -l app=product-service -n practicas -o jsonpath='{.items[0].metadata.name}') -n practicas -- npm run migrate
```
```

---