from flask import Flask
from prometheus_client import Counter, generate_latest
import logging, json, sys

app = Flask(__name__)

# Métricas Prometheus
REQUESTS = Counter('app_requests_total', 'Número total de peticiones')

# Configuración de logging JSON
logger = logging.getLogger("app")
handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter(json.dumps({
    "level": "%(levelname)s",
    "message": "%(message)s",
    "timestamp": "%(asctime)s"
}))
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

@app.route('/')
def home():
    REQUESTS.inc()
    logger.info("Petición recibida en /")
    return "Aplicación en ejecución"

@app.route('/metrics')
def metrics():
    return generate_latest()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
