from flask import Flask, jsonify, request
import mysql.connector
import os

app = Flask(__name__)

# Configuración de conexión usando root
db_config = {
    'host': os.getenv('DB_HOST', 'mysql-db'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME')
}

# Ruta para listar productos
@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM products")
        products = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(products)
    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 500

# Ruta para agregar un producto
@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.json
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO products (name, price) VALUES (%s,%s)",
            (data['name'], data['price'])
        )
        conn.commit()
        product_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return jsonify({'id': product_id, 'name': data['name'], 'price': data['price']})
    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=4000)
