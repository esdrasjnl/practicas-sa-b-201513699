# Práctica 8 — Logging y Monitorización (Manual DevOps — Paso a paso)

## 1. Objetivo

Implementar una solución de métricas, logging y monitorización para un clúster Kubernetes que permita:

- Recolectar métricas de infraestructura y aplicaciones (Prometheus).
- Visualizarlas (Grafana).
- Recolectar logs centralizados (EFK: Elasticsearch + Fluentd + Kibana o ELK con Logstash).
- Definir alertas basadas en reglas y gestionar notificaciones (Alertmanager).
- Tener pipeline CI/CD básico para desplegar los componentes.

---

## 2. Requisitos previos

- Acceso a un clúster Kubernetes (puede ser GKE, EKS, AKS, kops en AWS, kind / k3s para local). Kubernetes 1.20+ recomendado.
- `kubectl` configurado para apuntar al clúster.
- `helm` v3 instalado.
- `git` y una cuenta en un registry de contenedores (Docker Hub, GitHub Container Registry, GCR, etc.).
- Espacio en disco: Elasticsearch necesita memoria y disco (mínimo 2-4GB para pruebas).
- Opcional: acceso a Slack o correo para notificaciones.

Comandos de verificación:

```bash
kubectl version --short
helm version
kubectl get nodes
```

---

## 3. Arquitectura propuesta (resumen)

1. **Prometheus**: instalación mediante `kube-prometheus-stack` (Prometheus Operator, ServiceMonitors, Alertmanager).
2. **Grafana**: incluida en el stack, con dashboards importables.
3. **EFK**: **Elasticsearch** (estado), **Fluentd** (DaemonSet para recolectar logs del nodo) y **Kibana** (visualización). Alternativa: Logstash si quieres más transformación.
4. **Instrumentación**: aplicaciones expuestas con `/metrics` (Prometheus client libraries) y logs a stdout/stderr.
5. **Alertmanager**: recibe las alertas y las envía a Slack/Email.
6. **CI/CD**: GitHub Actions build -> push image -> kubectl apply (manifests o Helm upgrade).

---

## 4. Paso 0 — Decisiones y parámetros

Variables que usarás (ejemplo):

```bash
NAMESPACE=monitoring
ELASTIC_NAMESPACE=logging
REGISTRY=ghcr.io/tu-usuario
IMAGE_TAG=v1.0.0
GRAFANA_ADMIN_PASS="GrafanaP@ssw0rd"
```

Crea los namespaces:

```bash
kubectl create namespace $NAMESPACE
kubectl create namespace $ELASTIC_NAMESPACE
```

---

## 5. Paso 1 — Desplegar Prometheus + Grafana (kube-prometheus-stack)

### 5.1 Añadir repositorio Helm

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

### 5.2 Valores básicos para `kube-prometheus-stack`

Crea `prometheus-values.yaml` (ejemplo básico):

```yaml
# prometheus-values.yaml
prometheus:
  prometheusSpec:
    resources:
      requests:
        cpu: 200m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 2Gi

alertmanager:
  enabled: true

grafana:
  enabled: true
  adminPassword: "GrafanaP@ssw0rd"
  persistence:
    enabled: false

kubeStateMetrics:
  enabled: true
nodeExporter:
  enabled: true

# opcional: persistance para prometheus
# prometheus:
#   prometheusSpec:
#     storageSpec:
#       volumeClaimTemplate:
#         spec:
#           accessModes: [ "ReadWriteOnce" ]
#           resources:
#             requests:
#               storage: 20Gi
```

### 5.3 Instalar

```bash
helm install prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace $NAMESPACE -f prometheus-values.yaml
```

### 5.4 Verificación

```bash
kubectl get pods -n $NAMESPACE
# Port-forward Grafana
kubectl port-forward svc/prometheus-stack-grafana -n $NAMESPACE 3000:80
# Accede a http://localhost:3000 (admin / GrafanaP@ssw0rd)
```

---

## 6. Paso 2 — Desplegar EFK (Elasticsearch + Fluentd + Kibana)

**Opción A — Usar Elastic Helm charts (Elasticsearch + Kibana)**

### 6.1 Añadir repositorio Elastic

```bash
helm repo add elastic https://helm.elastic.co
helm repo update
```

### 6.2 Valores mínimos para Elasticsearch (archivo `elasticsearch-values.yaml`)

> **IMPORTANTE**: Elasticsearch requiere recursos y tolerancias de disco. Para entorno de laboratorio usar 1 nodo con `minimum_master_nodes=1`.

```yaml
replicas: 1
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 1000m
    memory: 2Gi
volumeClaimTemplate:
  accessModes: [ "ReadWriteOnce" ]
  resources:
    requests:
      storage: 10Gi
```

### 6.3 Instalar Elasticsearch y Kibana

```bash
helm install elasticsearch elastic/elasticsearch -n $ELASTIC_NAMESPACE -f elasticsearch-values.yaml
helm install kibana elastic/kibana -n $ELASTIC_NAMESPACE
```

### 6.4 Fluentd (DaemonSet) — recolectar logs

Crea `fluentd-daemonset.yaml` (snippet):

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: fluentd
  namespace: logging
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: logging
  labels:
    k8s-app: fluentd-logging
spec:
  selector:
    matchLabels:
      name: fluentd
  template:
    metadata:
      labels:
        name: fluentd
    spec:
      serviceAccountName: fluentd
      tolerations:
      - key: node-role.kubernetes.io/master
        operator: Exists
        effect: NoSchedule
      containers:
      - name: fluentd
        image: fluent/fluentd:v1.14-1
        env:
        - name: FLUENT_ELASTICSEARCH_HOST
          value: "elasticsearch-master.logging.svc.cluster.local"
        - name: FLUENT_ELASTICSEARCH_PORT
          value: "9200"
        resources:
          limits:
            memory: 200Mi
          requests:
            cpu: 100m
            memory: 100Mi
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

Ajusta la imagen y pipeline de Fluentd (o usa Fluent Bit si prefieres menor consumo).

### 6.5 Verificación Kibana

```bash
kubectl port-forward svc/kibana-kb -n $ELASTIC_NAMESPACE 5601:5601
# Accede a http://localhost:5601
```

---

## 7. Paso 3 — Instrumentación de aplicaciones

### 7.1 Logs: estandarizar salida

Asegúrate que tus aplicaciones (Go, Python, Node, Java, .NET) impriman logs estructurados (JSON) a stdout/stderr. Ejemplo NodeJS:

```js
console.log(JSON.stringify({ level: 'info', msg: 'starting', ts: new Date().toISOString() }));
```

Fluentd los parseará y enviará a Elasticsearch.

### 7.2 Métricas: exponer /metrics

- **Go**: usar `promhttp` del paquete `prometheus/client_golang`.
- **Python**: usar `prometheus_client` y `start_http_server(8000)`.
- **Node**: `prom-client` y `/metrics` endpoint.

Ejemplo Python (Flask):

```python
from prometheus_client import Counter, generate_latest
REQUESTS = Counter('app_requests_total', 'Total requests')

@app.route('/metrics')
def metrics():
    return generate_latest()

@app.route('/')
def root():
    REQUESTS.inc()
    return 'hello'
```

### 7.3 Añadir anotaciones a Deployments

Para que Prometheus descubra el servicio, añade anotaciones al `Service` o `Pod`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 2
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
```

O bien crea un `ServiceMonitor` (recomendado con operator).

---

## 8. Paso 4 — Crear ServiceMonitor y PrometheusRule

### 8.1 ServiceMonitor ejemplo (`service-monitor.yaml`)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: myapp-servicemonitor
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  selector:
    matchLabels:
      app: myapp
  endpoints:
  - port: http-metrics
    path: /metrics
    interval: 30s
```

### 8.2 Regla de alerta ejemplo (`prometheusrule.yaml`)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: node-rules
  namespace: monitoring
spec:
  groups:
  - name: cpu-saturation
    rules:
    - alert: HighCPU
      expr: sum(rate(node_cpu_seconds_total{mode!="idle"}[5m])) by (instance) / sum(node:node_num_cpu:sum) by (instance) > 0.8
      for: 5m
      labels:
        severity: critical
      annotations:
        description: "CPU usage is >80% for more than 5 minutes on {{ $labels.instance }}"
```

Aplica:

```bash
kubectl apply -f service-monitor.yaml
kubectl apply -f prometheusrule.yaml
```

---

## 9. Paso 5 — Configurar Alertmanager (Slack + Email)

### 9.1 Secret con webhook de Slack (ejemplo)

```bash
kubectl create secret generic slack-webhook -n monitoring --from-literal=slack_url='https://hooks.slack.com/services/XXXX/XXXX/XXXX'
```

### 9.2 ConfigMap para Alertmanager (`alertmanager-config.yaml`)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      resolve_timeout: 5m
    route:
      receiver: 'slack-notifications'
    receivers:
    - name: 'slack-notifications'
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/XXXX/XXXX/XXXX'
        channel: '#ops'
```

Aplica el configmap y recarga Alertmanager (si usas helm, puedes actualizar `alertmanager` values).

---

## 10. Paso 6 — Dashboards

- Importa dashboards de la comunidad (Grafana). Usa la UI de Grafana -> Import -> pega JSON.
- Crea dashboards personalizados con variables (namespace, deployment, pod).

Ejemplo mínimo de dashboard JSON (muy acotado):

```json
{
  "annotations": {"list": []},
  "panels": [{
    "type": "graph",
    "title": "CPU Usage",
    "targets": [{"expr": "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)", "refId": "A"}]
  }],
  "schemaVersion": 16,
  "title": "Mi Dashboard"
}
```

Guarda esto como `grafana-dashboard.json` y súbelo.

---

## 11. Paso 7 — CI/CD (GitHub Actions) — pipeline básico

Crea `.github/workflows/deploy.yml` con algo similar:

```yaml
name: CI/CD Build and Deploy
on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    - name: Login to registry
      uses: docker/login-action@v2
      with:
        registry: ghcr.io
        username: ${{ github.repository_owner }}
        password: ${{ secrets.GITHUB_TOKEN }}
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        push: true
        tags: ${{ env.REGISTRY }}/${{ github.repository }}:latest
    - name: Deploy to cluster
      uses: azure/k8s-deploy@v4
      with:
        namespace: monitoring
        manifests: |
          k8s/manifests/*.yaml
        kubeconfig: ${{ secrets.KUBECONFIG_BASE64 }}
```

Ajusta `REGISTRY` y secretos.

---

## 12. Paso 8 — Manifests ejemplos (Deployment con métricas)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
    spec:
      containers:
      - name: myapp
        image: ghcr.io/tu-usuario/myapp:latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 8081
          name: http-metrics
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
```

---

## 13. Paso 9 — Verificaciones y comandos útiles

- Ver pods:
  ```bash
  kubectl get pods -n monitoring
  kubectl get pods -n logging
  ```
- Ver targets Prometheus:
  ```bash
  kubectl port-forward svc/prometheus-stack-prometheus -n monitoring 9090:9090
  # abrir http://localhost:9090/targets
  ```
- Ver reglas:
  ```bash
  # http://localhost:9090/rules
  ```
- Consultas PromQL ejemplo:
  ```promql
  rate(http_requests_total[5m])
  ```

---

## 14. Troubleshooting (ejemplos rápidos)

- **Elasticsearch CrashLoop**: revisa `PersistentVolumeClaims`, espacio en disco y `vm.max_map_count` (necesario en nodos: `sysctl -w vm.max_map_count=262144`).
- **Prometheus no descubre Pods**: revisa anotaciones o ServiceMonitor selector (labels deben coincidir).
- **Kibana no muestra índices**: revisa que Fluentd esté enviando datos y que el índice existe en ES (`_cat/indices?v`).

---

## 15. Checklist de entrega (rúbrica)

1. Prometheus + Grafana desplegados y accesibles.
2. Reglas de alertas creadas y probadas (sintetiza una alerta de prueba).
3. Elasticsearch + Kibana desplegados y logs visibles.
4. Aplicación instrumentada con `/metrics` y logs estructurados.
5. ServiceMonitor y PrometheusRule aplicados.
6. Dashboard en Grafana (JSON incluido) y captura de pantalla.
7. Pipeline CI/CD funcional (archivo `.yml` en repo).
8. Documentación en Markdown (este manual) incluida en el repo.

---

## 16. Archivos que incluí (para descarga/uso)

- `prometheus-values.yaml` — valores para Helm.
- `elasticsearch-values.yaml` — valores mínimos para ES.
- `fluentd-daemonset.yaml` — DaemonSet para Fluentd.
- `service-monitor.yaml` — ejemplo de ServiceMonitor.
- `prometheusrule.yaml` — ejemplo de regla de alerta.
- `grafana-dashboard.json` — JSON mínimo de dashboard.
- `.github/workflows/deploy.yml` — pipeline de ejemplo.

> Estos archivos están listos para copiar/pegar desde el manual y poner en tu repo.

---

## 17. Entregables sugeridos

- Repositorio con carpeta `manifests/` que contenga los YAML.
- Carpeta `docs/` con este `README.md` y capturas (Grafana, Kibana, Prometheus targets).
- Archivo `exported_dashboards/` con JSON importable.
- Video corto (2-5 minutos) mostrando dashboard y alertas funcionando (opcional pero recomendable).

---

## 18. ¿Qué más puedo generar ahora?

Puedo inmediatamente (en este turno):

- Extraer y crear los archivos individuales (`prometheus-values.yaml`, `fluentd-daemonset.yaml`, etc.) como descargas separadas en el espacio de trabajo. 
- Exportar este markdown a PDF y darte el enlace de descarga.

Dime cuál de las dos quieres ahora: **archivos individuales**, **PDF**, o **ambos** y lo genero en este mismo turno.

---

### Fin del manual — resumen corto

Has recibido una guía paso a paso para desplegar Prometheus/Grafana y EFK, instrumentar aplicaciones, configurar alertas y crear un pipeline CI/CD mínimo. Los YAML y snippets están listos para usar: copia, adapta variables y aplica.

¡Vamos a generar los archivos y el PDF si quieres ahora!

