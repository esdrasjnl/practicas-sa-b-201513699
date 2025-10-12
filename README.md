# Manual de Implementación de Microservicios en Kubernetes con CI/CD en GKE

## Índice
1. [Configuración Inicial](#1-configuración-inicial)
2. [Crear Repositorio de Imágenes](#2-crear-repositorio-de-imágenes)
3. [Autenticación de Docker](#3-autenticación-de-docker)
4. [Construir y Subir Imágenes](#4-construir-y-subir-imágenes)
5. [Crear Clúster en GKE](#5-crear-clúster-en-gke)
6. [Configurar Namespace](#6-configurar-namespace)
7. [Crear Secret para Base de Datos](#7-crear-secret-para-base-de-datos)
8. [Desplegar MySQL](#8-desplegar-mysql)
9. [Desplegar Microservicios](#9-desplegar-microservicios)
10. [Verificar Servicios](#10-verificar-servicios)
11. [Configurar CI/CD en Google Cloud Build](#11-configurar-cicd-en-google-cloud-build)

---

## 1. Configuración Inicial

Define las variables de entorno del proyecto:

```bash
export PROJECT_ID=groovy-treat-472922-b3
export CLUSTER_NAME=practicas-sa-cluster
export CLUSTER_ZONE=us-central1-c
export NAMESPACE=practicas-sa
export REPO_NAME=microservices-repo
```

Configura el proyecto de Google Cloud:

```bash
gcloud config set project $PROJECT_ID
gcloud services enable container.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

---

## 2. Crear Repositorio de Imágenes

```bash
gcloud artifacts repositories create $REPO_NAME \
    --repository-format=docker \
    --location=us-central1
```

Verifica que se creó correctamente:

```bash
gcloud artifacts repositories list --location=us-central1
```

---

## 3. Autenticación de Docker con Artifact Registry

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

---

## 4. Construir y Subir Imágenes de Microservicios

### User Service
```bash
docker build -t us-central1-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/user-service:latest ./backend/user-service
docker push us-central1-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/user-service:latest
```

### Product Service
```bash
docker build -t us-central1-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/product-service:latest ./backend/product-service
docker push us-central1-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/product-service:latest
```

---

## 5. Crear Clúster en GKE

```bash
gcloud container clusters create $CLUSTER_NAME \
    --zone $CLUSTER_ZONE \
    --num-nodes 2

gcloud container clusters get-credentials $CLUSTER_NAME --zone $CLUSTER_ZONE
```

---

## 6. Configurar Namespace

```bash
kubectl create namespace $NAMESPACE
```

---

## 7. Crear Secret para Base de Datos

```bash
kubectl create secret generic mysql-secret \
    --from-literal=DB_USER=root \
    --from-literal=DB_PASSWORD=tu_password \
    --from-literal=DB_NAME=practicas_sa \
    -n $NAMESPACE
```

---

## 8. Desplegar MySQL

Archivo: `k8s/mysql-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
  namespace: practicas-sa
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: DB_PASSWORD
            - name: MYSQL_DATABASE
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: DB_NAME
          ports:
            - containerPort: 3306
---
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: practicas-sa
spec:
  selector:
    app: mysql
  ports:
    - port: 3306
  type: ClusterIP
```

Aplicar el despliegue:

```bash
kubectl apply -f k8s/mysql-deployment.yaml
kubectl get pods -n $NAMESPACE -w
```

---

## 9. Desplegar Microservicios

### User Service: `k8s/user-service-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: practicas-sa
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
          image: us-central1-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/user-service:latest
          ports:
            - containerPort: 4000
          env:
            - name: DB_HOST
              value: mysql
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: DB_USER
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: DB_PASSWORD
            - name: DB_NAME
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: DB_NAME
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: practicas-sa
spec:
  selector:
    app: user-service
  ports:
    - protocol: TCP
      port: 4000
      targetPort: 4000
  type: ClusterIP
```

### Product Service: `k8s/product-service-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-service
  namespace: practicas-sa
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
          image: us-central1-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/product-service:latest
          ports:
            - containerPort: 4000
          env:
            - name: DB_HOST
              value: mysql
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: DB_USER
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: DB_PASSWORD
            - name: DB_NAME
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: DB_NAME
---
apiVersion: v1
kind: Service
metadata:
  name: product-service
  namespace: practicas-sa
spec:
  selector:
    app: product-service
  ports:
    - protocol: TCP
      port: 4000
      targetPort: 4000
  type: ClusterIP
```

Aplicar los despliegues:

```bash
kubectl apply -f k8s/user-service-deployment.yaml
kubectl apply -f k8s/product-service-deployment.yaml
kubectl get pods -n $NAMESPACE -w
```

---

## 10. Verificar Servicios

Listar servicios:

```bash
kubectl get svc -n $NAMESPACE
```

Acceder a los microservicios localmente (port-forward):

```bash
kubectl port-forward svc/user-service 4000:4000 -n $NAMESPACE
kubectl port-forward svc/product-service 4000:4000 -n $NAMESPACE
```

---

## 11. Configurar CI/CD en Google Cloud Build (modo gráfico)

### Paso 1: Crear Trigger en Cloud Build
1. Accede a Google Cloud Console → Cloud Build → Triggers.
2. Haz clic en **“Crear Trigger”**.
3. Conecta tu repositorio de GitHub o Cloud Source Repositories.
4. Selecciona **rama principal** o rama de desarrollo para trigger automático.
5. Tipo de Trigger: **Cloud Build config file (yaml)**.
6. Ubicación del archivo: `cloudbuild.yaml` en tu repo.

### Paso 2: Crear archivo `cloudbuild.yaml` para CI/CD
 
```yaml
steps:
# Construir imagen User Service
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/user-service:$SHORT_SHA', './backend/user-service']
# Push imagen User Service
- name: 'gcr.io

