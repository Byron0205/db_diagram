/**
 * Lienzo principal del diagrama de base de datos.
 * Usa React Flow con nodos tipo TableNode, controles, minimapa y fondo de rejilla.
 * Mantiene las posiciones manuales del usuario entre regeneraciones del diagrama.
 */

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Edge,
  type Node as RFNode,
  BackgroundVariant,
  SelectionMode,
  ReactFlowProvider,
  Panel,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toPng, toSvg } from 'html-to-image';

import { TableNode } from './TableNode';
import { ExportMenu } from './ExportMenu';
import type { TableNodeType, TableGroup } from '../diagram/buildGraph';
import { buildGraph } from '../diagram/buildGraph';
import { applyAutoLayout } from '../diagram/autoLayout';
import { downloadTextFile, tablesToMarkdown, tablesToMermaid } from '../lib/exportDiagram';
import type { Table } from '../parser/types';

const nodeTypes: NodeTypes = { tableNode: TableNode };

// Paleta de colores para etiquetas de grupo — se asignan por hash del nombre
// para que el mismo nombre de grupo siempre produzca el mismo color.
const GROUP_PALETTE = [
  '#f97316', '#22c55e', '#3b82f6', '#ec4899',
  '#eab308', '#14b8a6', '#a855f7', '#ef4444',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function groupColor(name: string): string {
  return GROUP_PALETTE[hashString(name) % GROUP_PALETTE.length];
}

interface DiagramCanvasInnerProps {
  tables: Table[];
  errors: string[];
}

function DiagramCanvasInner({ tables, errors }: DiagramCanvasInnerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<TableNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView, getNodes } = useReactFlow();

  // Referencia al elemento DOM del wrapper para exportar PNG
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Mantiene las posiciones manuales del usuario entre regeneraciones
  const manualPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Solo hacer fitView en el primer render
  const isFirstRender = useRef(true);

  // Resaltado de relaciones al seleccionar un nodo
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Colapso de columnas por tabla
  const [collapsedTables, setCollapsedTables] = useState<Set<string>>(new Set());

  // Agrupación visual por color (nombre de grupo asignado por tabla)
  const [groups, setGroups] = useState<Map<string, string>>(new Map());

  // Popover de asignación de grupo: solo puede haber uno abierto a la vez.
  // Se cierra a través de los mismos handlers de clic (onNodeClick/onPaneClick)
  // que ya limpian el resaltado, para que "clic fuera" funcione de forma
  // consistente sin depender de listeners manuales sobre el DOM.
  const [groupPickerFor, setGroupPickerFor] = useState<string | null>(null);

  const relayoutAll = useCallback(
    (tablesToLayout: Table[]) => {
      manualPositions.current.clear();
      const { nodes: newNodes, edges: newEdges } = buildGraph(tablesToLayout, new Map());
      const layouted = applyAutoLayout(newNodes, newEdges);
      setNodes(layouted);
      setEdges(newEdges);
      setTimeout(() => fitView({ padding: 0.1, duration: 400 }), 50);
    },
    [fitView, setNodes, setEdges],
  );

  // Solo se auto-posicionan las tablas nuevas (sin posición manual conocida)
  // — las existentes conservan su posición tal cual, sin reacomodar todo el
  // diagrama ni resetear el zoom/vista del usuario.
  useEffect(() => {
    // Guardar posiciones actuales antes de regenerar
    for (const node of getNodes()) {
      manualPositions.current.set(node.id, node.position);
    }

    // Construir el grafo pasando las posiciones conocidas
    const { nodes: newNodes, edges: newEdges } = buildGraph(tables, manualPositions.current);

    // Aplicar auto-layout solo a nodos sin posición conocida
    const unknownNodes = newNodes.filter((n) => !manualPositions.current.has(n.id));
    const knownNodes = newNodes.filter((n) => manualPositions.current.has(n.id));

    let layoutedNew: TableNodeType[] = [];
    if (unknownNodes.length > 0) {
      layoutedNew = applyAutoLayout(unknownNodes, newEdges);
    }

    const finalNodes = [...knownNodes, ...layoutedNew];
    setNodes(finalNodes);
    setEdges(newEdges);

    if (isFirstRender.current) {
      isFirstRender.current = false;
      setTimeout(() => fitView({ padding: 0.1, duration: 300 }), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables]);

  const handleRelayout = useCallback(() => {
    relayoutAll(tables);
  }, [tables, relayoutAll]);

  const handleExportPng = useCallback(async () => {
    const el = reactFlowWrapper.current?.querySelector<HTMLElement>('.react-flow__viewport');
    if (!el) return;
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: '#0f172a',
        pixelRatio: 2,
      });
      const a = document.createElement('a');
      a.download = 'schema-diagram.png';
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error('Error al exportar PNG:', err);
    }
  }, []);

  const handleExportSvg = useCallback(async () => {
    const el = reactFlowWrapper.current?.querySelector<HTMLElement>('.react-flow__viewport');
    if (!el) return;
    try {
      const dataUrl = await toSvg(el, { backgroundColor: '#0f172a' });
      const a = document.createElement('a');
      a.download = 'schema-diagram.svg';
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error('Error al exportar SVG:', err);
    }
  }, []);

  const handleExportMermaid = useCallback(() => {
    downloadTextFile('schema-diagram.mmd', tablesToMermaid(tables), 'text/plain');
  }, [tables]);

  const handleExportMarkdown = useCallback(() => {
    downloadTextFile('schema-diagram.md', tablesToMarkdown(tables), 'text/markdown');
  }, [tables]);

  const toggleCollapse = useCallback((tableName: string) => {
    setCollapsedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) next.delete(tableName);
      else next.add(tableName);
      return next;
    });
  }, []);

  const setTableGroup = useCallback((tableName: string, group: string | null) => {
    setGroups((prev) => {
      const next = new Map(prev);
      if (group) next.set(tableName, group);
      else next.delete(tableName);
      return next;
    });
  }, []);

  const toggleGroupPicker = useCallback((tableName: string) => {
    setGroupPickerFor((prev) => (prev === tableName ? null : tableName));
  }, []);

  const onNodeClick = useCallback((event: React.MouseEvent, node: RFNode) => {
    // Ctrl/Cmd(+Shift)+clic alimenta la multi-selección nativa de React Flow
    // (grupo de arrastre) — es ortogonal al resaltado de relaciones de una
    // sola tabla, así que no debe tocar selectedTable en ese caso.
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    setSelectedTable((prev) => (prev === node.id ? null : node.id));
    setGroupPickerFor(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedTable(null);
    setGroupPickerFor(null);
  }, []);

  // Tablas conectadas a la seleccionada (incluyéndola), para resaltar
  const connectedSet = useMemo(() => {
    if (!selectedTable) return null;
    const set = new Set<string>([selectedTable]);
    for (const edge of edges) {
      if (edge.source === selectedTable) set.add(edge.target);
      if (edge.target === selectedTable) set.add(edge.source);
    }
    return set;
  }, [selectedTable, edges]);

  const existingGroupNames = useMemo(() => Array.from(new Set(groups.values())).sort(), [groups]);

  const displayNodes = useMemo<TableNodeType[]>(
    () =>
      nodes.map((n) => {
        const groupName = groups.get(n.id);
        const group: TableGroup | null = groupName ? { name: groupName, color: groupColor(groupName) } : null;
        return {
          ...n,
          data: {
            ...n.data,
            collapsed: collapsedTables.has(n.id),
            dimmed: connectedSet !== null && !connectedSet.has(n.id),
            selected: n.id === selectedTable,
            group,
            existingGroups: existingGroupNames,
            groupPickerOpen: n.id === groupPickerFor,
            onToggleCollapse: toggleCollapse,
            onSetGroup: setTableGroup,
            onToggleGroupPicker: toggleGroupPicker,
          },
        };
      }),
    [
      nodes,
      collapsedTables,
      connectedSet,
      selectedTable,
      groups,
      existingGroupNames,
      groupPickerFor,
      toggleCollapse,
      setTableGroup,
      toggleGroupPicker,
    ],
  );

  const displayEdges = useMemo<Edge[]>(
    () =>
      edges.map((e) => {
        const isHighlighted = selectedTable !== null && (e.source === selectedTable || e.target === selectedTable);
        const isDimmed = selectedTable !== null && !isHighlighted;
        return {
          ...e,
          animated: isHighlighted,
          style: {
            ...e.style,
            opacity: isDimmed ? 0.15 : 1,
            strokeWidth: isHighlighted ? 2.5 : 1.5,
          },
        };
      }),
    [edges, selectedTable],
  );

  return (
    <div ref={reactFlowWrapper} className="w-full h-full bg-slate-950">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.1}
        maxZoom={2.5}
        deleteKeyCode={null} // sin feature de borrar nodos aún — Backspace no debe eliminar
        selectionMode={SelectionMode.Partial}
        // selectionKeyCode se deja en su default ('Shift'): Shift+arrastre dibuja
        // el recuadro de selección; el clic-y-arrastre simple sigue siendo pan.
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#1e293b"
        />
        <Controls
          className="bg-slate-800 border border-slate-600 rounded"
          showInteractive={false}
        />
        <MiniMap
          nodeColor="#334155"
          maskColor="rgba(15,23,42,0.7)"
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 6,
          }}
        />

        {/* Panel de acciones */}
        <Panel position="top-right" className="flex gap-2">
          <button
            onClick={handleRelayout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded border border-slate-500 transition-colors cursor-pointer"
            title="Re-acomodar tablas automáticamente"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
            Re-acomodar
          </button>
          <ExportMenu
            items={[
              { label: 'Imagen PNG', onClick: () => void handleExportPng() },
              { label: 'Imagen SVG', onClick: () => void handleExportSvg() },
              { label: 'Mermaid (.mmd)', onClick: handleExportMermaid },
              { label: 'Documentación (.md)', onClick: handleExportMarkdown },
            ]}
          />
        </Panel>

        {/* Leyenda de grupos */}
        {existingGroupNames.length > 0 && (
          <Panel position="bottom-left">
            <div className="bg-slate-800/90 border border-slate-600 rounded p-2 text-xs text-slate-300 space-y-1">
              {existingGroupNames.map((name) => (
                <div key={name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: groupColor(name) }} />
                  <span className="truncate max-w-[140px]">{name}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Indicador de errores de parseo */}
        {errors.length > 0 && (
          <Panel position="bottom-right">
            <div className="max-w-xs bg-amber-900/80 border border-amber-700 rounded p-2 text-xs text-amber-200">
              <p className="font-semibold mb-1">
                ⚠ {errors.length} advertencia{errors.length > 1 ? 's' : ''} al parsear
              </p>
              <ul className="space-y-0.5 max-h-24 overflow-y-auto">
                {errors.map((e, i) => (
                  <li key={i} className="truncate text-amber-300/70">
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        )}

        {/* Estado vacío */}
        {tables.length === 0 && errors.length === 0 && (
          <Panel position="top-center">
            <div className="mt-20 text-center text-slate-500 pointer-events-none">
              <p className="text-lg">
                Escribe un{' '}
                <code className="text-slate-400 bg-slate-800 px-1 rounded">CREATE TABLE</code>{' '}
                en el panel izquierdo
              </p>
              <p className="text-sm mt-1">El diagrama se actualizará automáticamente</p>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

export function DiagramCanvas(props: DiagramCanvasInnerProps) {
  return (
    <ReactFlowProvider>
      <DiagramCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
