# services/inventario.py

from models.producto import Producto


class Inventario:
    """
    Gestiona la colección de productos en memoria.
    """

    def __init__(self):
        self.productos = []

    def agregar_producto(self, producto: Producto):
        self.productos.append(producto)

    def eliminar_producto(self, nombre: str):
        for p in self.productos:
            if p.nombre.lower() == nombre.lower():
                self.productos.remove(p)
                return True
        return False

    def listar_productos(self):
        return self.productos

    def ordenar_por_precio(self):
        return sorted(self.productos, key=lambda p: p.precio)

    def ordenar_por_cantidad(self):
        return sorted(self.productos, key=lambda p: p.cantidad)

    def buscar_por_nombre(self, nombre: str):
        for p in self.productos:
            if p.nombre.lower() == nombre.lower():
                return p
        return None
