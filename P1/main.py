# main.py

from models.producto import Producto
from services.inventario import Inventario
from utils.menu import mostrar_menu, pedir_dato


def ejecutar():
    inventario = Inventario()
    opcion = -1

    while opcion != 0:
        mostrar_menu()
        opcion = pedir_dato("Selecciona una opción: ", int)

        if opcion == 1:
            nombre = input("Nombre del producto: ")
            cantidad = pedir_dato("Cantidad: ", int)
            precio = pedir_dato("Precio (Q): ", float)
            producto = Producto(nombre, cantidad, precio)
            inventario.agregar_producto(producto)
            print("Producto agregado.")

        elif opcion == 2:
            nombre = input("Nombre del producto a eliminar: ")
            if inventario.eliminar_producto(nombre):
                print("Producto eliminado.")
            else:
                print("Producto no encontrado.")

        elif opcion == 3:
            print("\nLista de productos:")
            for p in inventario.listar_productos():
                print(p)

        elif opcion == 4:
            print("\nProductos ordenados por precio:")
            for p in inventario.ordenar_por_precio():
                print(p)

        elif opcion == 5:
            print("\nProductos ordenados por cantidad:")
            for p in inventario.ordenar_por_cantidad():
                print(p)

        elif opcion == 6:
            nombre = input("Nombre del producto a buscar: ")
            producto = inventario.buscar_por_nombre(nombre)
            if producto:
                print("Producto encontrado:")
                print(producto)
            else:
                print("Producto no encontrado.")

        elif opcion == 0:
            print("Saliendo del sistema...")
        else:
            print("Opción no válida.")

if __name__ == "__main__":
    ejecutar()
