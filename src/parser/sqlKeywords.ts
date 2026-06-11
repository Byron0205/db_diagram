// Palabras reservadas SQL genéricas (sin motor específico)
export const SQL_KEYWORDS = [
  'ADD', 'ALL', 'ALTER', 'AND', 'AS', 'ASC',
  'AUTO_INCREMENT',
  'BETWEEN', 'BY',
  'CASE', 'CHECK', 'COLUMN', 'CONSTRAINT', 'CREATE', 'CROSS',
  'DATABASE', 'DEFAULT', 'DELETE', 'DESC', 'DISTINCT', 'DROP',
  'ELSE', 'END', 'EXISTS',
  'FALSE', 'FOREIGN', 'FROM', 'FULL',
  'GROUP',
  'HAVING',
  'IDENTITY', 'IF', 'IN', 'INDEX', 'INNER', 'INSERT', 'INTO', 'IS',
  'JOIN',
  'KEY',
  'LEFT', 'LIKE', 'LIMIT',
  'NOT', 'NULL',
  'OFFSET', 'ON', 'OR', 'ORDER', 'OUTER',
  'PRIMARY',
  'REFERENCES', 'RIGHT',
  'SELECT', 'SET',
  'TABLE', 'THEN', 'TOP', 'TRUE', 'TRUNCATE',
  'UNION', 'UNIQUE', 'UPDATE',
  'VALUES', 'VIEW',
  'WHEN', 'WHERE', 'WITH',
];

// Tipos de datos base (genéricos, sin dialecto específico)
export const SQL_TYPES = [
  // Numéricos
  'BIGINT', 'BIT', 'BOOL', 'BOOLEAN',
  'DECIMAL', 'DOUBLE',
  'FLOAT',
  'INT', 'INT2', 'INT4', 'INT8', 'INTEGER',
  'MEDIUMINT',
  'MONEY',
  'NUMERIC',
  'REAL',
  'SMALLINT', 'SMALLMONEY',
  'TINYINT',
  // Texto
  'CHAR', 'CHARACTER', 'CLOB',
  'LONGTEXT', 'MEDIUMTEXT',
  'NCHAR', 'NTEXT', 'NVARCHAR',
  'TEXT',
  'VARCHAR', 'VARCHAR2', 'VARYING',
  // Fecha y hora
  'DATE', 'DATETIME', 'DATETIME2',
  'SMALLDATETIME',
  'TIME', 'TIMESTAMP',
  'YEAR',
  // Binario / otros
  'BINARY', 'BLOB', 'BYTEA',
  'IMAGE',
  'JSON', 'JSONB',
  'LONGBLOB', 'LONGVARBINARY',
  'UNIQUEIDENTIFIER', 'UUID',
  'VARBINARY', 'XML',
];

// Todos los tokens que CodeMirror debe destacar como palabras clave
export const ALL_KEYWORDS = [...SQL_KEYWORDS, ...SQL_TYPES];
