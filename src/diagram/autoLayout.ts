/**
 * Calcula posiciones iniciales para los nodos usando dagre.
 * El resultado se usa solo para tablas sin posición manual previa.
 */

import dagre from '@dagrejs/dagre';
import type { Edge } from '@xyflow/react';
import type { TableNodeType } from './buildGraph';

// Dimensiones estimadas de un nodo de tabla
const NODE_WIDTH = 240;
const NODE_HEIGHT_BASE = 52;      // cabecera
const NODE_HEIGHT_PER_ROW = 28;   // por cada columna

function estimateHeight(node: TableNodeType): number {
  return NODE_HEIGHT_BASE + node.data.table.columns.length * NODE_HEIGHT_PER_ROW;
}

export function applyAutoLayout(
  nodes: TableNodeType[],
  edges: Edge[]
): TableNodeType[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 40, marginx: 40, marginy: 40 });

  for (const node of nodes) {
    g.setNode(node.id, {
      width: NODE_WIDTH,
      height: estimateHeight(node),
    });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const n = g.node(node.id);
    if (!n) return node;
    return {
      ...node,
      position: {
        x: n.x - NODE_WIDTH / 2,
        y: n.y - estimateHeight(node) / 2,
      },
    };
  });
}
