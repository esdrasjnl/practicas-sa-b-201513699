#!/bin/bash
echo "🩺 Estado Prometheus y Fluentd"
kubectl get pods -n monitoring
kubectl get pods -n logging
kubectl get svc -A | grep grafana
