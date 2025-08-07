# utils/menu.py

def mostrar_menu():
    print("\n ----- SISTEMA DE INVENTARIO -----")
    print("1. Agregar producto")
    print("2. Eliminar producto")
    print("3. Listar productos")
    print("4. Ordenar por precio")
    print("5. Ordenar por cantidad")
    print("6. Buscar producto por nombre")
    print("0. Salir")

def pedir_dato(mensaje, tipo=str):
    while True:
        try:
            entrada = input(mensaje)
            return tipo(entrada)
        except ValueError:
            print("Dato inválido, intenta de nuevo.")
