/**
 * Nodo custom de React Flow que representa una tabla SQL.
 * Muestra la cabecera con el nombre de la tabla y una fila por columna.
 * Cada columna FK tiene un handle source (para líneas que salen de ella).
 * La cabecera tiene un handle target (para líneas que llegan a la tabla).
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TableNodeType } from '../diagram/buildGraph';
import { sourceHandleId, targetHandleId } from '../diagram/buildGraph';

// Icono de llave para PK
function KeyIcon() {
  return (
    <svg className="w-3 h-3 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Icono de FK (enlace)
function FkIcon() {
  return (
    <svg className="w-3 h-3 text-indigo-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102-1.101" />
    </svg>
  );
}

export const TableNode = memo(function TableNode({ data }: NodeProps<TableNodeType>) {
  const { table } = data;

  return (
    <div className="min-w-[200px] max-w-[300px] bg-slate-800 border border-slate-600 rounded shadow-lg select-none">
      {/* Handle target: las FK llegan a la tabla aquí */}
      <Handle
        type="target"
        position={Position.Left}
        id={targetHandleId(table.name)}
        style={{ background: '#6366f1', width: 8, height: 8, left: -5, top: '50%' }}
      />

      {/* Cabecera de la tabla */}
      <div className="px-3 py-2 bg-indigo-900 border-b border-slate-600 rounded-t">
        <span className="text-sm font-bold text-white tracking-wide">{table.name}</span>
      </div>

      {/* Lista de columnas */}
      <div className="divide-y divide-slate-700">
        {table.columns.map((col) => (
          <div
            key={col.name}
            className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs group hover:bg-slate-700/50"
          >
            {/* Icono de PK o FK */}
            <span className="w-4 flex items-center justify-center shrink-0">
              {col.isPrimaryKey ? (
                <KeyIcon />
              ) : col.isForeignKey ? (
                <FkIcon />
              ) : (
                <span className="w-3" />
              )}
            </span>

            {/* Nombre de la columna */}
            <span
              className={`font-medium truncate ${
                col.isPrimaryKey
                  ? 'text-amber-300'
                  : col.isForeignKey
                  ? 'text-indigo-300'
                  : 'text-slate-200'
              }`}
            >
              {col.name}
            </span>

            {/* Tipo de dato */}
            <span className="ml-auto text-slate-500 shrink-0 pl-2">{col.type}</span>

            {/* NOT NULL indicator */}
            {col.isNotNull && !col.isPrimaryKey && (
              <span className="text-slate-600 text-[9px] shrink-0">NN</span>
            )}

            {/* Handle source: las FK salen de la columna FK */}
            {col.isForeignKey && (
              <Handle
                type="source"
                position={Position.Right}
                id={sourceHandleId(table.name, col.name)}
                style={{
                  background: '#6366f1',
                  width: 8,
                  height: 8,
                  right: -5,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* PK compuesta a nivel de tabla */}
      {table.primaryKey.length > 1 && (
        <div className="px-3 py-1 bg-slate-900/50 border-t border-slate-700 rounded-b">
          <span className="text-[10px] text-amber-500/70">
            PK: {table.primaryKey.join(', ')}
          </span>
        </div>
      )}
    </div>
  );
});
