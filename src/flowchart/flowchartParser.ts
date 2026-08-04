/**
 * Parser tolerante de un subconjunto de sintaxis Mermaid `flowchart`.
 *
 * A diferencia de sqlParser.ts (donde una sentencia puede abarcar varias
 * líneas/tokens), la sintaxis de flowchart usada aquí es una sentencia por
 * línea — la unidad de recuperación de errores es la línea: si una línea no
 * matchea ningún patrón conocido, se acumula un mensaje en `errors` y se
 * continúa con la siguiente, sin abortar el parseo completo.
 *
 * Soportado: header `flowchart`/`graph` + dirección, comentarios `%%`,
 * declaración de nodos por forma (stadium/parallelogram/diamond/rectángulo)
 * standalone o inline dentro de una arista, aristas con o sin label,
 * `classDef` y `class`. No soportado (fuera de alcance del MVP): subgrafos,
 * labels de arista sin comillas, valores de classDef con comas internas
 * (ej. `rgba(0,0,0,.5)`).
 */

import type { FlowClassDef, FlowDirection, FlowEdge, FlowNode, FlowNodeShape, FlowParseResult } from './types';

interface NodeRef {
  id: string;
  shape?: FlowNodeShape;
  label?: string;
}

const SHAPE_PATTERNS: { shape: FlowNodeShape; re: RegExp }[] = [
  { shape: 'stadium', re: /^([A-Za-z_]\w*)\(\[(.*)\]\)$/ },
  { shape: 'parallelogram', re: /^([A-Za-z_]\w*)\[\/(.*)\/\]$/ },
  { shape: 'diamond', re: /^([A-Za-z_]\w*)\{(.*)\}$/ },
  { shape: 'rectangle', re: /^([A-Za-z_]\w*)\[(.*)\]$/ },
];

const BARE_ID_RE = /^[A-Za-z_]\w*$/;
const HEADER_RE = /^(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)\b/i;
const CLASSDEF_RE = /^classDef\s+(\w+)\s+(.+?);?$/i;
const CLASS_RE = /^class\s+([\w,\s]+?)\s+(\w+)\s*;?$/i;
const LABELED_EDGE_RE = /^(.+?)\s*--\s*"([^"]*)"\s*-->\s*(.+)$/;
const PLAIN_EDGE_RE = /^(.+?)\s*-->\s*(.+)$/;

function cleanLabel(raw: string): string {
  let s = raw.trim();
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
  return s.replace(/<br\s*\/?>/gi, '\n');
}

function extractNodeRef(rawChunk: string): NodeRef | null {
  const chunk = rawChunk.trim();
  for (const { shape, re } of SHAPE_PATTERNS) {
    const m = re.exec(chunk);
    if (m) return { id: m[1], shape, label: cleanLabel(m[2]) };
  }
  if (BARE_ID_RE.test(chunk)) return { id: chunk };
  return null;
}

function upsertNode(nodesById: Map<string, FlowNode>, ref: NodeRef): void {
  if (!ref.shape) return; // referencia sin forma explícita: se resuelve al final si nunca se declara
  const existing = nodesById.get(ref.id);
  if (existing) {
    existing.shape = ref.shape;
    existing.label = ref.label ?? existing.label;
  } else {
    nodesById.set(ref.id, { id: ref.id, label: ref.label ?? ref.id, shape: ref.shape });
  }
}

function parseClassDefStyle(name: string, body: string): FlowClassDef {
  const def: FlowClassDef = { name };
  for (const pair of body.split(',')) {
    const kv = /^\s*([\w-]+)\s*:\s*(.+?)\s*$/.exec(pair);
    if (!kv) continue;
    const key = kv[1].toLowerCase();
    const value = kv[2].trim();
    if (key === 'fill') def.fill = value;
    else if (key === 'stroke') def.stroke = value;
    else if (key === 'stroke-width') def.strokeWidth = value;
    else if (key === 'color') def.color = value;
  }
  return def;
}

export function parseFlowchart(text: string): FlowParseResult {
  const errors: string[] = [];
  const nodesById = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  const classDefs = new Map<string, FlowClassDef>();
  const classAssignments: { ids: string[]; className: string }[] = [];
  let direction: FlowDirection = 'TD';
  let sawHeader = false;
  let edgeCounter = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('%%')) continue;

    const headerMatch = HEADER_RE.exec(line);
    if (headerMatch) {
      if (!sawHeader) {
        direction = headerMatch[1].toUpperCase() as FlowDirection;
        sawHeader = true;
      }
      continue;
    }

    const classDefMatch = CLASSDEF_RE.exec(line);
    if (classDefMatch) {
      classDefs.set(classDefMatch[1], parseClassDefStyle(classDefMatch[1], classDefMatch[2]));
      continue;
    }

    const classMatch = CLASS_RE.exec(line);
    if (classMatch) {
      const ids = classMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
      classAssignments.push({ ids, className: classMatch[2] });
      continue;
    }

    if (line.includes('-->')) {
      const labeled = LABELED_EDGE_RE.exec(line);
      let leftRaw: string;
      let rightRaw: string;
      let label: string | undefined;

      if (labeled) {
        leftRaw = labeled[1];
        label = labeled[2];
        rightRaw = labeled[3];
      } else {
        const plain = PLAIN_EDGE_RE.exec(line);
        if (!plain) {
          errors.push(`Línea no reconocida: "${line}"`);
          continue;
        }
        leftRaw = plain[1];
        rightRaw = plain[2];
      }

      const left = extractNodeRef(leftRaw);
      const right = extractNodeRef(rightRaw);
      if (!left || !right) {
        errors.push(`No se pudo interpretar la conexión: "${line}"`);
        continue;
      }
      upsertNode(nodesById, left);
      upsertNode(nodesById, right);
      edges.push({
        id: `e-${left.id}-${right.id}-${edgeCounter++}`,
        source: left.id,
        target: right.id,
        label,
      });
      continue;
    }

    const ref = extractNodeRef(line);
    if (ref?.shape) {
      upsertNode(nodesById, ref);
      continue;
    }

    errors.push(`Línea no reconocida: "${line}"`);
  }

  // Nodos referenciados por una arista pero nunca declarados con forma explícita
  for (const edge of edges) {
    if (!nodesById.has(edge.source)) {
      nodesById.set(edge.source, { id: edge.source, label: edge.source, shape: 'rectangle' });
    }
    if (!nodesById.has(edge.target)) {
      nodesById.set(edge.target, { id: edge.target, label: edge.target, shape: 'rectangle' });
    }
  }

  // Asignaciones de clase — silenciosamente se ignoran ids que un `class`
  // menciona pero que no corresponden a ningún nodo declarado (patrón común
  // en plantillas Mermaid reutilizables con más ids de los que se usan).
  for (const { ids, className } of classAssignments) {
    for (const id of ids) {
      const node = nodesById.get(id);
      if (node) node.className = className;
    }
  }

  return {
    diagram: { direction, nodes: Array.from(nodesById.values()), edges, classDefs },
    errors,
  };
}
