USE p9db;

-- Users including Guatemala
INSERT INTO users (name, email, country) VALUES
('Carlos Perez','carlos.perez@example.com','Guatemala'),
('Ana Lopez','ana.lopez@example.com','Guatemala'),
('John Doe','john.doe@example.com','USA'),
('María González','maria.g@example.com','Guatemala');

-- Products
INSERT INTO products (name, description, price, stock) VALUES
('Cafetera X100','Cafetera automática 1.5L',59.90,10),
('Auriculares Pro','Auriculares inalámbricos',89.50,20),
('Laptop Student','Laptop 8GB RAM, 256GB SSD',399.99,5);

-- Purchases: some users in Guatemala buy products
INSERT INTO purchases (user_id, product_id, quantity) VALUES
(1, 1, 1),
(1, 2, 2),
(2, 3, 1),
(4, 2, 1);
