#!/bin/bash
set -e
echo "🚀 Desplegando Prometheus y EFK..."
kubectl apply -f manifests/namespace.yaml
helm install prometheus-stack prometheus-community/kube-prometheus-stack -n monitoring -f manifests/prometheus-values.yaml
helm install elasticsearch elastic/elasticsearch -n logging -f manifests/elasticsearch-values.yaml
helm install kibana elastic/kibana -n logging
kubectl apply -f manifests/fluentd-daemonset.yaml
echo "✅ Despliegue completado."
