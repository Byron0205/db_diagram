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
  BackgroundVariant,
  ReactFlowProvider,
  Panel,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCallback, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';

import { TableNode } from './TableNode';
import type { TableNodeType } from '../diagram/buildGraph';
import { buildGraph } from '../diagram/buildGraph';
import { applyAutoLayout } from '../diagram/autoLayout';
import type { Table } from '../parser/types';

const nodeTypes: NodeTypes = { tableNode: TableNode };

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
    manualPositions.current.clear();
    const { nodes: newNodes, edges: newEdges } = buildGraph(tables, new Map());
    const layouted = applyAutoLayout(newNodes, newEdges);
    setNodes(layouted);
    setEdges(newEdges);
    setTimeout(() => fitView({ padding: 0.1, duration: 400 }), 50);
  }, [tables, fitView, setNodes, setEdges]);

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

  return (
    <div ref={reactFlowWrapper} className="w-full h-full bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.1}
        maxZoom={2.5}
        deleteKeyCode={null}
        selectionKeyCode={null}
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
          <button
            onClick={() => void handleExportPng()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded border border-indigo-500 transition-colors cursor-pointer"
            title="Exportar diagrama como PNG"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Exportar PNG
          </button>
        </Panel>

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
