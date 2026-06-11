/**
 * Parser de CREATE TABLE genérico.
 * Tolerante a errores: las tablas con sintaxis incorrecta se omiten
 * y se acumulan en `errors`, pero el resto sigue parseándose.
 *
 * Soporta:
 *  - CREATE TABLE nombre (...)  /  CREATE TABLE IF NOT EXISTS nombre (...)
 *  - Nombres con o sin comillas: `nombre`, "nombre", [nombre], nombre
 *  - Esquemas: dbo.Tabla, public.tabla
 *  - Tipo con argumentos: VARCHAR(255), DECIMAL(10,2)
 *  - PK inline: id INT PRIMARY KEY
 *  - PK a nivel de tabla: PRIMARY KEY (col1, col2)
 *  - FK inline: user_id INT REFERENCES users(id)
 *  - FK a nivel de tabla: [CONSTRAINT name] FOREIGN KEY (col) REFERENCES tbl(col)
 *  - Cláusulas ignoradas sin romper: NOT NULL, UNIQUE, DEFAULT ...,
 *    AUTO_INCREMENT, IDENTITY(...), ON DELETE/UPDATE ...
 */

import type { Column, ForeignKey, ParseResult, Table } from './types';

// ─── Tokenizador ─────────────────────────────────────────────────────────────

type TokenKind =
  | 'IDENT'    // identificador o keyword
  | 'STRING'   // 'literal'
  | 'COMMENT'  // -- texto de comentario de línea
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'SEMICOLON'
  | 'DOT'
  | 'EOF';

interface Token {
  kind: TokenKind;
  value: string;
}

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < sql.length) {
    // Comentario de línea → emitir como token COMMENT
    if (sql[i] === '-' && sql[i + 1] === '-') {
      i += 2;
      let text = '';
      while (i < sql.length && sql[i] !== '\n') text += sql[i++];
      const trimmed = text.trim();
      if (trimmed) tokens.push({ kind: 'COMMENT', value: trimmed });
      continue;
    }
    // Comentario de bloque
    if (sql[i] === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    // Espacios
    if (/\s/.test(sql[i])) { i++; continue; }

    // Strings con comilla simple
    if (sql[i] === "'") {
      let val = '';
      i++;
      while (i < sql.length && sql[i] !== "'") {
        if (sql[i] === '\\') i++; // escape simple
        val += sql[i++];
      }
      i++; // closing '
      tokens.push({ kind: 'STRING', value: val });
      continue;
    }

    // Identificadores entre backticks, comillas dobles o corchetes
    if (sql[i] === '`' || sql[i] === '"' || sql[i] === '[') {
      const close = sql[i] === '[' ? ']' : sql[i];
      i++;
      let val = '';
      while (i < sql.length && sql[i] !== close) val += sql[i++];
      i++; // closing char
      tokens.push({ kind: 'IDENT', value: val });
      continue;
    }

    // Símbolos de un carácter
    if (sql[i] === '(') { tokens.push({ kind: 'LPAREN', value: '(' }); i++; continue; }
    if (sql[i] === ')') { tokens.push({ kind: 'RPAREN', value: ')' }); i++; continue; }
    if (sql[i] === ',') { tokens.push({ kind: 'COMMA', value: ',' }); i++; continue; }
    if (sql[i] === ';') { tokens.push({ kind: 'SEMICOLON', value: ';' }); i++; continue; }
    if (sql[i] === '.') { tokens.push({ kind: 'DOT', value: '.' }); i++; continue; }

    // Identificadores / keywords
    if (/[a-zA-Z_#@$]/.test(sql[i])) {
      let val = '';
      while (i < sql.length && /[\w$#@]/.test(sql[i])) val += sql[i++];
      tokens.push({ kind: 'IDENT', value: val });
      continue;
    }

    // Cualquier otro carácter (operadores, números en defaults…) lo ignoramos
    i++;
  }

  tokens.push({ kind: 'EOF', value: '' });
  return tokens;
}

// ─── Cursor sobre tokens ────────────────────────────────────────────────────

class Cursor {
  private pos = 0;
  private tokens: Token[];
  constructor(tokens: Token[]) { this.tokens = tokens; }

  peek(offset = 0): Token {
    const idx = this.pos + offset;
    return idx < this.tokens.length
      ? this.tokens[idx]
      : { kind: 'EOF', value: '' };
  }

  consume(): Token {
    return this.tokens[this.pos++] ?? { kind: 'EOF', value: '' };
  }

  consumeIf(kind: TokenKind, valueUpper?: string): boolean {
    const t = this.peek();
    if (t.kind === kind && (valueUpper === undefined || t.value.toUpperCase() === valueUpper)) {
      this.pos++;
      return true;
    }
    return false;
  }

  /** Avanza hasta el siguiente CREATE (o EOF) para recuperarse de errores */
  skipToNextCreate(): void {
    while (
      this.peek().kind !== 'EOF' &&
      !(this.peek().kind === 'IDENT' && this.peek().value.toUpperCase() === 'CREATE')
    ) {
      this.pos++;
    }
  }

  get done(): boolean {
    return this.peek().kind === 'EOF';
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Lee un nombre de columna/tabla (sin comillas, ya normalizado por el tokenizer) */
function readIdent(cur: Cursor): string | null {
  const t = cur.peek();
  if (t.kind === 'IDENT') { cur.consume(); return t.value; }
  return null;
}

/** Lee nombre opcionalmente calificado: [esquema.]nombre */
function readQualifiedName(cur: Cursor): string | null {
  const first = readIdent(cur);
  if (!first) return null;
  if (cur.peek().kind === 'DOT') {
    cur.consume(); // consume el punto
    const second = readIdent(cur);
    if (second) return second; // usamos solo el nombre de tabla, no el esquema
  }
  return first;
}

/** Lee el tipo de dato y sus argumentos: INT, VARCHAR(255), DECIMAL(10,2) */
function readType(cur: Cursor): string {
  const base = readIdent(cur) ?? '?';
  if (cur.peek().kind === 'LPAREN') {
    let args = '(';
    cur.consume(); // LPAREN
    let depth = 1;
    while (!cur.done && depth > 0) {
      const t = cur.consume();
      if (t.kind === 'LPAREN') { depth++; args += '('; }
      else if (t.kind === 'RPAREN') { depth--; if (depth > 0) args += ')'; }
      else args += t.value;
    }
    return `${base}${args})`;
  }
  return base;
}

/**
 * Salta una expresión DEFAULT hasta la siguiente coma, RPAREN o keyword conocida.
 * Maneja paréntesis anidados.
 */
function skipDefaultValue(cur: Cursor): void {
  let depth = 0;
  while (!cur.done) {
    const t = cur.peek();
    if (t.kind === 'LPAREN') { depth++; cur.consume(); continue; }
    if (t.kind === 'RPAREN') {
      if (depth === 0) break;
      depth--; cur.consume(); continue;
    }
    if (t.kind === 'COMMA' && depth === 0) break;
    // Detenerse en keywords que marcan la siguiente constraint
    if (t.kind === 'IDENT' && depth === 0) {
      const kw = t.value.toUpperCase();
      if (['NOT', 'NULL', 'UNIQUE', 'PRIMARY', 'FOREIGN', 'CHECK', 'REFERENCES', 'CONSTRAINT'].includes(kw)) break;
    }
    cur.consume();
  }
}

/** Salta los tokens de ON DELETE/UPDATE ... (CASCADE, SET NULL, etc.) */
function skipOnAction(cur: Cursor): void {
  while (!cur.done) {
    const t = cur.peek();
    if (t.kind !== 'IDENT') break;
    const kw = t.value.toUpperCase();
    if (!['ON', 'DELETE', 'UPDATE', 'CASCADE', 'SET', 'NULL', 'RESTRICT', 'NO', 'ACTION', 'DEFAULT'].includes(kw)) break;
    cur.consume();
  }
}

/** Lee una lista de columnas entre paréntesis: (col1, col2, ...) */
function readColumnList(cur: Cursor): string[] {
  const cols: string[] = [];
  if (cur.peek().kind !== 'LPAREN') return cols;
  cur.consume(); // LPAREN
  while (!cur.done && cur.peek().kind !== 'RPAREN') {
    const name = readIdent(cur);
    if (name) cols.push(name);
    cur.consumeIf('COMMA');
  }
  cur.consumeIf('RPAREN');
  return cols;
}

// ─── Parser principal ────────────────────────────────────────────────────────

function parseCreateTable(cur: Cursor, tableDescription: string): Table {
  // CREATE [OR REPLACE] TABLE [IF NOT EXISTS] nombre (...)
  cur.consume(); // ya validamos que es CREATE fuera
  // OR REPLACE (PostgreSQL)
  if (cur.peek().kind === 'IDENT' && cur.peek().value.toUpperCase() === 'OR') {
    cur.consume(); cur.consume(); // OR REPLACE
  }
  // TABLE
  if (cur.peek().kind !== 'IDENT' || cur.peek().value.toUpperCase() !== 'TABLE') {
    throw new Error('Se esperaba TABLE');
  }
  cur.consume();

  // IF NOT EXISTS
  if (cur.peek().kind === 'IDENT' && cur.peek().value.toUpperCase() === 'IF') {
    cur.consume(); cur.consume(); cur.consume(); // IF NOT EXISTS
  }

  const tableName = readQualifiedName(cur);
  if (!tableName) throw new Error('Nombre de tabla no encontrado');

  if (cur.peek().kind !== 'LPAREN') throw new Error(`Se esperaba '(' después de ${tableName}`);
  cur.consume(); // LPAREN

  const columns: Column[] = [];
  const tablePrimaryKey: string[] = [];
  const tableForeignKeys: ForeignKey[] = [];

  // Parsear definiciones de columnas y constraints de tabla
  while (!cur.done && cur.peek().kind !== 'RPAREN') {
    const kw = cur.peek().kind === 'IDENT' ? cur.peek().value.toUpperCase() : '';

    // PRIMARY KEY (cols) — constraint a nivel de tabla
    if (kw === 'PRIMARY') {
      cur.consume(); // PRIMARY
      cur.consumeIf('IDENT', 'KEY');
      const pkCols = readColumnList(cur);
      tablePrimaryKey.push(...pkCols);
      // Marcar esas columnas como PK
      for (const col of columns) {
        if (pkCols.includes(col.name)) col.isPrimaryKey = true;
      }
      cur.consumeIf('COMMA');
      continue;
    }

    // FOREIGN KEY (cols) REFERENCES tbl(cols) — constraint a nivel de tabla
    if (kw === 'FOREIGN') {
      cur.consume(); // FOREIGN
      cur.consumeIf('IDENT', 'KEY');
      const fkCols = readColumnList(cur);
      // REFERENCES
      cur.consumeIf('IDENT', 'REFERENCES');
      const refTable = readQualifiedName(cur) ?? '';
      const refCols = readColumnList(cur);
      tableForeignKeys.push({ columns: fkCols, refTable, refColumns: refCols });
      // Marcar las columnas FK
      for (const col of columns) {
        if (fkCols.includes(col.name)) {
          col.isForeignKey = true;
          if (!col.references && refTable) {
            col.references = { table: refTable, column: refCols[0] ?? '' };
          }
        }
      }
      skipOnAction(cur);
      cur.consumeIf('COMMA');
      continue;
    }

    // CONSTRAINT nombre ... (puede preceder a PRIMARY KEY o FOREIGN KEY)
    if (kw === 'CONSTRAINT') {
      cur.consume(); // CONSTRAINT
      readIdent(cur); // nombre del constraint, lo ignoramos
      // Ahora puede venir PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK
      const next = cur.peek().kind === 'IDENT' ? cur.peek().value.toUpperCase() : '';
      if (next === 'PRIMARY' || next === 'FOREIGN') {
        // Volver al inicio del loop con el keyword en peek
        continue;
      }
      // Otras constraints (UNIQUE, CHECK) las saltamos
      if (next === 'UNIQUE' || next === 'CHECK') {
        cur.consume(); // consume UNIQUE/CHECK
        if (cur.peek().kind === 'LPAREN') {
          let d = 0;
          while (!cur.done) {
            const t = cur.consume();
            if (t.kind === 'LPAREN') d++;
            else if (t.kind === 'RPAREN') { d--; if (d <= 0) break; }
          }
        }
        cur.consumeIf('COMMA');
        continue;
      }
      cur.consumeIf('COMMA');
      continue;
    }

    // UNIQUE/CHECK a nivel de tabla (sin CONSTRAINT previo)
    if (kw === 'UNIQUE' || kw === 'CHECK' || kw === 'INDEX' || kw === 'KEY') {
      cur.consume();
      // Puede tener nombre
      if (cur.peek().kind === 'IDENT') readIdent(cur);
      if (cur.peek().kind === 'LPAREN') {
        let d = 0;
        while (!cur.done) {
          const t = cur.consume();
          if (t.kind === 'LPAREN') d++;
          else if (t.kind === 'RPAREN') { d--; if (d <= 0) break; }
        }
      }
      cur.consumeIf('COMMA');
      continue;
    }

    // Definición de columna: nombre tipo [modificadores...]
    const colName = readIdent(cur);
    if (!colName) { cur.consume(); continue; } // token inesperado, skip

    const colType = readType(cur);

    const col: Column = {
      name: colName,
      type: colType.toUpperCase(),
      isPrimaryKey: false,
      isForeignKey: false,
      isNotNull: false,
      isUnique: false,
    };

    // Parsear modificadores inline
    let parsingModifiers = true;
    while (parsingModifiers && !cur.done) {
      if (cur.peek().kind === 'COMMA' || cur.peek().kind === 'RPAREN') break;
      const mod = cur.peek().kind === 'IDENT' ? cur.peek().value.toUpperCase() : '';

      if (mod === 'PRIMARY') {
        cur.consume(); cur.consumeIf('IDENT', 'KEY');
        col.isPrimaryKey = true;
        tablePrimaryKey.push(col.name);
        continue;
      }
      if (mod === 'NOT') {
        cur.consume();
        cur.consumeIf('IDENT', 'NULL');
        col.isNotNull = true;
        continue;
      }
      if (mod === 'NULL') { cur.consume(); continue; }
      if (mod === 'UNIQUE') { cur.consume(); col.isUnique = true; continue; }
      if (mod === 'DEFAULT') {
        cur.consume(); // consume DEFAULT
        skipDefaultValue(cur);
        continue;
      }
      if (mod === 'AUTO_INCREMENT' || mod === 'AUTOINCREMENT') { cur.consume(); continue; }
      if (mod === 'IDENTITY') {
        cur.consume();
        if (cur.peek().kind === 'LPAREN') {
          let d = 0;
          while (!cur.done) { const t = cur.consume(); if (t.kind === 'LPAREN') d++; else if (t.kind === 'RPAREN') { d--; if (d <= 0) break; } }
        }
        continue;
      }
      if (mod === 'GENERATED') {
        // GENERATED ALWAYS AS IDENTITY / GENERATED ALWAYS AS (expr) STORED
        cur.consume();
        while (!cur.done && cur.peek().kind === 'IDENT') {
          const v = cur.peek().value.toUpperCase();
          if (v === 'ALWAYS' || v === 'AS' || v === 'STORED' || v === 'VIRTUAL') { cur.consume(); continue; }
          break;
        }
        if (cur.peek().kind === 'LPAREN') {
          let d = 0;
          while (!cur.done) { const t = cur.consume(); if (t.kind === 'LPAREN') d++; else if (t.kind === 'RPAREN') { d--; if (d <= 0) break; } }
        }
        continue;
      }
      if (mod === 'REFERENCES') {
        cur.consume();
        const refTable = readQualifiedName(cur) ?? '';
        const refCols = readColumnList(cur);
        col.isForeignKey = true;
        col.references = { table: refTable, column: refCols[0] ?? '' };
        tableForeignKeys.push({ columns: [col.name], refTable, refColumns: refCols.length ? refCols : [col.name] });
        skipOnAction(cur);
        continue;
      }
      if (mod === 'CONSTRAINT') {
        cur.consume(); readIdent(cur); // nombre del constraint inline
        continue;
      }
      if (mod === 'CHECK') {
        cur.consume();
        if (cur.peek().kind === 'LPAREN') {
          let d = 0;
          while (!cur.done) { const t = cur.consume(); if (t.kind === 'LPAREN') d++; else if (t.kind === 'RPAREN') { d--; if (d <= 0) break; } }
        }
        continue;
      }
      if (mod === 'ON') {
        // ON DELETE/UPDATE en FK inline
        skipOnAction(cur); continue;
      }
      if (mod === 'COLLATE' || mod === 'CHARACTER' || mod === 'CHARSET') {
        cur.consume(); readIdent(cur); continue;
      }
      // Cualquier otra cosa la saltamos para no bloquear
      parsingModifiers = false;
    }

    // Comentario inline antes de la coma: `col TYPE, -- descripción`  o  `col TYPE -- descripción,`
    if (cur.peek().kind === 'COMMENT') col.description = cur.consume().value;
    columns.push(col);
    cur.consumeIf('COMMA');
    // Comentario inline después de la coma: `col TYPE, -- descripción`
    if (!col.description && cur.peek().kind === 'COMMENT') col.description = cur.consume().value;
  }

  // Cerrar el paréntesis
  cur.consumeIf('RPAREN');

  // Propiedades de tabla: ENGINE=InnoDB, etc. — las saltamos hasta ; o siguiente CREATE
  while (!cur.done && cur.peek().kind !== 'SEMICOLON' &&
         !(cur.peek().kind === 'IDENT' && cur.peek().value.toUpperCase() === 'CREATE')) {
    cur.consume();
  }
  cur.consumeIf('SEMICOLON');

  return {
    name: tableName,
    columns,
    primaryKey: [...new Set(tablePrimaryKey)],
    foreignKeys: tableForeignKeys,
    ...(tableDescription ? { description: tableDescription } : {}),
  };
}

// ─── Punto de entrada ────────────────────────────────────────────────────────

export function parseSql(sql: string): ParseResult {
  const tokens = tokenize(sql);
  const cur = new Cursor(tokens);
  const tables: Table[] = [];
  const errors: string[] = [];
  const pendingComments: string[] = [];

  while (!cur.done) {
    const t = cur.peek();
    if (t.kind === 'COMMENT') {
      // Acumular comentarios consecutivos como posible descripción de la siguiente tabla
      pendingComments.push(cur.consume().value);
    } else if (t.kind === 'SEMICOLON') {
      cur.consume(); // los puntos y coma no cortan el bloque de comentarios previos
    } else if (t.kind === 'IDENT' && t.value.toUpperCase() === 'CREATE') {
      try {
        const table = parseCreateTable(cur, pendingComments.join('\n'));
        tables.push(table);
      } catch (e) {
        errors.push(String(e));
        cur.skipToNextCreate();
      }
      pendingComments.length = 0;
    } else {
      cur.consume();
      pendingComments.length = 0; // cualquier otro token rompe el bloque de comentarios
    }
  }

  return { tables, errors };
}
