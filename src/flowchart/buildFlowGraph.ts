/**
 * Convierte un FlowchartDiagram parseado en nodos y aristas de React Flow.
 * Análogo a src/diagram/buildGraph.ts pero para el tipo de proyecto "flowchart".
 */

import type { Node, Edge } from '@xyflow/react';
import type { FlowClassDef, FlowNode, FlowchartDiagram } from './types';

export interface FlowNodeData extends Record<string, unknown> {
  node: FlowNode;
  classDef?: FlowClassDef;
}

export type FlowNodeType = Node<FlowNodeData, 'flowNode'>;

export function buildFlowGraph(
  diagram: FlowchartDiagram,
  existingPositions?: Map<string, { x: number; y: number }>,
): { nodes: FlowNodeType[]; edges: Edge[] } {
  const nodes: FlowNodeType[] = diagram.nodes.map((node) => ({
    id: node.id,
    type: 'flowNode' as const,
    position: existingPositions?.get(node.id) ?? { x: 0, y: 0 },
    data: {
      node,
      classDef: node.className ? diagram.classDefs.get(node.className) : undefined,
    },
  }));

  const edges: Edge[] = diagram.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#6366f1', strokeWidth: 1.5 },
    markerEnd: { type: 'arrowclosed' as const, color: '#6366f1' },
    label: edge.label,
    labelStyle: { fontSize: 10, fill: '#94a3b8' },
    labelBgStyle: { fill: '#1e293b', fillOpacity: 0.8 },
  }));

  return { nodes, edges };
}
