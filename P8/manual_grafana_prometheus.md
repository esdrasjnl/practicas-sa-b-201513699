# Practica8_Monitorizacion_Completa.md

# 📘 Prác­tica 8 — Moni­tori­za­ción y Lo­gging en Kubernetes (Prometheus, Grafana y ELK)
**Curso:** Software Avanzado (SA)  
**Estudiante:** [Tu nombre]  
**Sección:** B  
**Fecha:** Octubre 2025

---

## Índice
1. Resumen y objetivos
2. Requisitos previos
3. Estructura del repositorio y archivos incluidos
4. Creación del clúster (script)
5. Namespaces y manifiestos de los microservicios (`user` y `content`)
6. Instalación de Prometheus (Helm) + reglas de alerta
7. Instalación de Grafana + importar dashboard
8. Instalación de ELK (Elasticsearch, Kibana) y Filebeat
9. Conexiones y verificación
10. Pruebas y generación de carga
11. Entrega y notas finales
12. Anexos: todos los archivos (YAML/JSON/SH)

---

## 1. Resumen y objetivos
Implementar y configurar soluciones avanzadas de monitorización y logging utilizando Prometheus, Grafana y ELK sobre un clúster GKE. Centralizar logs de los microservicios `user` y `content`, recolectar métricas, crear dashboards y configurar alertas.

---

## 2. Requisitos previos
- Cuenta de Google Cloud con facturación habilitada.
- `gcloud` CLI instalado y autenticado.
- `kubectl` instalado.
- `helm` instalado.
- Acceso al clúster GKE (`gcloud container clusters get-credentials ...`).
- Repositorio con la estructura sugerida (se indica más adelante).

---

## 3. Estructura del repositorio y archivos incluidos

```
Practica8/
├── docs/
│   └── Practica8_Monitorizacion_Completa.md   <- este archivo
├── infra/
│   ├── create-cluster.sh
│   ├── prometheus/
│   │   └── alert-rules.yaml
│   ├── grafana/
│   │   └── chapinflix-dashboard.json
│   └── elk/
│       ├── elasticsearch-values.yaml
│       ├── kibana-values.yaml
│       └── filebeat-values.yaml
└── manifests/
    ├── namespace.yaml
    ├── user-deploy.yaml
    ├── content-deploy.yaml
    ├── user-service.yaml
    └── content-service.yaml
```

> En la sección Anexos (final) encontrarás el contenido completo de cada archivo listo para copiar/pegar.

---

## 4. Creación del clúster (script)

Archivo: `infra/create-cluster.sh`

```bash
#!/usr/bin/env bash
# usage: ./create-cluster.sh PROJECT_ID CLUSTER_NAME REGION
set -euo pipefail

PROJECT_ID="${1:-my-gcp-project}"
CLUSTER_NAME="${2:-cluster-monitor}"
REGION="${3:-us-central1}"

gcloud config set project "$PROJECT_ID"
gcloud services enable container.googleapis.com compute.googleapis.com monitoring.googleapis.com logging.googleapis.com

echo "Creando clúster GKE (Standard)..."
gcloud container clusters create "$CLUSTER_NAME" \
  --region="$REGION" \
  --machine-type=e2-standard-2 \
  --num-nodes=3 \
  --enable-ip-alias \
  --enable-autoupgrade \
  --enable-autorepair \
  --workload-pool="${PROJECT_ID}.svc.id.goog"

echo "Obteniendo credenciales..."
gcloud container clusters get-credentials "$CLUSTER_NAME" --region="$REGION"

echo "Clúster creado y credenciales configuradas."
kubectl get nodes
```

**Comando para ejecutar:**
```bash
chmod +x infra/create-cluster.sh
./infra/create-cluster.sh my-gcp-project cluster-monitor us-central1
```

---

## 5. Namespaces y manifiestos de los microservicios

### 5.1 Namespace
Archivo: `manifests/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: chapinflix
```

Aplicar:
```bash
kubectl apply -f manifests/namespace.yaml
```

### 5.2 Microservicio `user` (Deployment + Service)
Archivo: `manifests/user-deploy.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-deploy
  namespace: chapinflix
spec:
  replicas: 2
  selector:
    matchLabels:
      app: user
  template:
    metadata:
      labels:
        app: user
    spec:
      containers:
        - name: user
          image: your-registry/user:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 20
```

Archivo: `manifests/user-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: chapinflix
spec:
  selector:
    app: user
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP
```

Aplicar:
```bash
kubectl apply -f manifests/user-deploy.yaml
kubectl apply -f manifests/user-service.yaml
```

### 5.3 Microservicio `content` (Deployment + Service)
Archivo: `manifests/content-deploy.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: content-deploy
  namespace: chapinflix
spec:
  replicas: 2
  selector:
    matchLabels:
      app: content
  template:
    metadata:
      labels:
        app: content
    spec:
      containers:
        - name: content
          image: your-registry/content:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8081
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /
              port: 8081
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8081
            initialDelaySeconds: 10
            periodSeconds: 20
```

Archivo: `manifests/content-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: content-service
  namespace: chapinflix
spec:
  selector:
    app: content
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8081
  type: ClusterIP
```

Aplicar:
```bash
kubectl apply -f manifests/content-deploy.yaml
kubectl apply -f manifests/content-service.yaml
```

---

## 6. Instalación de Prometheus (Helm) y reglas de alerta

### 6.1 Añadir repositorio y crear namespace
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
kubectl create namespace monitoring
```

### 6.2 Instalar kube-prometheus-stack (Prometheus + Alertmanager + Grafana + node-exporter)
```bash
helm install prometheus prometheus-community/kube-prometheus-stack --namespace monitoring
```

Verificar:
```bash
kubectl get pods -n monitoring
kubectl get svc -n monitoring
```

### 6.3 Reglas de alerta
Archivo: `infra/prometheus/alert-rules.yaml`

```yaml
groups:
  - name: ChapinflixAlerts
    rules:
      - alert: CPUAlta
        expr: sum(rate(container_cpu_usage_seconds_total{namespace="chapinflix"}[5m])) by (pod) > 0.8
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Alto uso de CPU en pod {{ $labels.pod }}"
          description: "Uso CPU > 80% durante 2 minutos"
      - alert: MemoriaAlta
        expr: sum(container_memory_usage_bytes{namespace="chapinflix"}) by (pod) / sum(container_spec_memory_limit_bytes{namespace="chapinflix"}) by (pod) > 0.85
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Alto uso de memoria en pod {{ $labels.pod }}"
          description: "Uso de memoria > 85% durante 2 minutos"
      - alert: ReiniciosExcesivos
        expr: increase(kube_pod_container_status_restarts_total{namespace="chapinflix"}[10m]) > 2
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Reinicio excesivo de pod {{ $labels.pod }}"
          description: "Más de 2 reinicios en 10 minutos"
```

Aplicar reglas a Prometheus:
```bash
kubectl create configmap prometheus-chapinflix-rules --from-file=infra/prometheus/alert-rules.yaml -n monitoring || kubectl replace configmap prometheus-chapinflix-rules --from-file=infra/prometheus/alert-rules.yaml -n monitoring
# Para que Prometheus recoja el configmap, depende de la configuración del chart; normalmente se añade como additionalRuleMounts o similar.
# Reiniciar operador para cargar nuevos configmaps (si aplica)
kubectl rollout restart deployment prometheus-kube-prometheus-stack-operator -n monitoring || true
```

> Nota: dependiendo de la versión del chart, la manera de inyectar reglas puede variar. Si usaste `values.yaml` para instalar, coloca el bloque `additionalPrometheusRules` o `prometheus.prometheusSpec.ruleSelector`.

---

## 7. Instalación de Grafana (independiente) y dashboard

### 7.1 Añadir repo y desplegar Grafana
```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set service.type=LoadBalancer \
  --set adminUser=admin \
  --set adminPassword=admin123
```

Obtener IP:
```bash
kubectl get svc -n monitoring
```

### 7.2 Conectar Grafana con Prometheus (UI)
- URL Prometheus interno:
  ```
  http://prometheus-kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090
  ```
- En Grafana: **Configuration → Data Sources → Add → Prometheus** → pegar la URL → Save & Test

### 7.3 Dashboard JSON
Archivo: `infra/grafana/chapinflix-dashboard.json`

```json
{
  "dashboard": {
    "title": "Chapinflix Overview",
    "panels": [
      {
        "type": "timeseries",
        "title": "Uso CPU por Pod",
        "targets": [
          {"expr": "sum(rate(container_cpu_usage_seconds_total{namespace='chapinflix'}[5m])) by (pod)"}
        ]
      },
      {
        "type": "timeseries",
        "title": "Uso Memoria por Pod",
        "targets": [
          {"expr": "sum(container_memory_usage_bytes{namespace='chapinflix'}) by (pod)"}
        ]
      },
      {
        "type": "timeseries",
        "title": "Tráfico de Red RX",
        "targets": [
          {"expr": "sum(rate(container_network_receive_bytes_total{namespace='chapinflix'}[5m])) by (pod)"}
        ]
      }
    ]
  }
}
```

Importar en Grafana: **Dashboards → Import → Upload JSON**.

---

## 8. Instalación del stack ELK (Elasticsearch, Kibana) y Filebeat

> Para la práctica se usa configuración de ejemplo y un único nodo Elasticsearch. En producción se requieren varios nodos y volúmenes persistentes.

### 8.1 Añadir repo Elastic y crear namespace
```bash
helm repo add elastic https://helm.elastic.co
helm repo update
kubectl create namespace elk
```

### 8.2 Instalar Elasticsearch
Archivo de valores: `infra/elk/elasticsearch-values.yaml`

```yaml
replicas: 1
esJavaOpts: "-Xmx512m -Xms512m"
resources:
  requests:
    cpu: "200m"
    memory: "1Gi"
persistence:
  enabled: false
```

Instalación:
```bash
helm install elasticsearch elastic/elasticsearch --namespace elk -f infra/elk/elasticsearch-values.yaml
```

### 8.3 Instalar Kibana
Archivo de valores: `infra/elk/kibana-values.yaml`

```yaml
service:
  type: LoadBalancer
elasticsearchHosts: "http://elasticsearch-master:9200"
```

Instalación:
```bash
helm install kibana elastic/kibana --namespace elk -f infra/elk/kibana-values.yaml
```

Obtener IP:
```bash
kubectl get svc -n elk
```

Acceder a Kibana: `http://<EXTERNAL-IP>:5601`

### 8.4 Instalar Filebeat (DaemonSet)
Archivo de valores: `infra/elk/filebeat-values.yaml`

```yaml
filebeatConfig:
  filebeat.yml: |
    filebeat.autodiscover:
      providers:
        - type: kubernetes
          hints.enabled: true
    processors:
      - add_cloud_metadata: {}
      - add_kubernetes_metadata: {}
    output.elasticsearch:
      hosts: ["http://elasticsearch-master:9200"]
```

Instalación:
```bash
helm install filebeat elastic/filebeat --namespace elk -f infra/elk/filebeat-values.yaml
kubectl get pods -n elk
```

### 8.5 Configurar patrón de índice en Kibana
1. En Kibana → **Stack Management → Index Patterns**
2. Crear patrón `filebeat-*` y seleccionar `@timestamp`.

---

## 9. Conexiones y verificaciones

### 9.1 Verificar servicios
```bash
kubectl get pods -A
kubectl get svc -A
kubectl get nodes
```

### 9.2 Verificar logs en Kibana
- Acceder a Kibana → Discover → seleccionar `filebeat-*` → filtrar por `namespace: "chapinflix"` o `kubernetes.pod.name: "user-deploy-..."`

### 9.3 Verificar métricas en Prometheus
- Acceder al servicio Prometheus (port-forward si no está expuesto):
```bash
kubectl port-forward svc/prometheus-kube-prometheus-stack-prometheus 9090:9090 -n monitoring
# luego abrir http://localhost:9090
```
- Ejecutar una query de ejemplo:
```
sum(rate(container_cpu_usage_seconds_total{namespace="chapinflix"}[5m])) by (pod)
```

### 9.4 Verificar Grafana y dashboards
- Port-forward Grafana (si no tiene LoadBalancer):
```bash
kubectl port-forward svc/grafana 3000:80 -n monitoring
# abrir http://localhost:3000
```
- Importar el JSON del dashboard e inspeccionar paneles.

---

## 10. Pruebas y generación de carga

### 10.1 Usar `kubectl run` para carga básica (cURL loop)
```bash
kubectl run -i --tty load-generator --image=busybox --rm --restart=Never -- /bin/sh -c "while true; do wget -q -O- http://user-service.chapinflix.svc.cluster.local/ ; sleep 0.5; done"
```

### 10.2 Usar `hey` o `wrk` en Cloud Shell (ejemplo con `hey`)
```bash
# Instalar hey en tu máquina local o Cloud Shell
# en Linux:
wget https://hey-release.s3.us-east-2.amazonaws.com/hey-linux-amd64
chmod +x hey-linux-amd64
./hey-linux-amd64 -n 10000 -c 50 http://<grafana-or-service-ip>/
```

Mientras generas carga, observa métricas en Grafana y registros en Kibana.

---

## 11. Entrega y notas finales
- Incluye en el repositorio `Practica8/` todos los archivos `.yaml`, `.json` y `create-cluster.sh`.
- Capturas de pantalla: `kubectl get pods -A`, dashboard Grafana, discover en Kibana, alerta disparada.
- Documenta las decisiones (por qué 1 réplica ES, por qué nodepool separado, etc.)
- Para producción: usar PVCs, múltiples réplicas de Elasticsearch, autenticación en Kibana/Grafana, TLS y reglas de NetworkPolicy.

---

## 12. Anexos: Archivos completos

### infra/create-cluster.sh
(ya incluido arriba)

### manifests/namespace.yaml
(ya incluido arriba)

### manifests/user-deploy.yaml
(ya incluido arriba)

### manifests/user-service.yaml
(ya incluido arriba)

### manifests/content-deploy.yaml
(ya incluido arriba)

### manifests/content-service.yaml
(ya incluido arriba)

### infra/prometheus/alert-rules.yaml
(ya incluido arriba)

### infra/grafana/chapinflix-dashboard.json
(ya incluido arriba)

### infra/elk/elasticsearch-values.yaml
(ya incluido arriba)

### infra/elk/kibana-values.yaml
(ya incluido arriba)

### infra/elk/filebeat-values.yaml
(ya incluido arriba)

---

## Comandos útiles resumen (copiar/pegar)

```bash
# 1. Obtener credenciales
gcloud container clusters get-credentials cluster-monitor --region us-central1

# 2. Crear namespaces
kubectl apply -f manifests/namespace.yaml

# 3. Desplegar microservicios
kubectl apply -f manifests/user-deploy.yaml
kubectl apply -f manifests/user-service.yaml
kubectl apply -f manifests/content-deploy.yaml
kubectl apply -f manifests/content-service.yaml

# 4. Prometheus + Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
kubectl create namespace monitoring
helm install prometheus prometheus-community/kube-prometheus-stack --namespace monitoring
helm install grafana grafana/grafana --namespace monitoring --set service.type=LoadBalancer --set adminUser=admin --set adminPassword=admin123

# 5. ELK + Filebeat
helm repo add elastic https://helm.elastic.co
helm repo update
kubectl create namespace elk
helm install elasticsearch elastic/elasticsearch --namespace elk -f infra/elk/elasticsearch-values.yaml
helm install kibana elastic/kibana --namespace elk -f infra/elk/kibana-values.yaml
helm install filebeat elastic/filebeat --namespace elk -f infra/elk/filebeat-values.yaml

# 6. Aplicar reglas Prometheus
kubectl create configmap prometheus-chapinflix-rules --from-file=infra/prometheus/alert-rules.yaml -n monitoring || kubectl replace configmap prometheus-chapinflix-rules --from-file=infra/prometheus/alert-rules.yaml -n monitoring
kubectl rollout restart deployment prometheus-kube-prometheus-stack-operator -n monitoring || true

# 7. Verificar
kubectl get pods -A
kubectl get svc -A
```

---

### Fin del documento.
