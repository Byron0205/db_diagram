/**
 * Extrae bloques SQL de una respuesta en markdown de Claude (u otro LLM).
 *
 * Prioridad:
 *  1. Bloques cercados con etiqueta sql / postgres / mysql / tsql / sqlite
 *  2. Bloques cercados sin etiqueta que contengan CREATE TABLE
 *  3. Texto completo si contiene CREATE TABLE (sin bloques cercados)
 *
 * Devuelve los bloques seleccionados concatenados con '\n\n',
 * o cadena vacía si no se detecta ningún SQL válido.
 */

const SQL_LANG_RE = /^(sql|postgres|postgresql|mysql|tsql|sqlite)$/i;

/** Extrae el contenido de los bloques de código cercados del markdown. */
function extractFencedBlocks(text: string): Array<{ lang: string; content: string }> {
  const blocks: Array<{ lang: string; content: string }> = [];
  // Captura ``` con etiqueta opcional, luego el contenido hasta el ``` de cierre.
  const re = /^```(\w*)[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    blocks.push({ lang: match[1] ?? '', content: match[2] });
  }
  return blocks;
}

/** Detecta si un fragmento de texto contiene al menos una sentencia CREATE TABLE. */
function hasCreateTable(text: string): boolean {
  return /CREATE\s+TABLE/i.test(text);
}

export function extractSql(text: string): string {
  const blocks = extractFencedBlocks(text);

  // 1. Bloques con etiqueta de lenguaje SQL conocido
  const sqlBlocks = blocks
    .filter((b) => SQL_LANG_RE.test(b.lang))
    .map((b) => b.content.trim())
    .filter(Boolean);
  if (sqlBlocks.length > 0) return sqlBlocks.join('\n\n');

  // 2. Bloques sin etiqueta que contienen CREATE TABLE
  const untaggedBlocks = blocks
    .filter((b) => b.lang === '' && hasCreateTable(b.content))
    .map((b) => b.content.trim())
    .filter(Boolean);
  if (untaggedBlocks.length > 0) return untaggedBlocks.join('\n\n');

  // 3. Texto completo (sin bloques cercados) que contiene CREATE TABLE
  if (hasCreateTable(text)) return text.trim();

  return '';
}
