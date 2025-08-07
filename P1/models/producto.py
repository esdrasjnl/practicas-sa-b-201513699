# models/producto.py

class Producto:
    """
    Representa un producto dentro del inventario.
    """

    def __init__(self, nombre: str, cantidad: int, precio: float):
        self.nombre = nombre
        self.cantidad = cantidad
        self.precio = precio

    def __str__(self):
        return f"{self.nombre} | Cantidad: {self.cantidad} | Precio: Q{self.precio:.2f}"
