// Esquema de ejemplo precargado la primera vez (sin motor definido)
export const EXAMPLE_SCHEMA = `-- Clientes registrados en el sistema.
-- Un cliente puede tener múltiples órdenes y direcciones.
CREATE TABLE customers (
  id          INT          NOT NULL PRIMARY KEY, -- identificador surrogate
  name        VARCHAR(120) NOT NULL,             -- nombre completo
  email       VARCHAR(255) NOT NULL UNIQUE,      -- login principal
  phone       VARCHAR(20),
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Jerarquía de categorías de productos (auto-referenciada).
CREATE TABLE categories (
  id          INT         NOT NULL PRIMARY KEY,
  name        VARCHAR(80) NOT NULL,
  parent_id   INT,                               -- null = categoría raíz
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- Catálogo de productos disponibles para la venta.
CREATE TABLE products (
  id           INT            NOT NULL PRIMARY KEY,
  name         VARCHAR(200)   NOT NULL,
  description  TEXT,
  price        DECIMAL(10,2)  NOT NULL,
  stock        INT            NOT NULL DEFAULT 0,
  category_id  INT,
  created_at   DATETIME       NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Pedido realizado por un cliente.
CREATE TABLE orders (
  id           INT         NOT NULL PRIMARY KEY,
  customer_id  INT         NOT NULL,
  status       VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending | paid | shipped | cancelled
  total        DECIMAL(12,2),
  created_at   DATETIME    NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Líneas de detalle de un pedido.
CREATE TABLE order_items (
  id          INT           NOT NULL PRIMARY KEY,
  order_id    INT           NOT NULL,
  product_id  INT           NOT NULL,
  quantity    INT           NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL, -- precio al momento de la compra
  FOREIGN KEY (order_id)   REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Direcciones de envío asociadas a un cliente.
CREATE TABLE addresses (
  id          INT          NOT NULL PRIMARY KEY,
  customer_id INT          NOT NULL,
  street      VARCHAR(200),
  city        VARCHAR(100),
  country     VARCHAR(60),
  is_default  BIT          NOT NULL DEFAULT 0, -- 1 = dirección principal
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
`;
