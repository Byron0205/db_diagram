/**
 * Convierte el modelo de tablas parseadas en nodos y aristas de React Flow.
 * Los nodos son de tipo 'tableNode'. Las aristas representan las FK.
 */

import type { Node, Edge } from '@xyflow/react';
import type { Table } from '../parser/types';

export interface TableGroup {
  name: string;
  color: string;
}

// Datos del nodo. Los campos más allá de `table` son estado de UI transitorio
// (resaltado, colapso, agrupación) que DiagramCanvas inyecta en tiempo de
// render — buildGraph() solo produce el campo `table`.
export interface TableNodeData extends Record<string, unknown> {
  table: Table;
  collapsed?: boolean;
  dimmed?: boolean;
  selected?: boolean;
  group?: TableGroup | null;
  existingGroups?: string[];
  groupPickerOpen?: boolean;
  onToggleCollapse?: (tableName: string) => void;
  onSetGroup?: (tableName: string, group: string | null) => void;
  onToggleGroupPicker?: (tableName: string) => void;
}

// Tipo completo del nodo (React Flow v12 requiere Node<Data, NodeType>)
export type TableNodeType = Node<TableNodeData, 'tableNode'>;

/**
 * Handle id por columna:
 *   source (sale de la columna): `col-src-{tableName}-{colName}`
 *   target (llega a la tabla):   `col-tgt-{tableName}`
 */
export function sourceHandleId(tableName: string, colName: string): string {
  return `col-src-${tableName}-${colName}`;
}

export function targetHandleId(tableName: string): string {
  return `col-tgt-${tableName}`;
}

export function buildGraph(
  tables: Table[],
  existingPositions?: Map<string, { x: number; y: number }>
): { nodes: TableNodeType[]; edges: Edge[] } {
  const nodes: TableNodeType[] = tables.map((table) => ({
    id: table.name,
    type: 'tableNode' as const,
    position: existingPositions?.get(table.name) ?? { x: 0, y: 0 },
    data: { table },
  }));

  const edges: Edge[] = [];
  const tableSet = new Set(tables.map((t) => t.name));

  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      // Solo añadir arista si la tabla referenciada está en el esquema
      if (!tableSet.has(fk.refTable)) continue;

      for (let i = 0; i < fk.columns.length; i++) {
        const srcCol = fk.columns[i];
        const edgeId = `fk-${table.name}-${srcCol}->${fk.refTable}`;

        edges.push({
          id: edgeId,
          source: table.name,
          target: fk.refTable,
          sourceHandle: sourceHandleId(table.name, srcCol),
          targetHandle: targetHandleId(fk.refTable),
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#6366f1', strokeWidth: 1.5 },
          markerEnd: {
            type: 'arrowclosed' as const,
            color: '#6366f1',
          },
          label: srcCol,
          labelStyle: { fontSize: 10, fill: '#94a3b8' },
          labelBgStyle: { fill: '#1e293b', fillOpacity: 0.8 },
        });
      }
    }
  }

  return { nodes, edges };
}
