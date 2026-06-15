/**
 * Prompt reutilizable para pedirle a Claude un esquema SQL compatible
 * con el parser del diagramador.
 *
 * Instrucciones de uso:
 *  1. Copia el texto de CLAUDE_PROMPT.
 *  2. Pégalo al inicio (o al final) de tu mensaje en Claude.
 *  3. Describe el sistema o dominio que quieres modelar.
 *  4. Pega la respuesta completa en el diagramador → botón "Importar".
 */
export const CLAUDE_PROMPT = `Por favor, responde con un único bloque de código SQL (cercado con \`\`\`sql) que contenga las sentencias CREATE TABLE del esquema. Sigue estas reglas para que el resultado sea compatible con mi diagramador:

1. **SQL genérico** — sin sintaxis de motor específico. Usa tipos estándar: INT, BIGINT, VARCHAR(n), CHAR(n), TEXT, DECIMAL(p,s), FLOAT, DATETIME, DATE, BIT, BOOLEAN, UUID, BLOB, JSON.
2. **Llaves primarias** — inline con PRIMARY KEY en la columna o a nivel de tabla: PRIMARY KEY (col1, col2).
3. **Llaves foráneas** — inline con REFERENCES tabla(col) o a nivel de tabla: FOREIGN KEY (col) REFERENCES tabla(col). Puedes añadir ON DELETE CASCADE / ON UPDATE CASCADE sin problema.
4. **Modificadores** — NOT NULL, UNIQUE, DEFAULT valor son bienvenidos.
5. **Documentación con comentarios** — usa comentarios SQL -- para documentar:
   - Justo antes de CREATE TABLE → aparece como descripción de la tabla en el diagrama.
   - Al final de una línea de columna → aparece al pasar el cursor sobre esa columna.
6. **Un solo bloque \`\`\`sql** — incluye todas las tablas en un único bloque. No separes en varios bloques.
7. No uses sintaxis de auto-incremento específica de motor (usa solo el tipo, sin SERIAL/AUTO_INCREMENT/IDENTITY si no es necesario).

Ejemplo del formato esperado:

\`\`\`sql
-- Clientes registrados en la plataforma.
CREATE TABLE customers (
  id         INT          NOT NULL PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,             -- nombre completo
  email      VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME     NOT NULL
);

-- Pedidos realizados por los clientes.
CREATE TABLE orders (
  id          INT          NOT NULL PRIMARY KEY,
  customer_id INT          NOT NULL,
  status      VARCHAR(30)  NOT NULL DEFAULT 'pending', -- pending | paid | shipped
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
\`\`\``;
