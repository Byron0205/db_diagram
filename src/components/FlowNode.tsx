/**
 * Nodo custom de React Flow que representa un nodo de flowchart (Mermaid).
 * Renderiza 4 familias de forma: stadium (óvalo, inicio/fin), rectángulo
 * (proceso), diamante (decisión) y parallelogramo (entrada/salida).
 * Colores por defecto según la forma; si el nodo tiene un `classDef`
 * asignado (fill/stroke/stroke-width), ese estilo inline lo reemplaza.
 */

import { memo } from 'react';
import type { CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeType } from '../flowchart/buildFlowGraph';
import type { FlowNodeShape } from '../flowchart/types';

const SHAPE_DEFAULTS: Record<FlowNodeShape, { border: string; bg: string; text: string }> = {
  stadium: { border: 'border-emerald-500', bg: 'bg-emerald-950/40', text: 'text-emerald-100' },
  parallelogram: { border: 'border-amber-500', bg: 'bg-amber-950/30', text: 'text-amber-100' },
  diamond: { border: 'border-indigo-400', bg: 'bg-indigo-950/40', text: 'text-indigo-100' },
  rectangle: { border: 'border-slate-500', bg: 'bg-slate-800', text: 'text-slate-100' },
};

const HANDLE_STYLE = { background: '#6366f1', width: 8, height: 8 };

export const FlowNode = memo(function FlowNode({ data, selected }: NodeProps<FlowNodeType>) {
  const { node, classDef } = data;
  const defaults = SHAPE_DEFAULTS[node.shape];

  const hasCustomStyle = Boolean(classDef && (classDef.fill || classDef.stroke));
  const customStyle: CSSProperties | undefined = hasCustomStyle
    ? {
        background: classDef?.fill,
        borderColor: classDef?.stroke,
        borderWidth: classDef?.strokeWidth,
        color: classDef?.color,
      }
    : undefined;
  // Los fills de classDef en Mermaid suelen ser pasteles claros; sin un color
  // de texto explícito, se asume fondo claro y se usa texto oscuro.
  const textClass = hasCustomStyle && !classDef?.color ? 'text-slate-900' : defaults.text;

  const label = (
    <span className={`whitespace-pre-line text-center text-xs font-medium leading-snug ${textClass}`}>
      {node.label}
    </span>
  );

  if (node.shape === 'stadium' || node.shape === 'rectangle') {
    const shapeClass = node.shape === 'stadium' ? 'rounded-full px-5 py-2' : 'rounded px-4 py-2.5';
    return (
      <div
        className={`min-w-[110px] ${shapeClass} border-2 shadow-lg flex items-center justify-center select-none ${
          !hasCustomStyle ? `${defaults.border} ${defaults.bg}` : ''
        } ${selected ? 'outline-dashed outline-2 outline-offset-2 outline-sky-400' : ''}`}
        style={customStyle}
      >
        <Handle type="target" position={Position.Top} style={HANDLE_STYLE} />
        {label}
        <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />
      </div>
    );
  }

  // Diamante y parallelogramo: técnica de dos capas — el div externo (con el
  // texto, en flujo normal) determina el tamaño real según el contenido; el
  // fondo con clip-path es `absolute inset-0` y se estira para calzar con
  // ese tamaño. El texto NO puede ir en la capa absoluta: un elemento
  // absoluto no aporta tamaño a su contenedor, así que si el label fuera
  // absoluto la forma quedaría fija en el mínimo y el texto largo se
  // desbordaría por encima (bug reportado).
  const clipPath =
    node.shape === 'diamond'
      ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
      : 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)';
  const minSize = node.shape === 'diamond' ? 'min-w-[150px] min-h-[90px]' : 'min-w-[140px] min-h-[56px]';
  // Padding generoso (incluye vertical) para que el texto no toque las
  // puntas/bordes inclinados del clip-path aunque la forma crezca con el label.
  const innerPadding = node.shape === 'diamond' ? 'px-10 py-7' : 'px-8 py-4';

  return (
    <div
      className={`relative ${minSize} flex items-center justify-center select-none ${
        selected ? 'outline-dashed outline-2 outline-offset-2 outline-sky-400' : ''
      }`}
    >
      <div
        className={`absolute inset-0 border-2 shadow-lg ${!hasCustomStyle ? `${defaults.border} ${defaults.bg}` : ''}`}
        style={{ clipPath, ...customStyle }}
      />
      <Handle type="target" position={Position.Top} style={{ ...HANDLE_STYLE, zIndex: 1 }} />
      <div className={`relative flex items-center justify-center text-center max-w-[240px] ${innerPadding}`}>
        {label}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ ...HANDLE_STYLE, zIndex: 1 }} />
    </div>
  );
});
