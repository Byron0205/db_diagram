/**
 * Exportación del esquema a formatos de texto: Mermaid (erDiagram) y
 * documentación Markdown. La exportación a PNG/SVG del canvas vive en
 * DiagramCanvas.tsx (usa html-to-image sobre el DOM, no el modelo Table[]).
 */

import type { Table } from '../parser/types';

export function downloadTextFile(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function mermaidSafeType(type: string): string {
  return (type.replace(/\s+/g, '_').replace(/[()'"]/g, '') || 'unknown').toLowerCase();
}

export function tablesToMermaid(tables: Table[]): string {
  const tableSet = new Set(tables.map((t) => t.name));
  const lines: string[] = ['erDiagram'];

  for (const t of tables) {
    lines.push(`  ${t.name} {`);
    for (const c of t.columns) {
      const flags = [c.isPrimaryKey ? 'PK' : null, c.isForeignKey ? 'FK' : null].filter(Boolean).join(',');
      lines.push(`    ${mermaidSafeType(c.type)} ${c.name}${flags ? ` ${flags}` : ''}`);
    }
    lines.push('  }');
  }

  for (const t of tables) {
    for (const fk of t.foreignKeys) {
      if (!tableSet.has(fk.refTable)) continue;
      lines.push(`  ${fk.refTable} ||--o{ ${t.name} : "${fk.columns.join('+')}"`);
    }
  }

  return lines.join('\n');
}

function mdCell(value: string | undefined): string {
  if (!value) return '';
  return value.trim().replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

export function tablesToMarkdown(tables: Table[]): string {
  const parts: string[] = ['# Documentación del esquema', ''];

  for (const t of tables) {
    parts.push(`## ${t.name}`);
    if (t.description) parts.push('', mdCell(t.description));

    parts.push(
      '',
      '| Columna | Tipo | PK | FK | NOT NULL | Descripción |',
      '|---|---|---|---|---|---|',
    );
    for (const c of t.columns) {
      parts.push(
        `| ${c.name} | ${c.type} | ${c.isPrimaryKey ? '✓' : ''} | ${c.isForeignKey ? '✓' : ''} | ${c.isNotNull ? '✓' : ''} | ${mdCell(c.description)} |`,
      );
    }

    if (t.foreignKeys.length > 0) {
      parts.push('', '**Llaves foráneas:**');
      for (const fk of t.foreignKeys) {
        parts.push(`- \`${fk.columns.join(', ')}\` → \`${fk.refTable}(${fk.refColumns.join(', ')})\``);
      }
    }

    parts.push('');
  }

  return parts.join('\n');
}
