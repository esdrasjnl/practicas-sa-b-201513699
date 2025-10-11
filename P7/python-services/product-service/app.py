from flask import Flask, jsonify, request
import pymysql, os
app = Flask(__name__)
def conn(): return pymysql.connect(host=os.getenv('DB_HOST','mysql'),
                                  user=os.getenv('DB_USER','root'),
                                  password=os.getenv('DB_PASSWORD','rootpass'),
                                  db=os.getenv('DB_NAME','appdb'),
                                  cursorclass=pymysql.cursors.DictCursor)
@app.route('/api/products', methods=['GET'])
def listp():
    c=conn(); cur=c.cursor(); cur.execute("SELECT id,name,price,stock FROM products"); r=cur.fetchall(); c.close(); return jsonify(r)
@app.route('/api/products', methods=['POST'])
def addp():
    data=request.json; c=conn(); cur=c.cursor(); cur.execute("INSERT INTO products (name,price,stock) VALUES (%s,%s,%s)",(data['name'],data['price'],data.get('stock',0))); c.commit(); pid=cur.lastrowid; c.close(); return jsonify({'id':pid}),201
if __name__=='__main__': app.run(host='0.0.0.0',port=4100)