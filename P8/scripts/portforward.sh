#!/bin/bash
echo "🌐 Accediendo a interfaces..."
kubectl port-forward svc/prometheus-stack-grafana -n monitoring 3000:80 &
kubectl port-forward svc/kibana-kb -n logging 5601:5601 &
kubectl port-forward svc/prometheus-stack-prometheus -n monitoring 9090:9090 &
