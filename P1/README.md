# Práctica 1 - Software Avanzado

## Objetivo
Desarrollar un sistema de inventario con buenas prácticas de código y principios SOLID.

## Principios SOLID aplicados

### 1. Single Responsibility Principle (SRP)
Cada clase tiene una responsabilidad única:
- `Producto`: modela un producto.
- `Inventario`: gestiona la lista de productos.

### 2. Open/Closed Principle (OCP)
Podemos extender `Inventario` con más métodos sin modificar su código.

### 3. Liskov Substitution Principle (LSP)
Si tuviéramos una subclase de `Producto` (ej. `ProductoPerecedero`), podríamos usarla sin alterar el comportamiento esperado.

### 4. Interface Segregation Principle (ISP)
No forzamos a las clases a implementar funciones que no usan (dividimos responsabilidades entre módulos).

### 5. Dependency Inversion Principle (DIP)
`main.py` depende de abstracciones (`Inventario`, `Producto`), no implementaciones directas.

## Uso

1. Ejecuta el archivo `main.py` con Python 3.
2. Seleccionar opción en el menú interactivo para gestionar productos.

## Ejemplo de uso

```
Agregar producto

Nombre: Laptop

Cantidad: 5

Precio: 8500

Producto agregado.
```

## Requisitos cumplidos

- [x] Agregar producto
- [x] Eliminar producto
- [x] Listar productos
- [x] Ordenar por precio/cantidad
- [x] Buscar por nombre
- [x] Código limpio y modular
- [x] Aplicación de principios SOLID