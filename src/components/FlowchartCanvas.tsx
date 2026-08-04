/**
 * Lienzo de diagrama de flujo (Mermaid flowchart). Hermano de DiagramCanvas
 * — duplica deliberadamente su plomería (posición manual, relayout
 * debounced en cambio estructural, export PNG/SVG) en vez de generalizarla,
 * para no arriesgar el pipeline SQL ya estable. Sin resaltado on-click,
 * colapso ni agrupación (fuera de alcance del MVP de flowchart).
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
  SelectionMode,
  ReactFlowProvider,
  Panel,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCallback, useEffect, useRef } from 'react';
import { toPng, toSvg } from 'html-to-image';

import { FlowNode } from './FlowNode';
import { ExportMenu } from './ExportMenu';
import type { FlowNodeType } from '../flowchart/buildFlowGraph';
import { buildFlowGraph } from '../flowchart/buildFlowGraph';
import { applyFlowAutoLayout } from '../flowchart/flowAutoLayout';
import type { FlowchartDiagram } from '../flowchart/types';

const nodeTypes: NodeTypes = { flowNode: FlowNode };

interface FlowchartCanvasInnerProps {
  diagram: FlowchartDiagram;
  errors: string[];
}

function FlowchartCanvasInner({ diagram, errors }: FlowchartCanvasInnerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView, getNodes } = useReactFlow();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const manualPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const isFirstRender = useRef(true);

  const relayoutAll = useCallback(
    (diagramToLayout: FlowchartDiagram) => {
      manualPositions.current.clear();
      const { nodes: newNodes, edges: newEdges } = buildFlowGraph(diagramToLayout, new Map());
      const layouted = applyFlowAutoLayout(newNodes, newEdges, diagramToLayout.direction);
      setNodes(layouted);
      setEdges(newEdges);
      setTimeout(() => fitView({ padding: 0.1, duration: 400 }), 50);
    },
    [fitView, setNodes, setEdges],
  );

  // Solo se auto-posicionan los nodos nuevos (sin posición manual conocida)
  // — los existentes conservan su posición tal cual, sin reacomodar todo el
  // diagrama ni resetear el zoom/vista del usuario.
  useEffect(() => {
    for (const node of getNodes()) {
      manualPositions.current.set(node.id, node.position);
    }

    const { nodes: newNodes, edges: newEdges } = buildFlowGraph(diagram, manualPositions.current);

    const unknownNodes = newNodes.filter((n) => !manualPositions.current.has(n.id));
    const knownNodes = newNodes.filter((n) => manualPositions.current.has(n.id));

    let layoutedNew: FlowNodeType[] = [];
    if (unknownNodes.length > 0) {
      layoutedNew = applyFlowAutoLayout(unknownNodes, newEdges, diagram.direction);
    }

    setNodes([...knownNodes, ...layoutedNew]);
    setEdges(newEdges);

    if (isFirstRender.current) {
      isFirstRender.current = false;
      setTimeout(() => fitView({ padding: 0.1, duration: 300 }), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram]);

  const handleRelayout = useCallback(() => {
    relayoutAll(diagram);
  }, [diagram, relayoutAll]);

  const handleExportPng = useCallback(async () => {
    const el = reactFlowWrapper.current?.querySelector<HTMLElement>('.react-flow__viewport');
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { backgroundColor: '#0f172a', pixelRatio: 2 });
      const a = document.createElement('a');
      a.download = 'flowchart-diagram.png';
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
      a.download = 'flowchart-diagram.svg';
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error('Error al exportar SVG:', err);
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
        deleteKeyCode={null} // sin feature de borrar nodos aún — Backspace no debe eliminar
        selectionMode={SelectionMode.Partial}
        // selectionKeyCode se deja en su default ('Shift'): Shift+arrastre dibuja
        // el recuadro de selección; el clic-y-arrastre simple sigue siendo pan.
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
        <Controls className="bg-slate-800 border border-slate-600 rounded" showInteractive={false} />
        <MiniMap
          nodeColor="#334155"
          maskColor="rgba(15,23,42,0.7)"
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6 }}
        />

        <Panel position="top-right" className="flex gap-2">
          <button
            onClick={handleRelayout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded border border-slate-500 transition-colors cursor-pointer"
            title="Re-acomodar el diagrama automáticamente"
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
            ]}
          />
        </Panel>

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

        {diagram.nodes.length === 0 && errors.length === 0 && (
          <Panel position="top-center">
            <div className="mt-20 text-center text-slate-500 pointer-events-none">
              <p className="text-lg">
                Escribe un diagrama{' '}
                <code className="text-slate-400 bg-slate-800 px-1 rounded">flowchart TD</code>{' '}
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

export function FlowchartCanvas(props: FlowchartCanvasInnerProps) {
  return (
    <ReactFlowProvider>
      <FlowchartCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
