/**
 * Calcula posiciones iniciales para los nodos de un flowchart usando dagre.
 * Duplica deliberadamente la plomería de src/diagram/autoLayout.ts (en vez de
 * generalizarla) para no arriesgar el layout de tablas ya funcional — acá el
 * tamaño de nodo se estima por forma + longitud de label en vez de por
 * cantidad de columnas, y la dirección viene del propio diagrama parseado.
 */

import dagre from '@dagrejs/dagre';
import type { Edge } from '@xyflow/react';
import type { FlowDirection, FlowNodeShape } from './types';
import type { FlowNodeType } from './buildFlowGraph';

const CHAR_WIDTH = 7;
const LINE_HEIGHT = 18;

const MIN_WIDTH: Record<FlowNodeShape, number> = {
  rectangle: 110,
  stadium: 110,
  diamond: 150,
  parallelogram: 140,
};

const WIDTH_PADDING: Record<FlowNodeShape, number> = {
  rectangle: 32,
  stadium: 44,
  diamond: 90,
  parallelogram: 80,
};

const BASE_HEIGHT: Record<FlowNodeShape, number> = {
  rectangle: 44,
  stadium: 44,
  diamond: 90,
  parallelogram: 56,
};

// Mermaid usa TD/TB indistintamente para "arriba hacia abajo", pero dagre
// solo entiende 'TB'|'BT'|'LR'|'RL' — TD no es un valor válido para rankdir.
function toDagreRankDir(direction: FlowDirection): 'TB' | 'BT' | 'LR' | 'RL' {
  if (direction === 'TD') return 'TB';
  return direction;
}

function estimateSize(node: FlowNodeType): { width: number; height: number } {
  const shape = node.data.node.shape;
  const lines = node.data.node.label.split('\n');
  const longestLine = Math.max(...lines.map((l) => l.length), 1);

  const width = Math.max(MIN_WIDTH[shape], longestLine * CHAR_WIDTH + WIDTH_PADDING[shape]);
  const height = Math.max(BASE_HEIGHT[shape], lines.length * LINE_HEIGHT + (shape === 'diamond' ? 50 : 22));

  return { width, height };
}

export function applyFlowAutoLayout(
  nodes: FlowNodeType[],
  edges: Edge[],
  direction: FlowDirection,
): FlowNodeType[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: toDagreRankDir(direction), ranksep: 70, nodesep: 40, marginx: 40, marginy: 40 });

  const sizes = new Map<string, { width: number; height: number }>();
  for (const node of nodes) {
    const size = estimateSize(node);
    sizes.set(node.id, size);
    g.setNode(node.id, size);
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const n = g.node(node.id);
    if (!n) return node;
    const size = sizes.get(node.id)!;
    return {
      ...node,
      position: {
        x: n.x - size.width / 2,
        y: n.y - size.height / 2,
      },
    };
  });
}
