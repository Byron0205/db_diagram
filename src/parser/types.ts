// Tipos base del modelo de esquema SQL

export interface ColumnRef {
  table: string;
  column: string;
}

export interface Column {
  name: string;
  type: string;        // ej: "VARCHAR(255)", "INT", "DATETIME"
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  references?: ColumnRef;
}

export interface ForeignKey {
  columns: string[];
  refTable: string;
  refColumns: string[];
}

export interface Table {
  name: string;
  columns: Column[];
  primaryKey: string[];   // nombres de las columnas PK (puede ser compuesta)
  foreignKeys: ForeignKey[];
}

export interface ParseResult {
  tables: Table[];
  errors: string[];
}
